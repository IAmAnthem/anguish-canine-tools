import {
  compareLineage,
  type CanineId,
  type LineageProfile,
  type RelationshipComparison
} from "../lineage/lineage.js";
import type { TraitName } from "../traits/traitNames.js";

export type Gender = "M" | "F" | "U" | "A";

export type CanineRecord = {
  id: CanineId;
  displayName: string;
  characterId: string;
  gender: Gender;
  canineType: string | null;
  status: string;
};

export type CharacterRecord = {
  id: string;
  humanId: string | null;
};

export type TraitValueRange = {
  min: number;
  max: number;
};

export type TraitValue = number | TraitValueRange | null;

export type TraitProfile = {
  canineId: CanineId;
  status: string;
  total: TraitValue;
  traits: Partial<Record<TraitName, TraitValue>> | null;
};

export type BreedingCandidate = {
  canine: CanineRecord;
  traitTotal: number | null;
  procreation: number | null;
  relationship: RelationshipComparison;
  isGeneticallySafe: boolean;
  isDirectBreedingPractical: boolean;
  warnings: string[];
};

export type FindBreedingCandidatesInput = {
  selectedCanine: CanineRecord;
  candidateCanines: readonly CanineRecord[];
  characters: readonly CharacterRecord[];
  traitProfiles: readonly TraitProfile[];
  lineageProfiles: readonly LineageProfile[];
  includeSameHumanCandidates?: boolean;
  includeRelatedCandidates?: boolean;
  includeInactiveCandidates?: boolean;
};

export type PuppyBreedingEstimate = {
  kind: "estimate";
  traitTotal: number | null;
  procreation: number | null;
  notes: string[];
};

function isExactNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function midpoint(value: TraitValue): number | null {
  if (isExactNumber(value)) {
    return value;
  }

  if (value && isExactNumber(value.min) && isExactNumber(value.max)) {
    return (value.min + value.max) / 2;
  }

  return null;
}

function oppositeGender(gender: Gender): Gender | null {
  if (gender === "M") {
    return "F";
  }

  if (gender === "F") {
    return "M";
  }

  return null;
}

function characterHumanId(characters: readonly CharacterRecord[], characterId: string): string | null {
  return characters.find((character) => character.id === characterId)?.humanId ?? null;
}

function isConcreteHumanId(humanId: string | null): humanId is string {
  return Boolean(humanId && humanId !== "human-anyone" && humanId !== "human-unknown");
}

function areSameConcreteHuman(
  selectedCanine: CanineRecord,
  candidateCanine: CanineRecord,
  characters: readonly CharacterRecord[]
): boolean {
  const selectedHumanId = characterHumanId(characters, selectedCanine.characterId);
  const candidateHumanId = characterHumanId(characters, candidateCanine.characterId);

  return (
    isConcreteHumanId(selectedHumanId) &&
    isConcreteHumanId(candidateHumanId) &&
    selectedHumanId === candidateHumanId
  );
}

function lineageFor(
  lineageProfiles: readonly LineageProfile[],
  canineId: CanineId
): LineageProfile | null {
  return lineageProfiles.find((profile) => profile.canineId === canineId) ?? null;
}

function traitProfileFor(
  traitProfiles: readonly TraitProfile[],
  canineId: CanineId
): TraitProfile | null {
  return traitProfiles.find((profile) => profile.canineId === canineId) ?? null;
}

function compareTypes(selectedCanine: CanineRecord, candidateCanine: CanineRecord): string | null {
  if (!selectedCanine.canineType || !candidateCanine.canineType) {
    return null;
  }

  if (selectedCanine.canineType === candidateCanine.canineType) {
    return null;
  }

  return `Mixed canine type: ${selectedCanine.canineType} to ${candidateCanine.canineType}.`;
}

export function evaluateBreedingCandidate(
  selectedCanine: CanineRecord,
  candidateCanine: CanineRecord,
  input: Pick<FindBreedingCandidatesInput, "characters" | "traitProfiles" | "lineageProfiles">
): BreedingCandidate {
  const warnings: string[] = [];
  const selectedLineage = lineageFor(input.lineageProfiles, selectedCanine.id);
  const candidateLineage = lineageFor(input.lineageProfiles, candidateCanine.id);
  const relationship =
    selectedLineage && candidateLineage
      ? compareLineage(selectedLineage, candidateLineage)
      : { areRelated: false, sharedAncestors: [] };
  const sameHuman = areSameConcreteHuman(selectedCanine, candidateCanine, input.characters);
  const traitProfile = traitProfileFor(input.traitProfiles, candidateCanine.id);
  const typeWarning = compareTypes(selectedCanine, candidateCanine);

  if (!selectedLineage || !candidateLineage) {
    warnings.push("Lineage data is missing; relationship safety could not be fully checked.");
  }

  if (sameHuman) {
    warnings.push("Same human owns both characters; direct breeding is not practical with alternate characters.");
  }

  if (typeWarning) {
    warnings.push(typeWarning);
  }

  return {
    canine: candidateCanine,
    traitTotal: midpoint(traitProfile?.total ?? null),
    procreation: midpoint(traitProfile?.traits?.Procreation ?? null),
    relationship,
    isGeneticallySafe: !relationship.areRelated,
    isDirectBreedingPractical: !sameHuman,
    warnings
  };
}

export function findBreedingCandidates(input: FindBreedingCandidatesInput): BreedingCandidate[] {
  const requiredGender = oppositeGender(input.selectedCanine.gender);

  if (!requiredGender) {
    return [];
  }

  return input.candidateCanines
    .filter((candidate) => candidate.id !== input.selectedCanine.id)
    .filter((candidate) => candidate.gender === requiredGender)
    .filter((candidate) => input.includeInactiveCandidates || candidate.status === "active")
    .map((candidate) => evaluateBreedingCandidate(input.selectedCanine, candidate, input))
    .filter((candidate) => input.includeRelatedCandidates || candidate.isGeneticallySafe)
    .filter((candidate) => input.includeSameHumanCandidates || candidate.isDirectBreedingPractical)
    .sort(compareBreedingCandidates);
}

export function compareBreedingCandidates(
  left: BreedingCandidate,
  right: BreedingCandidate
): number {
  const rightTotal = right.traitTotal ?? Number.NEGATIVE_INFINITY;
  const leftTotal = left.traitTotal ?? Number.NEGATIVE_INFINITY;

  if (rightTotal !== leftTotal) {
    return rightTotal - leftTotal;
  }

  const rightProcreation = right.procreation ?? Number.NEGATIVE_INFINITY;
  const leftProcreation = left.procreation ?? Number.NEGATIVE_INFINITY;

  return rightProcreation - leftProcreation;
}

export function estimatePuppyBreedingValue(
  sireProfile: TraitProfile,
  damProfile: TraitProfile
): PuppyBreedingEstimate {
  const sireTotal = midpoint(sireProfile.total);
  const damTotal = midpoint(damProfile.total);
  const sireProcreation = midpoint(sireProfile.traits?.Procreation ?? null);
  const damProcreation = midpoint(damProfile.traits?.Procreation ?? null);

  return {
    kind: "estimate",
    traitTotal: sireTotal === null || damTotal === null ? null : (sireTotal + damTotal) / 2,
    procreation:
      sireProcreation === null || damProcreation === null
        ? null
        : (sireProcreation + damProcreation) / 2,
    notes: [
      "Estimated puppy values are planning aids, not predictions.",
      "Do not promote this estimate into canonical canine data until an actual puppy is statted."
    ]
  };
}
