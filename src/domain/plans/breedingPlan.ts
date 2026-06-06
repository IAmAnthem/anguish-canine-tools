import {
  buildRelationshipSet,
  generateHypotheticalPuppyLineage,
  type CanineId,
  type LineageProfile,
  type RelationshipEntry
} from "../lineage/lineage.js";
import type { TraitProfile } from "../breeding/candidates.js";

export type PlanParentReference =
  | {
      kind: "canonical";
      canineId: CanineId;
    }
  | {
      kind: "planned-puppy";
      puppyId: string;
    };

export type PlannedPuppySlot = {
  id: string;
  label: string;
  status: "empty" | "statted" | "selected" | "rejected";
  traitProfile: TraitProfile | null;
  notes: string;
};

export type BreedingPlanStep = {
  id: string;
  label: string;
  sire: PlanParentReference | null;
  dam: PlanParentReference | null;
  puppySlots: PlannedPuppySlot[];
  selectedPuppySlotId: string | null;
  notes: string;
};

export type BreedingPlan = {
  id: string;
  name: string;
  originPoolCanineIds: CanineId[];
  steps: BreedingPlanStep[];
};

export type PlanLineageResult = {
  lineagesByPuppyId: ReadonlyMap<string, LineageProfile>;
  warnings: string[];
};

export type HistoryFlushReport = {
  trackedOriginEntries: RelationshipEntry[];
  retainedOriginCanineIds: CanineId[];
  flushedOriginCanineIds: CanineId[];
};

const defaultStepCount = 3;
const defaultLitterSize = 6;

export function createEmptyBreedingPlan(
  id: string,
  name: string,
  stepCount = defaultStepCount,
  litterSize = defaultLitterSize
): BreedingPlan {
  return {
    id,
    name,
    originPoolCanineIds: [],
    steps: Array.from({ length: stepCount }, (_, stepIndex) =>
      createEmptyPlanStep(id, stepIndex + 1, litterSize)
    )
  };
}

export function createPlannedPuppyId(planId: string, stepNumber: number, slotNumber: number): string {
  return `plan:${planId}:step-${stepNumber}:puppy-${slotNumber}`;
}

export function createEmptyPlanStep(
  planId: string,
  stepNumber: number,
  litterSize = defaultLitterSize
): BreedingPlanStep {
  return {
    id: `step-${stepNumber}`,
    label: `Step ${stepNumber}`,
    sire: null,
    dam: null,
    puppySlots: Array.from({ length: litterSize }, (_, slotIndex) => ({
      id: createPlannedPuppyId(planId, stepNumber, slotIndex + 1),
      label: `Puppy ${slotIndex + 1}`,
      status: "empty",
      traitProfile: null,
      notes: ""
    })),
    selectedPuppySlotId: null,
    notes: ""
  };
}

export function generatePlanLineages(
  plan: BreedingPlan,
  canonicalLineages: readonly LineageProfile[]
): PlanLineageResult {
  const canonicalById = new Map(canonicalLineages.map((lineage) => [lineage.canineId, lineage]));
  const lineagesByPuppyId = new Map<string, LineageProfile>();
  const warnings: string[] = [];

  for (const step of plan.steps) {
    if (!step.sire || !step.dam) {
      warnings.push(`${step.label} is missing sire or dam.`);
      continue;
    }

    const sireLineage = resolveParentLineage(step.sire, canonicalById, lineagesByPuppyId);
    const damLineage = resolveParentLineage(step.dam, canonicalById, lineagesByPuppyId);

    if (!sireLineage || !damLineage) {
      warnings.push(`${step.label} references a missing parent lineage.`);
      continue;
    }

    for (const puppySlot of step.puppySlots) {
      lineagesByPuppyId.set(
        puppySlot.id,
        generateHypotheticalPuppyLineage(puppySlot.id, sireLineage, damLineage)
      );
    }
  }

  return {
    lineagesByPuppyId,
    warnings
  };
}

export function analyzeHistoryFlush(
  plannedPuppyLineage: LineageProfile,
  originPoolCanineIds: readonly CanineId[]
): HistoryFlushReport {
  const originIds = Array.from(new Set(originPoolCanineIds)).sort();
  const relationshipSet = buildRelationshipSet(plannedPuppyLineage);
  const originIdSet = new Set(originIds);
  const trackedOriginEntries = relationshipSet.filter((entry) => originIdSet.has(entry.canineId));
  const retainedOriginCanineIds = Array.from(
    new Set(trackedOriginEntries.map((entry) => entry.canineId))
  ).sort();
  const retainedIdSet = new Set(retainedOriginCanineIds);

  return {
    trackedOriginEntries,
    retainedOriginCanineIds,
    flushedOriginCanineIds: originIds.filter((canineId) => !retainedIdSet.has(canineId))
  };
}

function resolveParentLineage(
  parent: PlanParentReference,
  canonicalById: ReadonlyMap<CanineId, LineageProfile>,
  lineagesByPuppyId: ReadonlyMap<string, LineageProfile>
): LineageProfile | null {
  if (parent.kind === "canonical") {
    return canonicalById.get(parent.canineId) ?? null;
  }

  return lineagesByPuppyId.get(parent.puppyId) ?? null;
}
