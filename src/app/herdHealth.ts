import { isBreedingPoolCanine, type CanineSummary, type DataStore } from "./dataStore.js";
import { compareLineage } from "../domain/lineage/lineage.js";

export type HerdHealthOverview = {
  totalCanines: number;
  activeCanines: number;
  breedingCadreCanines: number;
  activeOutsideBreedingCadre: number;
  inactiveCanines: number;
  unknownStatusCanines: number;
  activeMales: number;
  activeFemales: number;
  activeUnknownGender: number;
  activeWithTraitProfiles: number;
  activeWithLineageProfiles: number;
  averageTotal: number | null;
  averageProcreation: number | null;
};

export type HerdRelatednessPressure = {
  comparablePairs: number;
  relatedPairs: number;
  relatedPairPercent: number | null;
};

export type OverusedAncestor = {
  canineId: string;
  label: string;
  descendantCount: number;
};

export type LowMateOption = {
  summary: CanineSummary;
  safeMateCount: number;
  possibleMateCount: number;
};

export type HerdHealthReport = {
  overview: HerdHealthOverview;
  relatednessPressure: HerdRelatednessPressure;
  overusedAncestors: OverusedAncestor[];
  lowMateOptions: LowMateOption[];
};

export function createHerdHealthReport(store: DataStore): HerdHealthReport {
  const activeSummaries = store.data.canonical.canines
    .filter(isBreedingPoolCanine)
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary));

  return {
    overview: createOverview(store, activeSummaries),
    relatednessPressure: createRelatednessPressure(activeSummaries),
    overusedAncestors: createOverusedAncestors(store, activeSummaries, 8),
    lowMateOptions: createLowMateOptions(activeSummaries, 8)
  };
}

function createOverview(store: DataStore, activeSummaries: readonly CanineSummary[]): HerdHealthOverview {
  const totals = activeSummaries
    .map((summary) => summary.traitProfile?.total)
    .filter((value): value is number => typeof value === "number");
  const procreationValues = activeSummaries
    .map((summary) => summary.traitProfile?.traits?.Procreation)
    .filter((value): value is number => typeof value === "number");

  return {
    totalCanines: store.data.canonical.canines.length,
    activeCanines: store.data.canonical.canines.filter((canine) => canine.status === "active").length,
    breedingCadreCanines: activeSummaries.length,
    activeOutsideBreedingCadre: store.data.canonical.canines.filter(
      (canine) => canine.status === "active" && !isBreedingPoolCanine(canine)
    ).length,
    inactiveCanines: store.data.canonical.canines.filter((canine) => canine.status === "inactive").length,
    unknownStatusCanines: store.data.canonical.canines.filter((canine) => canine.status === "unknown").length,
    activeMales: activeSummaries.filter((summary) => summary.canine.gender === "M").length,
    activeFemales: activeSummaries.filter((summary) => summary.canine.gender === "F").length,
    activeUnknownGender: activeSummaries.filter((summary) => !["M", "F"].includes(summary.canine.gender)).length,
    activeWithTraitProfiles: activeSummaries.filter((summary) => summary.traitProfile).length,
    activeWithLineageProfiles: activeSummaries.filter((summary) => summary.lineageProfile).length,
    averageTotal: average(totals),
    averageProcreation: average(procreationValues)
  };
}

function createRelatednessPressure(activeSummaries: readonly CanineSummary[]): HerdRelatednessPressure {
  let comparablePairs = 0;
  let relatedPairs = 0;

  for (let leftIndex = 0; leftIndex < activeSummaries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < activeSummaries.length; rightIndex += 1) {
      const left = activeSummaries[leftIndex];
      const right = activeSummaries[rightIndex];

      if (!left.lineageProfile || !right.lineageProfile) {
        continue;
      }

      comparablePairs += 1;

      if (compareLineage(left.lineageProfile, right.lineageProfile).areRelated) {
        relatedPairs += 1;
      }
    }
  }

  return {
    comparablePairs,
    relatedPairs,
    relatedPairPercent: comparablePairs > 0 ? relatedPairs / comparablePairs : null
  };
}

function createOverusedAncestors(
  store: DataStore,
  activeSummaries: readonly CanineSummary[],
  limit: number
): OverusedAncestor[] {
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

  return Array.from(descendantIdsByAncestorId.entries())
    .map(([canineId, descendantIds]) => ({
      canineId,
      label: store.getCanineSummary(canineId)?.canine.displayName ?? canineId,
      descendantCount: descendantIds.size
    }))
    .filter((ancestor) => ancestor.descendantCount > 1)
    .sort(
      (left, right) =>
        right.descendantCount - left.descendantCount ||
        left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
    )
    .slice(0, limit);
}

function createLowMateOptions(activeSummaries: readonly CanineSummary[], limit: number): LowMateOption[] {
  return activeSummaries
    .filter((summary) => summary.lineageProfile)
    .map((summary) => {
      const possibleMates = activeSummaries.filter((mate) => isOppositeKnownGender(summary, mate) && mate.lineageProfile);
      const safeMates = possibleMates.filter(
        (mate) => summary.lineageProfile && mate.lineageProfile && !compareLineage(summary.lineageProfile, mate.lineageProfile).areRelated
      );

      return {
        summary,
        safeMateCount: safeMates.length,
        possibleMateCount: possibleMates.length
      };
    })
    .filter((option) => option.possibleMateCount > 0)
    .sort(
      (left, right) =>
        left.safeMateCount - right.safeMateCount ||
        left.summary.canine.displayName.localeCompare(right.summary.canine.displayName, undefined, { sensitivity: "base" })
    )
    .slice(0, limit);
}

function getTrackedAncestorIds(lineageProfile: NonNullable<CanineSummary["lineageProfile"]>): string[] {
  return [
    lineageProfile.sireId,
    lineageProfile.damId,
    lineageProfile.paternalGrandSireId,
    lineageProfile.paternalGrandDamId,
    lineageProfile.maternalGrandSireId,
    lineageProfile.maternalGrandDamId
  ].filter((canineId): canineId is string => typeof canineId === "string" && canineId.length > 0);
}

function isOppositeKnownGender(left: CanineSummary, right: CanineSummary): boolean {
  return (
    (left.canine.gender === "M" && right.canine.gender === "F") ||
    (left.canine.gender === "F" && right.canine.gender === "M")
  );
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
