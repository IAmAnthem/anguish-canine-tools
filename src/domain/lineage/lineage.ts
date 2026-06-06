export type CanineId = string;

export type LineageProfile = {
  canineId: CanineId;
  sireId: CanineId | null;
  damId: CanineId | null;
  paternalGrandSireId: CanineId | null;
  paternalGrandDamId: CanineId | null;
  maternalGrandSireId: CanineId | null;
  maternalGrandDamId: CanineId | null;
};

export type LineageSlot = keyof LineageProfile;

export type RelationshipSlot =
  | "self"
  | "sire"
  | "dam"
  | "paternalGrandSire"
  | "paternalGrandDam"
  | "maternalGrandSire"
  | "maternalGrandDam";

export type RelationshipEntry = {
  canineId: CanineId;
  slot: RelationshipSlot;
};

export type SharedAncestor = {
  canineId: CanineId;
  leftSlots: RelationshipSlot[];
  rightSlots: RelationshipSlot[];
};

export type RelationshipComparison = {
  areRelated: boolean;
  sharedAncestors: SharedAncestor[];
};

const lineageSlots = [
  "sireId",
  "damId",
  "paternalGrandSireId",
  "paternalGrandDamId",
  "maternalGrandSireId",
  "maternalGrandDamId"
] as const satisfies readonly LineageSlot[];

const relationshipSlotByLineageSlot = {
  sireId: "sire",
  damId: "dam",
  paternalGrandSireId: "paternalGrandSire",
  paternalGrandDamId: "paternalGrandDam",
  maternalGrandSireId: "maternalGrandSire",
  maternalGrandDamId: "maternalGrandDam"
} as const satisfies Record<(typeof lineageSlots)[number], RelationshipSlot>;

function isTrackedAncestorId(canineId: CanineId | null | undefined): canineId is CanineId {
  return typeof canineId === "string" && canineId.trim().length > 0;
}

function uniqueSlots(slots: readonly RelationshipSlot[]): RelationshipSlot[] {
  return Array.from(new Set(slots));
}

export function buildRelationshipSet(profile: LineageProfile): RelationshipEntry[] {
  const entries: RelationshipEntry[] = [
    {
      canineId: profile.canineId,
      slot: "self"
    }
  ];

  for (const lineageSlot of lineageSlots) {
    const canineId = profile[lineageSlot];
    if (!isTrackedAncestorId(canineId)) {
      continue;
    }

    entries.push({
      canineId,
      slot: relationshipSlotByLineageSlot[lineageSlot]
    });
  }

  return entries;
}

export function compareLineage(
  leftProfile: LineageProfile,
  rightProfile: LineageProfile
): RelationshipComparison {
  const leftEntries = buildRelationshipSet(leftProfile);
  const rightEntries = buildRelationshipSet(rightProfile);
  const rightIds = new Set(rightEntries.map((entry) => entry.canineId));
  const sharedIds = Array.from(
    new Set(leftEntries.map((entry) => entry.canineId).filter((canineId) => rightIds.has(canineId)))
  ).sort();

  const sharedAncestors = sharedIds.map((canineId) => ({
    canineId,
    leftSlots: uniqueSlots(
      leftEntries.filter((entry) => entry.canineId === canineId).map((entry) => entry.slot)
    ),
    rightSlots: uniqueSlots(
      rightEntries.filter((entry) => entry.canineId === canineId).map((entry) => entry.slot)
    )
  }));

  return {
    areRelated: sharedAncestors.length > 0,
    sharedAncestors
  };
}

export function generateHypotheticalPuppyLineage(
  puppyCanineId: CanineId,
  sireProfile: LineageProfile,
  damProfile: LineageProfile
): LineageProfile {
  return {
    canineId: puppyCanineId,
    sireId: sireProfile.canineId,
    damId: damProfile.canineId,
    paternalGrandSireId: sireProfile.sireId,
    paternalGrandDamId: sireProfile.damId,
    maternalGrandSireId: damProfile.sireId,
    maternalGrandDamId: damProfile.damId
  };
}
