import caninesJson from "../../data/canonical/canines.json" with { type: "json" };
import charactersJson from "../../data/canonical/characters.json" with { type: "json" };
import humansJson from "../../data/canonical/humans.json" with { type: "json" };
import lineageProfilesJson from "../../data/canonical/lineage-profiles.json" with { type: "json" };
import sourceObservationsJson from "../../data/canonical/source-observations.json" with { type: "json" };
import traitProfilesJson from "../../data/canonical/trait-profiles.json" with { type: "json" };
import collarsJson from "../../data/reference/collars.json" with { type: "json" };
import comparisonRangesJson from "../../data/reference/comparison-ranges.json" with { type: "json" };
import {
  validateAllData,
  type CanonicalDataSet,
  type DataIntegrityReport,
  type LineageProfileRecord,
  type ReferenceDataSet
} from "../domain/dataIntegrity.js";
import type { CollarReference } from "../domain/reference/collarGuidance.js";
import type { ComparisonRange } from "../domain/traits/comparisonRanges.js";
import type { TraitName } from "../domain/traits/traitNames.js";

export type RecordStatus = "active" | "inactive" | "unknown" | "known" | "summary" | string;
export type Gender = "M" | "F" | "U" | "A" | string;
export type RangeValue = {
  min: number;
  max: number;
};
export type TraitValue = number | RangeValue;
export type TotalValue = TraitValue | null;

export type Human = {
  id: string;
  displayName: string;
  contact: string | null;
  status: RecordStatus;
};

export type Character = {
  id: string;
  name: string;
  humanId: string | null;
  status: RecordStatus;
};

export type CanineAppearance = {
  primaryColor: string | null;
  secondaryColor: string | null;
  eyeColor: string | null;
};

export type Canine = {
  id: string;
  externalIds: Record<string, string>;
  callName: string;
  displayName: string;
  characterId: string;
  gender: Gender;
  canineType: string | null;
  appearance: CanineAppearance | null;
  status: RecordStatus;
};

export type TraitProfile = {
  canineId: string;
  status: RecordStatus;
  total: TotalValue;
  traits: Partial<Record<TraitName, TraitValue>> | null;
};

export type SourceObservation = {
  id: string;
  entityType: string;
  entityId: string;
  source: string;
  sourceObservedAt: string | null;
  sourceLag: string | null;
  externalId: string | null;
  notes: string | null;
};

export type RepositoryData = {
  canonical: {
    humans: readonly Human[];
    characters: readonly Character[];
    canines: readonly Canine[];
    traitProfiles: readonly TraitProfile[];
    lineageProfiles: readonly LineageProfileRecord[];
    sourceObservations: readonly SourceObservation[];
  };
  reference: {
    collars: readonly CollarReference[];
    comparisonRanges: readonly ComparisonRange[];
  };
};

export type CanineSummary = {
  canine: Canine;
  character: Character | undefined;
  human: Human | undefined;
  traitProfile: TraitProfile | undefined;
  lineageProfile: LineageProfileRecord | undefined;
  totalLabel: string;
  procreationLabel: string;
};

export type DataStore = {
  data: RepositoryData;
  integrity: DataIntegrityReport;
  humansById: ReadonlyMap<string, Human>;
  charactersById: ReadonlyMap<string, Character>;
  caninesById: ReadonlyMap<string, Canine>;
  traitProfilesByCanineId: ReadonlyMap<string, TraitProfile>;
  lineageProfilesByCanineId: ReadonlyMap<string, LineageProfileRecord>;
  getCanineSummary: (canineId: string) => CanineSummary | undefined;
  getTopKnownCanines: (limit: number) => CanineSummary[];
  stats: {
    humans: number;
    characters: number;
    canines: number;
    activeCanines: number;
    knownTraitProfiles: number;
    lineageProfiles: number;
    collarReferences: number;
  };
};

