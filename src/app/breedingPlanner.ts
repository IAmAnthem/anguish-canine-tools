import type { Canine, DataStore, TraitProfile } from "./dataStore.js";
import {
  estimatePuppyBreedingValue,
  findBreedingCandidates,
  type BreedingCandidate,
  type CanineRecord,
  type PuppyBreedingEstimate
} from "../domain/breeding/candidates.js";
import { generateHypotheticalPuppyLineage, type LineageProfile } from "../domain/lineage/lineage.js";

export type BreedingCanineOption = {
  canineId: string;
  label: string;
  aliases: string[];
};

export type PlannerCandidate = BreedingCandidate & {
  characterName: string;
  humanName: string;
  estimate: PuppyBreedingEstimate | null;
  puppyLineage: LineageProfile | null;
};

export type PlannerResult = {
  selected: Canine | null;
  selectedLabel: string;
  candidates: PlannerCandidate[];
  warnings: string[];
};

export type PlannerOptions = {
  includeRelatedCandidates?: boolean;
  includeSameHumanCandidates?: boolean;
};

export function getBreedingCanineOptions(store: DataStore): BreedingCanineOption[] {
  return store.data.canonical.canines
    .filter((canine) => canine.gender === "M" || canine.gender === "F" || canine.id === "canine-an-untraited-canine")
    .filter((canine) => canine.status === "active")
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
    .sort((left, right) => {
      if (left.canineId === "canine-an-untraited-canine") {
        return -1;
      }

      if (right.canineId === "canine-an-untraited-canine") {
        return 1;
      }

      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
}

export function filterBreedingCanineOptions(
  options: readonly BreedingCanineOption[],
  filterText: string
): BreedingCanineOption[] {
  const query = filterText.trim().toLowerCase();

  if (!query) {
    return [...options];
  }

  return options.filter((option) => {
    if (option.canineId === "canine-an-untraited-canine") {
      return option.aliases
        .filter((alias) => alias.toLowerCase().includes("untraited"))
        .some((alias) => alias.toLowerCase().includes(query));
    }

    return [option.label, ...option.aliases].some((value) => value.toLowerCase().includes(query));
  });
}

export function planBreedingForCanine(
  store: DataStore,
  selectedCanineId: string,
  options: PlannerOptions = {}
): PlannerResult {
  const selected = store.data.canonical.canines.find((canine) => canine.id === selectedCanineId) ?? null;

  if (!selected) {
    return {
      selected: null,
      selectedLabel: "No selected canine",
      candidates: [],
      warnings: ["Select a breeding target before planning."]
    };
  }

  if (selected.gender !== "M" && selected.gender !== "F") {
    return {
      selected,
      selectedLabel: selected.displayName,
      candidates: [],
      warnings: ["Choose a male or female canine to show mate candidates."]
    };
  }

  const selectedProfile = store.traitProfilesByCanineId.get(selected.id) as TraitProfile | undefined;
  const selectedLineage = store.lineageProfilesByCanineId.get(selected.id);
  const candidates = findBreedingCandidates({
    selectedCanine: toCandidateRecord(selected),
    candidateCanines: store.data.canonical.canines.map(toCandidateRecord),
    characters: store.data.canonical.characters,
    traitProfiles: store.data.canonical.traitProfiles,
    lineageProfiles: store.data.canonical.lineageProfiles,
    includeRelatedCandidates: options.includeRelatedCandidates,
    includeSameHumanCandidates: options.includeSameHumanCandidates
  }).map((candidate) =>
    enrichCandidate(store, selected, candidate, selectedProfile, selectedLineage)
  );

  return {
    selected,
    selectedLabel: selected.displayName,
    candidates,
    warnings: []
  };
}

function enrichCandidate(
  store: DataStore,
  selected: Canine,
  candidate: BreedingCandidate,
  selectedProfile: TraitProfile | undefined,
  selectedLineage: LineageProfile | undefined
): PlannerCandidate {
  const candidateSummary = store.getCanineSummary(candidate.canine.id);
  const candidateProfile = store.traitProfilesByCanineId.get(candidate.canine.id) as TraitProfile | undefined;
  const candidateLineage = store.lineageProfilesByCanineId.get(candidate.canine.id);
  const estimate =
    selectedProfile && candidateProfile
      ? estimatePuppyBreedingValue(toPlannerTraitProfile(selectedProfile), toPlannerTraitProfile(candidateProfile))
      : null;
  const sireLineage = selected.gender === "M" ? selectedLineage : candidateLineage;
  const damLineage = selected.gender === "F" ? selectedLineage : candidateLineage;
  const puppyLineage =
    sireLineage && damLineage
      ? generateHypotheticalPuppyLineage(`planned-${selected.id}-${candidate.canine.id}`, sireLineage, damLineage)
      : null;

  return {
    ...candidate,
    characterName: candidateSummary?.character?.name ?? "unknown",
    humanName: candidateSummary?.human?.displayName ?? "unknown",
    estimate,
    puppyLineage
  };
}

function toCandidateRecord(canine: Canine): CanineRecord {
  return {
    id: canine.id,
    displayName: canine.displayName,
    characterId: canine.characterId,
    gender: canine.gender as CanineRecord["gender"],
    canineType: canine.canineType,
    status: canine.status
  };
}

function toPlannerTraitProfile(profile: TraitProfile) {
  return {
    canineId: profile.canineId,
    status: profile.status,
    total: profile.total,
    traits: profile.traits
  };
}
