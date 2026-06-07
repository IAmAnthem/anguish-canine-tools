import { validateCollarReferences, type CollarReference } from "./reference/collarGuidance.js";
import type { ComparisonRange } from "./traits/comparisonRanges.js";

export type HumanRecord = {
  id: string;
};

export type CharacterRecord = {
  id: string;
  humanId: string | null;
};

export type CanineRecord = {
  id: string;
  characterId: string;
  status?: string;
  canineType?: string | null;
  breedingRole?: string;
};

export type TraitProfileRecord = {
  canineId: string;
};

export type LineageProfileRecord = {
  canineId: string;
  sireId: string | null;
  damId: string | null;
  paternalGrandSireId: string | null;
  paternalGrandDamId: string | null;
  maternalGrandSireId: string | null;
  maternalGrandDamId: string | null;
};

export type CanonicalDataSet = {
  humans: readonly HumanRecord[];
  characters: readonly CharacterRecord[];
  canines: readonly CanineRecord[];
  traitProfiles: readonly TraitProfileRecord[];
  lineageProfiles: readonly LineageProfileRecord[];
};

export type ReferenceDataSet = {
  collars: readonly CollarReference[];
  comparisonRanges: readonly ComparisonRange[];
};

export type DataIntegrityReport = {
  isValid: boolean;
  errors: string[];
};

const lineageReferenceFields = [
  "sireId",
  "damId",
  "paternalGrandSireId",
  "paternalGrandDamId",
  "maternalGrandSireId",
  "maternalGrandDamId"
] as const;
const validBreedingRoles = new Set(["breeding", "play-only", "retired", "unknown"]);

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return Array.from(duplicates).sort();
}

function addDuplicateIdErrors(errors: string[], label: string, ids: readonly string[]): void {
  for (const duplicate of duplicateValues(ids)) {
    errors.push(`${label} duplicate id '${duplicate}'.`);
  }
}

function addMissingReferenceError(
  errors: string[],
  source: string,
  sourceId: string,
  field: string,
  targetId: string
): void {
  errors.push(`${source} '${sourceId}' references missing ${field} '${targetId}'.`);
}

function isRangeLike(value: unknown): value is ComparisonRange {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeRange = value as Partial<ComparisonRange>;
  return (
    typeof maybeRange.text === "string" &&
    maybeRange.text.length > 0 &&
    typeof maybeRange.min === "number" &&
    Number.isFinite(maybeRange.min) &&
    typeof maybeRange.max === "number" &&
    Number.isFinite(maybeRange.max) &&
    maybeRange.min <= maybeRange.max
  );
}

export function validateCanonicalData(data: CanonicalDataSet): DataIntegrityReport {
  const errors: string[] = [];
  const humanIds = new Set(data.humans.map((human) => human.id));
  const characterIds = new Set(data.characters.map((character) => character.id));
  const canineIds = new Set(data.canines.map((canine) => canine.id));

  addDuplicateIdErrors(errors, "Human", data.humans.map((human) => human.id));
  addDuplicateIdErrors(errors, "Character", data.characters.map((character) => character.id));
  addDuplicateIdErrors(errors, "Canine", data.canines.map((canine) => canine.id));
  addDuplicateIdErrors(
    errors,
    "Trait profile",
    data.traitProfiles.map((profile) => profile.canineId)
  );
  addDuplicateIdErrors(
    errors,
    "Lineage profile",
    data.lineageProfiles.map((profile) => profile.canineId)
  );

  for (const character of data.characters) {
    if (character.humanId === null) {
      continue;
    }

    if (!humanIds.has(character.humanId)) {
      addMissingReferenceError(errors, "Character", character.id, "humanId", character.humanId);
    }
  }

  for (const canine of data.canines) {
    if (!characterIds.has(canine.characterId)) {
      addMissingReferenceError(errors, "Canine", canine.id, "characterId", canine.characterId);
    }

    if (canine.breedingRole !== undefined && !validBreedingRoles.has(canine.breedingRole)) {
      errors.push(`Canine '${canine.id}' has invalid breedingRole '${String(canine.breedingRole)}'.`);
    }

    if (canine.canineType !== null && canine.canineType !== undefined && typeof canine.canineType !== "string") {
      errors.push(`Canine '${canine.id}' has non-string canineType.`);
    }

    if (canine.status === "inactive" && canine.breedingRole === "breeding") {
      errors.push(`Canine '${canine.id}' is inactive but marked as breeding.`);
    }
  }

  for (const profile of data.traitProfiles) {
    if (!canineIds.has(profile.canineId)) {
      addMissingReferenceError(errors, "Trait profile", profile.canineId, "canineId", profile.canineId);
    }
  }

  for (const profile of data.lineageProfiles) {
    if (!canineIds.has(profile.canineId)) {
      addMissingReferenceError(errors, "Lineage profile", profile.canineId, "canineId", profile.canineId);
    }

    for (const field of lineageReferenceFields) {
      const referencedCanineId = profile[field];
      if (referencedCanineId !== null && !canineIds.has(referencedCanineId)) {
        addMissingReferenceError(
          errors,
          "Lineage profile",
          profile.canineId,
          field,
          referencedCanineId
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateActiveCanineOwnership(canines: readonly CanineRecord[]): DataIntegrityReport {
  const errors: string[] = [];

  for (const [characterId, activeCanineIds] of getActiveCanineIdsByCharacter(canines)) {
    if (activeCanineIds.length > 1) {
      errors.push(
        `Character '${characterId}' has multiple active canines: ${activeCanineIds.join(", ")}.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getActiveCanineIdsByCharacter(canines: readonly CanineRecord[]): Map<string, string[]> {
  const activeIdsByCharacter = new Map<string, string[]>();

  for (const canine of canines) {
    if (canine.status !== "active") {
      continue;
    }

    const activeIds = activeIdsByCharacter.get(canine.characterId) ?? [];
    activeIds.push(canine.id);
    activeIdsByCharacter.set(canine.characterId, activeIds);
  }

  return activeIdsByCharacter;
}

export function validateReferenceData(data: ReferenceDataSet): DataIntegrityReport {
  const errors: string[] = [];
  const collarValidation = validateCollarReferences(data.collars);

  errors.push(...collarValidation.errors);
  addDuplicateIdErrors(
    errors,
    "Comparison range",
    data.comparisonRanges.map((range) => range.text)
  );

  data.comparisonRanges.forEach((range, index) => {
    if (!isRangeLike(range)) {
      errors.push(`Comparison range at index ${index} is malformed.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateAllData(
  canonicalData: CanonicalDataSet,
  referenceData: ReferenceDataSet
): DataIntegrityReport {
  const canonical = validateCanonicalData(canonicalData);
  const reference = validateReferenceData(referenceData);
  const errors = [...canonical.errors, ...reference.errors];

  return {
    isValid: errors.length === 0,
    errors
  };
}