export function loadRepositoryData(): RepositoryData {
  return {
    canonical: {
      humans: humansJson as readonly Human[],
      characters: charactersJson as readonly Character[],
      canines: caninesJson as readonly Canine[],
      traitProfiles: traitProfilesJson as readonly TraitProfile[],
      lineageProfiles: lineageProfilesJson as readonly LineageProfileRecord[],
      sourceObservations: sourceObservationsJson as readonly SourceObservation[]
    },
    reference: {
      collars: collarsJson as readonly CollarReference[],
      comparisonRanges: comparisonRangesJson as readonly ComparisonRange[]
    }
  };
}

export function createDataStore(data: RepositoryData = loadRepositoryData()): DataStore {
  const humansById = indexById(data.canonical.humans);
  const charactersById = indexById(data.canonical.characters);
  const caninesById = indexById(data.canonical.canines);
  const traitProfilesByCanineId = indexBy(data.canonical.traitProfiles, (profile) => profile.canineId);
  const lineageProfilesByCanineId = indexBy(data.canonical.lineageProfiles, (profile) => profile.canineId);
  const integrity = validateAllData(
    {
      humans: data.canonical.humans,
      characters: data.canonical.characters,
      canines: data.canonical.canines,
      traitProfiles: data.canonical.traitProfiles,
      lineageProfiles: data.canonical.lineageProfiles
    } as CanonicalDataSet,
    {
      collars: data.reference.collars,
      comparisonRanges: data.reference.comparisonRanges
    } as ReferenceDataSet
  );

  function getCanineSummary(canineId: string): CanineSummary | undefined {
    const canine = caninesById.get(canineId);

    if (!canine) {
      return undefined;
    }

    const character = charactersById.get(canine.characterId);
    const human = character?.humanId ? humansById.get(character.humanId) : undefined;
    const traitProfile = traitProfilesByCanineId.get(canine.id);
    const lineageProfile = lineageProfilesByCanineId.get(canine.id);

    return {
      canine,
      character,
      human,
      traitProfile,
      lineageProfile,
      totalLabel: formatValue(traitProfile?.total),
      procreationLabel: formatValue(traitProfile?.traits?.Procreation)
    };
  }

  function getTopKnownCanines(limit: number): CanineSummary[] {
    return data.canonical.canines
      .map((canine) => getCanineSummary(canine.id))
      .filter((summary): summary is CanineSummary => Boolean(summary?.traitProfile))
      .filter(hasNumericTotal)
      .sort((left, right) => right.traitProfile.total - left.traitProfile.total)
      .slice(0, limit);
  }

  return {
    data,
    integrity,
    humansById,
    charactersById,
    caninesById,
    traitProfilesByCanineId,
    lineageProfilesByCanineId,
    getCanineSummary,
    getTopKnownCanines,
    stats: {
      humans: data.canonical.humans.length,
      characters: data.canonical.characters.length,
      canines: data.canonical.canines.length,
      activeCanines: data.canonical.canines.filter((canine) => canine.status === "active").length,
      knownTraitProfiles: data.canonical.traitProfiles.filter((profile) => profile.status === "known").length,
      lineageProfiles: data.canonical.lineageProfiles.length,
      collarReferences: data.reference.collars.length
    }
  };
}

export function formatValue(value: TotalValue | undefined): string {
  if (typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return value.min === value.max ? String(value.min) : `${value.min}-${value.max}`;
  }

  return "unknown";
}

function indexById<T extends { id: string }>(records: readonly T[]): ReadonlyMap<string, T> {
  return indexBy(records, (record) => record.id);
}

function indexBy<T>(records: readonly T[], getKey: (record: T) => string): ReadonlyMap<string, T> {
  const index = new Map<string, T>();

  for (const record of records) {
    index.set(getKey(record), record);
  }

  return index;
}

function hasNumericTotal(
  summary: CanineSummary
): summary is CanineSummary & { traitProfile: TraitProfile & { total: number } } {
  return typeof summary.traitProfile?.total === "number";
}
