import { planBreedingForCanine, type BreedingCanineOption, type PlannerCandidate } from "./breedingPlanner.js";
import type { CanineSummary, DataStore } from "./dataStore.js";
import { compareLineage, type LineageProfile } from "../domain/lineage/lineage.js";
import { traitNames, type TraitName } from "../domain/traits/traitNames.js";

export type MatingAlgorithmId = "compensatory" | "assortative" | "ocs";

export type AlgorithmCanineOption = BreedingCanineOption;

export type TraitImprovement = {
  traitName: TraitName;
  selectedValue: number;
  candidateValue: number;
  gain: number;
  weightedGain: number;
  isPriority: boolean;
};

export type CompensatoryCandidate = {
  candidate: PlannerCandidate;
  score: number;
  strongestImprovements: TraitImprovement[];
};

export type CompensatoryAnalysis = {
  selectedLabel: string;
  weaknessTraits: Array<{ traitName: TraitName; value: number }>;
  candidates: CompensatoryCandidate[];
  warnings: string[];
};

export type AssortativeCandidate = {
  candidate: PlannerCandidate;
  score: number;
  strongestSharedTraits: Array<{
    traitName: TraitName;
    selectedValue: number;
    candidateValue: number;
    combined: number;
    weightedCombined: number;
    isPriority: boolean;
  }>;
};

export type AssortativeAnalysis = {
  selectedLabel: string;
  targetStrengthTraits: Array<{ traitName: TraitName; value: number }>;
  candidates: AssortativeCandidate[];
  warnings: string[];
};

export type OcsCandidate = {
  candidate: PlannerCandidate;
  score: number;
  baseQuality: number;
  ancestorReusePenalty: number;
  constrainedLinePenalty: number;
  relatedPeerPenalty: number;
  safeMateCount: number;
  repeatedAncestors: Array<{ label: string; descendantCount: number }>;
};

export type OcsAnalysis = {
  selectedLabel: string;
  candidates: OcsCandidate[];
  warnings: string[];
};

export type AlgorithmPriorityOptions = {
  priorityTrait?: TraitName | null;
  priorityWeight?: number;
};

export function getAlgorithmCanineOptions(store: DataStore): AlgorithmCanineOption[] {
  return store.data.canonical.canines
    .filter((canine) => canine.status === "active")
    .filter((canine) => canine.gender === "M" || canine.gender === "F")
    .filter((canine) => {
      const profile = store.traitProfilesByCanineId.get(canine.id);
      return Boolean(profile?.traits && typeof profile.total === "number");
    })
    .map((canine) => {
      const summary = store.getCanineSummary(canine.id);
      return {
        canineId: canine.id,
        label: `${canine.displayName} | ${summary?.character?.name ?? "unknown"} | ${summary?.totalLabel ?? "unknown"}/${summary?.procreationLabel ?? "unknown"}`,
        aliases: [canine.callName, canine.displayName, summary?.character?.name, summary?.human?.displayName].filter(
          (alias): alias is string => Boolean(alias?.trim())
        )
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

export function analyzeCompensatoryMates(
  store: DataStore,
  selectedCanineId: string,
  options: AlgorithmPriorityOptions = {}
): CompensatoryAnalysis | null {
  const selectedSummary = store.getCanineSummary(selectedCanineId);
  const selectedTraits = selectedSummary?.traitProfile?.traits;

  if (!selectedSummary || !selectedTraits) {
    return null;
  }

  const weaknessTraits = traitNames
    .map((traitName) => ({
      traitName,
      value: selectedTraits[traitName]
    }))
    .filter((entry): entry is { traitName: TraitName; value: number } => typeof entry.value === "number")
    .sort((left, right) => left.value - right.value);

  const priorityWeight = typeof options.priorityWeight === "number" ? options.priorityWeight : 3;
  const plannerResult = planBreedingForCanine(store, selectedCanineId);
  const averageSelected =
    weaknessTraits.length === 0
      ? 0
      : weaknessTraits.reduce((sum, trait) => sum + trait.value, 0) / weaknessTraits.length;

  const candidates = plannerResult.candidates
    .map((candidate) => {
      const candidateTraits = store.traitProfilesByCanineId.get(candidate.canine.id)?.traits;

      if (!candidateTraits) {
        return null;
      }

      const improvements = weaknessTraits
        .map((trait) => {
          const candidateValue = candidateTraits[trait.traitName];

          if (typeof candidateValue !== "number") {
            return null;
          }

          return {
            traitName: trait.traitName,
            selectedValue: trait.value,
            candidateValue,
            gain: candidateValue - trait.value,
            weightedGain: 0,
            isPriority: options.priorityTrait === trait.traitName
          } satisfies TraitImprovement;
        })
        .filter((entry): entry is TraitImprovement => Boolean(entry))
        .map((entry) => {
          const traitWeight = entry.isPriority ? priorityWeight : 1;
          return {
            ...entry,
            weightedGain: entry.gain * traitWeight
          } satisfies TraitImprovement;
        })
        .filter((entry) => entry.gain > 0)
        .sort((left, right) => right.weightedGain - left.weightedGain || right.gain - left.gain);

      const score = improvements.reduce((sum, improvement) => {
        const weaknessWeight = Math.max(1, averageSelected - improvement.selectedValue + 1);
        return sum + improvement.weightedGain * weaknessWeight;
      }, 0);

      return {
        candidate,
        score,
        strongestImprovements: improvements.slice(0, 3)
      } satisfies CompensatoryCandidate;
    })
    .filter((entry): entry is CompensatoryCandidate => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.candidate.estimate?.traitTotal ?? Number.NEGATIVE_INFINITY) - (left.candidate.estimate?.traitTotal ?? Number.NEGATIVE_INFINITY);
    });

  return {
    selectedLabel: selectedSummary.canine.displayName,
    weaknessTraits: weaknessTraits.slice(0, 5),
    candidates,
    warnings: plannerResult.warnings
  };
}

export function analyzeAssortativeMates(
  store: DataStore,
  selectedCanineId: string,
  options: AlgorithmPriorityOptions = {}
): AssortativeAnalysis | null {
  const selectedSummary = store.getCanineSummary(selectedCanineId);
  const selectedTraits = selectedSummary?.traitProfile?.traits;

  if (!selectedSummary || !selectedTraits) {
    return null;
  }

  const targetStrengthTraits = traitNames
    .map((traitName) => ({
      traitName,
      value: selectedTraits[traitName]
    }))
    .filter((entry): entry is { traitName: TraitName; value: number } => typeof entry.value === "number")
    .sort((left, right) => right.value - left.value);

  const priorityWeight = typeof options.priorityWeight === "number" ? options.priorityWeight : 3;
  const plannerResult = planBreedingForCanine(store, selectedCanineId);
  const candidates = plannerResult.candidates
    .map((candidate) => {
      const candidateTraits = store.traitProfilesByCanineId.get(candidate.canine.id)?.traits;

      if (!candidateTraits) {
        return null;
      }

      const sharedStrengths = targetStrengthTraits
        .map((trait) => {
          const candidateValue = candidateTraits[trait.traitName];

          if (typeof candidateValue !== "number") {
            return null;
          }

          return {
            traitName: trait.traitName,
            selectedValue: trait.value,
            candidateValue,
            combined: trait.value + candidateValue,
            isPriority: options.priorityTrait === trait.traitName,
            weightedCombined: 0
          };
        })
        .filter(
          (
            entry
          ): entry is {
            traitName: TraitName;
            selectedValue: number;
            candidateValue: number;
            combined: number;
            isPriority: boolean;
            weightedCombined: number;
          } => Boolean(entry)
        )
        .map((entry) => {
          const traitWeight = entry.isPriority ? priorityWeight : 1;
          return {
            ...entry,
            weightedCombined: entry.combined * traitWeight
          };
        })
        .sort((left, right) => right.weightedCombined - left.weightedCombined || right.combined - left.combined);

      const score = sharedStrengths.reduce((sum, strength, index) => {
        const weight = Math.max(1, 6 - index);
        return sum + strength.weightedCombined * weight;
      }, 0);

      return {
        candidate,
        score,
        strongestSharedTraits: sharedStrengths.slice(0, 3)
      } satisfies AssortativeCandidate;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightEstimate = right.candidate.estimate?.traitTotal ?? Number.NEGATIVE_INFINITY;
      const leftEstimate = left.candidate.estimate?.traitTotal ?? Number.NEGATIVE_INFINITY;
      if (rightEstimate !== leftEstimate) {
        return rightEstimate - leftEstimate;
      }

      return (right.candidate.procreation ?? Number.NEGATIVE_INFINITY) - (left.candidate.procreation ?? Number.NEGATIVE_INFINITY);
    });

  return {
    selectedLabel: selectedSummary.canine.displayName,
    targetStrengthTraits: targetStrengthTraits.slice(0, 5),
    candidates,
    warnings: plannerResult.warnings
  };
}

export function analyzeOcsMates(store: DataStore, selectedCanineId: string): OcsAnalysis | null {
  const selectedSummary = store.getCanineSummary(selectedCanineId);

  if (!selectedSummary) {
    return null;
  }

  const plannerResult = planBreedingForCanine(store, selectedCanineId);
  const activeSummaries = store.data.canonical.canines
    .filter((canine) => canine.status === "active")
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary));
  const descendantCountsByAncestorId = getDescendantCountsByAncestorId(activeSummaries);
  const safeMateCountsByCanineId = getSafeMateCountsByCanineId(activeSummaries);
  const maxSafeMates = Math.max(0, ...Array.from(safeMateCountsByCanineId.values()));

  const candidates = plannerResult.candidates
    .map((candidate) => {
      const puppyLineage = candidate.puppyLineage;
      const candidateLineage = store.lineageProfilesByCanineId.get(candidate.canine.id);

      if (!puppyLineage || !candidateLineage) {
        return null;
      }

      const repeatedAncestors = getTrackedAncestorIds(puppyLineage)
        .map((ancestorId) => ({
          canineId: ancestorId,
          descendantCount: descendantCountsByAncestorId.get(ancestorId) ?? 0,
          label: store.getCanineSummary(ancestorId)?.canine.displayName ?? ancestorId
        }))
        .filter((entry) => entry.descendantCount > 1)
        .sort((left, right) => right.descendantCount - left.descendantCount)
        .slice(0, 3);

      const ancestorReusePenalty = repeatedAncestors.reduce((sum, entry) => sum + (entry.descendantCount - 1), 0);
      const safeMateCount = safeMateCountsByCanineId.get(candidate.canine.id) ?? 0;
      const constrainedLinePenalty = Math.max(0, maxSafeMates - safeMateCount);
      const relatedPeerPenalty = activeSummaries.reduce((sum, summary) => {
        if (summary.canine.id === selectedCanineId || summary.canine.id === candidate.canine.id || !summary.lineageProfile) {
          return sum;
        }

        return sum + (compareLineage(candidateLineage, summary.lineageProfile).areRelated ? 1 : 0);
      }, 0);

      const baseQuality = (candidate.estimate?.traitTotal ?? candidate.traitTotal ?? 0) + ((candidate.estimate?.procreation ?? candidate.procreation ?? 0) * 5);
      const score = baseQuality - ancestorReusePenalty * 20 - constrainedLinePenalty * 8 - relatedPeerPenalty * 12;

      return {
        candidate,
        score,
        baseQuality,
        ancestorReusePenalty,
        constrainedLinePenalty,
        relatedPeerPenalty,
        safeMateCount,
        repeatedAncestors: repeatedAncestors.map(({ label, descendantCount }) => ({ label, descendantCount }))
      } satisfies OcsCandidate;
    })
    .filter((entry): entry is OcsCandidate => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.relatedPeerPenalty !== right.relatedPeerPenalty) {
        return left.relatedPeerPenalty - right.relatedPeerPenalty;
      }

      return right.baseQuality - left.baseQuality;
    });

  return {
    selectedLabel: selectedSummary.canine.displayName,
    candidates,
    warnings: plannerResult.warnings
  };
}

function getTrackedAncestorIds(lineageProfile: LineageProfile): string[] {
  return [
    lineageProfile.sireId,
    lineageProfile.damId,
    lineageProfile.paternalGrandSireId,
    lineageProfile.paternalGrandDamId,
    lineageProfile.maternalGrandSireId,
    lineageProfile.maternalGrandDamId
  ].filter((canineId): canineId is string => typeof canineId === "string" && canineId.length > 0);
}

function getDescendantCountsByAncestorId(activeSummaries: readonly CanineSummary[]): Map<string, number> {
  const descendantIdsByAncestorId = new Map<string, Set<string>>();

  for (const summary of activeSummaries) {
    if (!summary.lineageProfile) {
      continue;
    }

    for (const ancestorId of getTrackedAncestorIds(summary.lineageProfile)) {
      const descendantIds = descendantIdsByAncestorId.get(ancestorId) ?? new Set<string>();
      descendantIds.add(summary.canine.id);
      descendantIdsByAncestorId.set(ancestorId, descendantIds);
    }
  }

  return new Map(
    Array.from(descendantIdsByAncestorId.entries()).map(([ancestorId, descendantIds]) => [ancestorId, descendantIds.size])
  );
}

function getSafeMateCountsByCanineId(activeSummaries: readonly CanineSummary[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const summary of activeSummaries) {
    if (!summary.lineageProfile || (summary.canine.gender !== "M" && summary.canine.gender !== "F")) {
      continue;
    }
    const summaryLineage = summary.lineageProfile;

    const safeMates = activeSummaries.filter((mate) => {
      if (!mate.lineageProfile) {
        return false;
      }

      const oppositeGender =
        (summary.canine.gender === "M" && mate.canine.gender === "F") ||
        (summary.canine.gender === "F" && mate.canine.gender === "M");

      return oppositeGender && !compareLineage(summaryLineage, mate.lineageProfile).areRelated;
    });

    map.set(summary.canine.id, safeMates.length);
  }

  return map;
}
