import type { DataStore } from "./dataStore.js";
import { estimatePuppyBreedingValue, type PuppyBreedingEstimate, type TraitProfile } from "../domain/breeding/candidates.js";
import {
  analyzeHistoryFlush,
  createEmptyBreedingPlan,
  createPlannedPuppyId,
  generatePlanLineages,
  type BreedingPlan,
  type BreedingPlanStep,
  type HistoryFlushReport,
  type PlanParentReference
} from "../domain/plans/breedingPlan.js";
import { buildRelationshipSet, type LineageProfile } from "../domain/lineage/lineage.js";
import { traitNames, type TraitName } from "../domain/traits/traitNames.js";

export type MultiStepPlanStepView = {
  step: BreedingPlanStep;
  stepNumber: number;
  selectedPuppyId: string | null;
  selectedPuppyLabel: string;
  selectedPuppyGender: "M" | "F" | "U";
  selectedPuppyLineage: LineageProfile | null;
  carryForwardParentId: string | null;
  carryForwardParentLabel: string;
  carryForwardParentGender: "M" | "F" | "U";
  carryForwardParentLineage: LineageProfile | null;
  sireLabel: string;
  damLabel: string;
  flushReport: HistoryFlushReport | null;
  estimate: PuppyBreedingEstimate | null;
  estimateLabel: string;
  benchmarks: PlanStepBenchmarks | null;
};

export type PlanStepBenchmarks = {
  averageTotal: number | null;
  bestParentTotal: number | null;
};

export type ActualPuppyInput = {
  puppyId: string;
  label: string;
  gender: "M" | "F" | "U";
  pastedStats: string;
  notes: string;
};

export type MultiStepPlanOptions = {
  parentOverridesByStep?: Readonly<Record<string, PlanParentOverride>>;
  selectedPuppySlotByStep?: Readonly<Record<string, string>>;
  actualPuppiesById?: Readonly<Record<string, ActualPuppyInput>>;
};

export type PlanParentOverride = {
  sireId?: string;
  damId?: string;
};

export type MultiStepPlanViewModel = {
  plan: BreedingPlan;
  targetLineLabel: string;
  timeConstraintLabel: string;
  steps: MultiStepPlanStepView[];
  originPoolLabels: string[];
  finalStep: MultiStepPlanStepView | null;
  warnings: string[];
};

export type MultiStepPlanExport = {
  schemaVersion: 1;
  exportedAt: string;
  planId: string;
  planName: string;
  canonicalCanineIds: string[];
  parentOverridesByStep: Record<string, PlanParentOverride>;
  selectedPuppySlotByStep: Record<string, string>;
  actualPuppiesById: Record<string, ActualPuppyInput>;
};

export type MultiStepPlanImportResult = {
  exportData: MultiStepPlanExport | null;
  warnings: string[];
};

const defaultPlanId = "three-step-lift-demo";
const defaultStepParents = [
  {
    sireId: "canine-mulapin-ringo-733-54",
    damId: "canine-dirge-fluid-692-57"
  },
  {
    damId: "canine-treehugger-snickerz-744"
  },
  {
    damId: "canine-lullaby-sandman-722-57"
  }
] as const;

export function createDefaultMultiStepPlanViewModel(
  store: DataStore,
  options: MultiStepPlanOptions = {}
): MultiStepPlanViewModel {
  const plan = createDefaultThreeStepPlan(store, options.parentOverridesByStep);
  applyPlanSessionInputs(plan, options);
  const result = generatePlanLineages(plan, store.data.canonical.lineageProfiles as readonly LineageProfile[]);
  const { estimatesByPuppyId, benchmarksByStepId } = generatePlanEstimates(plan, store);
  const steps = plan.steps.map((step, index) => {
    const selectedPuppyId = step.selectedPuppySlotId;
    const selectedPuppy = selectedPuppyId ? result.lineagesByPuppyId.get(selectedPuppyId) : undefined;
    const estimate = selectedPuppyId ? estimatesByPuppyId.get(selectedPuppyId) ?? null : null;
    const actual = selectedPuppyId ? options.actualPuppiesById?.[selectedPuppyId] : undefined;
    const carryForwardParentId = getPlannedParentId(step);
    const carryForwardParentActual = carryForwardParentId
      ? options.actualPuppiesById?.[carryForwardParentId]
      : undefined;
    const carryForwardParentLineage = carryForwardParentId
      ? result.lineagesByPuppyId.get(carryForwardParentId)
      : undefined;

    return {
      step,
      stepNumber: index + 1,
      selectedPuppyId,
      selectedPuppyLabel:
        actual?.label.trim() || formatPlannedPuppyLabel(plan.id, selectedPuppyId, "No selected puppy"),
      selectedPuppyGender: actual?.gender ?? "U",
      selectedPuppyLineage: selectedPuppy ?? null,
      carryForwardParentId,
      carryForwardParentLabel:
        carryForwardParentActual?.label.trim() || formatPlannedPuppyLabel(plan.id, carryForwardParentId, "None"),
      carryForwardParentGender: carryForwardParentActual?.gender ?? "U",
      carryForwardParentLineage: carryForwardParentLineage ?? null,
      sireLabel: formatParentReference(step.sire, store, plan.id, options.actualPuppiesById),
      damLabel: formatParentReference(step.dam, store, plan.id, options.actualPuppiesById),
      flushReport: selectedPuppy ? analyzeHistoryFlush(selectedPuppy, plan.originPoolCanineIds) : null,
      estimate,
      estimateLabel: estimate ? formatEstimateLabel(estimate) : "unknown",
      benchmarks: benchmarksByStepId.get(step.id) ?? null
    };
  });

  return {
    plan,
    targetLineLabel: "Carry-forward gender run",
    timeConstraintLabel: "Mature female heat, pregnancy, litter birth, and puppy statting",
    steps,
    originPoolLabels: plan.originPoolCanineIds.map((canineId) => formatCanineLabel(canineId, store)),
    finalStep: steps.at(-1) ?? null,
    warnings: result.warnings
  };
}

function getPlannedParentId(step: BreedingPlanStep): string | null {
  for (const parent of [step.sire, step.dam]) {
    if (parent?.kind === "planned-puppy") {
      return parent.puppyId;
    }
  }

  return null;
}

function formatPlannedPuppyLabel(planId: string, puppyId: string | null | undefined, fallback: string): string {
  return puppyId ? puppyId.replace(`plan:${planId}:`, "") : fallback;
}

function createDefaultThreeStepPlan(
  store: DataStore,
  parentOverridesByStep: Readonly<Record<string, PlanParentOverride>> = {}
): BreedingPlan {
  const plan = createEmptyBreedingPlan(defaultPlanId, "Three-step population lift");
  const firstSireId =
    parentOverridesByStep["step-1"]?.sireId ??
    resolveCanonicalLineageId(store, defaultStepParents[0].sireId, [], "M");
  const firstDamId =
    parentOverridesByStep["step-1"]?.damId ??
    resolveCanonicalLineageId(
      store,
      defaultStepParents[0].damId,
      firstSireId ? [firstSireId] : [],
      "F",
      firstSireId ?? undefined
    );
  const startingWindowIds = collectStartingRelationshipWindowIds(
    store,
    [firstSireId, firstDamId].filter(isString)
  );
  const step2MateId =
    parentOverridesByStep["step-2"]?.damId ??
    resolveCanonicalLineageId(store, defaultStepParents[1].damId, startingWindowIds, "F");
  const step3MateId =
    parentOverridesByStep["step-3"]?.damId ??
    resolveCanonicalLineageId(
      store,
      defaultStepParents[2].damId,
      [...startingWindowIds, step2MateId].filter(isString),
      "F"
    );
  const step1PuppyId = createPlannedPuppyId(plan.id, 1, 1);
  const step2PuppyId = createPlannedPuppyId(plan.id, 2, 1);
  const step3PuppyId = createPlannedPuppyId(plan.id, 3, 1);

  plan.originPoolCanineIds = startingWindowIds;

  plan.steps[0].sire = firstSireId ? canonical(firstSireId) : null;
  plan.steps[0].dam = firstDamId ? canonical(firstDamId) : null;
  plan.steps[0].selectedPuppySlotId = step1PuppyId;
  plan.steps[0].notes = "Create the first lift litter and choose the best puppy in the current gender run.";

  plan.steps[1].sire = planned(step1PuppyId);
  plan.steps[1].dam = step2MateId ? canonical(step2MateId) : null;
  plan.steps[1].selectedPuppySlotId = step2PuppyId;
  plan.steps[1].notes = "Breed the selected Step 1 puppy forward through a clean opposite-gender mate.";

  plan.steps[2].sire = planned(step2PuppyId);
  plan.steps[2].dam = step3MateId ? canonical(step3MateId) : null;
  plan.steps[2].selectedPuppySlotId = step3PuppyId;
  plan.steps[2].notes = "Breed the selected Step 2 puppy forward so the starting history drops beyond the tracked window.";

  return plan;
}

function applyPlanSessionInputs(plan: BreedingPlan, options: MultiStepPlanOptions): void {
  for (const [index, step] of plan.steps.entries()) {
    const stepNumber = index + 1;
    const selectedPuppyId = options.selectedPuppySlotByStep?.[step.id] ?? step.selectedPuppySlotId;
    step.selectedPuppySlotId = selectedPuppyId;

    for (const puppySlot of step.puppySlots) {
      const actual = options.actualPuppiesById?.[puppySlot.id];
      const actualTraitProfile = actual ? parseActualPuppyStats(puppySlot.id, actual.pastedStats) : null;
      const hasActualStats = Boolean(actualTraitProfile);

      if (actual) {
        puppySlot.label = actual.label.trim() || puppySlot.label;
        puppySlot.notes = actual.notes;
        puppySlot.traitProfile = actualTraitProfile;
      }

      if (puppySlot.id === selectedPuppyId) {
        puppySlot.status = "selected";
      } else if (hasActualStats) {
        puppySlot.status = "statted";
      } else {
        puppySlot.status = "empty";
      }
    }

    if (stepNumber === 2 && plan.steps[0].selectedPuppySlotId) {
      applyCarryForwardParentRole(step, plan.steps[0].selectedPuppySlotId, options, "step-2");
    }

    if (stepNumber === 3 && plan.steps[1].selectedPuppySlotId) {
      applyCarryForwardParentRole(step, plan.steps[1].selectedPuppySlotId, options, "step-3");
    }
  }
}

function applyCarryForwardParentRole(
  step: BreedingPlanStep,
  carryForwardPuppyId: string,
  options: MultiStepPlanOptions,
  stepId: string
): void {
  const carryForwardGender = options.actualPuppiesById?.[carryForwardPuppyId]?.gender ?? "U";
  const override = options.parentOverridesByStep?.[stepId];

  if (carryForwardGender === "F") {
    step.sire = override?.sireId ? canonical(override.sireId) : step.sire?.kind === "canonical" ? step.sire : null;
    step.dam = planned(carryForwardPuppyId);
    return;
  }

  step.sire = planned(carryForwardPuppyId);
  step.dam = override?.damId ? canonical(override.damId) : step.dam?.kind === "canonical" ? step.dam : null;
}

export function parseActualPuppyStats(puppyId: string, pastedStats: string): TraitProfile | null {
  const traitValues: Partial<Record<TraitName, number>> = {};
  const traitNameByLowercase = new Map(traitNames.map((traitName) => [traitName.toLowerCase(), traitName]));
  let total: number | null = null;

  for (const line of pastedStats.split(/\r?\n/)) {
    const match = line.trim().match(/^(.+?)\s*:\s*(-?\d+)\s*$/);

    if (!match) {
      continue;
    }

    const label = match[1].trim().toLowerCase();
    const value = Number(match[2]);

    if (!Number.isFinite(value)) {
      continue;
    }

    if (label === "total" || label === "totals") {
      total = value;
      continue;
    }

    const traitName = traitNameByLowercase.get(label);
    if (traitName) {
      traitValues[traitName] = value;
    }
  }

  if (total === null && traitNames.every((traitName) => typeof traitValues[traitName] === "number")) {
    total = traitNames.reduce((sum, traitName) => sum + (traitValues[traitName] ?? 0), 0);
  }

  if (total === null && Object.keys(traitValues).length === 0) {
    return null;
  }

  return {
    canineId: puppyId,
    status: "statted",
    total,
    traits: traitValues
  };
}

function generatePlanEstimates(
  plan: BreedingPlan,
  store: DataStore
): {
  estimatesByPuppyId: ReadonlyMap<string, PuppyBreedingEstimate>;
  benchmarksByStepId: ReadonlyMap<string, PlanStepBenchmarks>;
} {
  const estimatesByPuppyId = new Map<string, PuppyBreedingEstimate>();
  const benchmarksByStepId = new Map<string, PlanStepBenchmarks>();
  const profilesByPlannedPuppyId = new Map<string, TraitProfile>();

  for (const step of plan.steps) {
    if (!step.sire || !step.dam) {
      continue;
    }

    const sireProfile = resolveParentTraitProfile(step.sire, store, profilesByPlannedPuppyId);
    const damProfile = resolveParentTraitProfile(step.dam, store, profilesByPlannedPuppyId);

    if (!sireProfile || !damProfile) {
      continue;
    }

    const estimate = estimatePuppyBreedingValue(sireProfile, damProfile);
    benchmarksByStepId.set(step.id, {
      averageTotal: estimate.traitTotal,
      bestParentTotal: maxNullable(midpoint(sireProfile.total), midpoint(damProfile.total))
    });

    for (const puppySlot of step.puppySlots) {
      estimatesByPuppyId.set(puppySlot.id, estimate);
      profilesByPlannedPuppyId.set(
        puppySlot.id,
        puppySlot.traitProfile ?? {
          canineId: puppySlot.id,
          status: "estimate",
          total: estimate.traitTotal,
          traits: {
            Procreation: estimate.procreation
          }
        }
      );
    }
  }

  return {
    estimatesByPuppyId,
    benchmarksByStepId
  };
}

export function createMultiStepPlanExport(
  store: DataStore,
  options: MultiStepPlanOptions,
  exportedAt = new Date().toISOString()
): MultiStepPlanExport {
  const plan = createDefaultThreeStepPlan(store, options.parentOverridesByStep);
  applyPlanSessionInputs(plan, options);

  return {
    schemaVersion: 1,
    exportedAt,
    planId: plan.id,
    planName: plan.name,
    canonicalCanineIds: collectPlanCanonicalCanineIds(plan),
    parentOverridesByStep: { ...(options.parentOverridesByStep ?? {}) },
    selectedPuppySlotByStep: { ...(options.selectedPuppySlotByStep ?? {}) },
    actualPuppiesById: { ...(options.actualPuppiesById ?? {}) }
  };
}

export function parseMultiStepPlanExportText(text: string): MultiStepPlanImportResult {
  try {
    const parsed = JSON.parse(text) as unknown;
    return coerceMultiStepPlanExport(parsed);
  } catch (error) {
    return {
      exportData: null,
      warnings: [`Import JSON could not be parsed: ${error instanceof Error ? error.message : "unknown error"}.`]
    };
  }
}

export function validateMultiStepPlanExport(store: DataStore, exportData: MultiStepPlanExport): string[] {
  const warnings: string[] = [];
  const currentPlan = createDefaultThreeStepPlan(store, exportData.parentOverridesByStep);
  const knownPuppyIds = new Set(currentPlan.steps.flatMap((step) => step.puppySlots.map((slot) => slot.id)));
  const knownStepIds = new Set(currentPlan.steps.map((step) => step.id));

  if (exportData.planId !== currentPlan.id) {
    warnings.push(`Imported plan id ${exportData.planId} does not match current plan id ${currentPlan.id}.`);
  }

  for (const canineId of exportData.canonicalCanineIds) {
    if (!store.caninesById.has(canineId)) {
      warnings.push(`Imported plan references missing canonical canine ${canineId}.`);
    }
  }

  for (const [stepId, override] of Object.entries(exportData.parentOverridesByStep)) {
    if (!knownStepIds.has(stepId)) {
      warnings.push(`Imported plan references missing parent-picker step ${stepId}.`);
    }

    for (const canineId of [override.sireId, override.damId]) {
      if (canineId && !store.caninesById.has(canineId)) {
        warnings.push(`Imported plan parent picker references missing canonical canine ${canineId}.`);
      }
    }
  }

  for (const [stepId, puppyId] of Object.entries(exportData.selectedPuppySlotByStep)) {
    if (!knownStepIds.has(stepId)) {
      warnings.push(`Imported plan references missing step ${stepId}.`);
    }

    if (!knownPuppyIds.has(puppyId)) {
      warnings.push(`Imported plan selects missing planned puppy ${puppyId}.`);
    }
  }

  for (const puppyId of Object.keys(exportData.actualPuppiesById)) {
    if (!knownPuppyIds.has(puppyId)) {
      warnings.push(`Imported plan has actual stats for missing planned puppy ${puppyId}.`);
    }
  }

  return warnings;
}

function resolveParentTraitProfile(
  parent: PlanParentReference,
  store: DataStore,
  profilesByPlannedPuppyId: ReadonlyMap<string, TraitProfile>
): TraitProfile | null {
  if (parent.kind === "planned-puppy") {
    return profilesByPlannedPuppyId.get(parent.puppyId) ?? null;
  }

  return (store.traitProfilesByCanineId.get(parent.canineId) as TraitProfile | undefined) ?? null;
}

function resolveCanonicalLineageId(
  store: DataStore,
  preferredCanineId: string,
  excludedCanineIds: readonly string[] = [],
  requiredGender?: "M" | "F",
  avoidSameHumanWithCanineId?: string
): string | null {
  const excluded = new Set(excludedCanineIds);

  if (
    hasUsablePlanningRecord(store, preferredCanineId, requiredGender) &&
    !excluded.has(preferredCanineId) &&
    !areSameConcreteHuman(store, preferredCanineId, avoidSameHumanWithCanineId)
  ) {
    return preferredCanineId;
  }

  return (
    store.data.canonical.traitProfiles
      .filter((profile) => !excluded.has(profile.canineId))
      .filter((profile) => hasUsablePlanningRecord(store, profile.canineId, requiredGender))
      .filter((profile) => !areSameConcreteHuman(store, profile.canineId, avoidSameHumanWithCanineId))
      .sort((left, right) => numericValue(right.total) - numericValue(left.total))[0]?.canineId ?? null
  );
}

function hasUsablePlanningRecord(store: DataStore, canineId: string, requiredGender?: "M" | "F"): boolean {
  const canine = store.caninesById.get(canineId);
  const profile = store.traitProfilesByCanineId.get(canineId);

  return (
    Boolean(canine && canine.id !== "canine-an-untraited-canine") &&
    (!requiredGender || canine?.gender === requiredGender) &&
    store.lineageProfilesByCanineId.has(canineId) &&
    typeof profile?.total === "number" &&
    typeof profile.traits?.Procreation === "number"
  );
}

function areSameConcreteHuman(store: DataStore, leftCanineId: string, rightCanineId: string | undefined): boolean {
  if (!rightCanineId) {
    return false;
  }

  const leftHumanId = getHumanIdForCanine(store, leftCanineId);
  const rightHumanId = getHumanIdForCanine(store, rightCanineId);

  return (
    Boolean(leftHumanId && rightHumanId) &&
    leftHumanId !== "human-anyone" &&
    leftHumanId !== "human-unknown" &&
    leftHumanId === rightHumanId
  );
}

function getHumanIdForCanine(store: DataStore, canineId: string): string | null {
  const canine = store.caninesById.get(canineId);
  const character = canine ? store.charactersById.get(canine.characterId) : undefined;
  return character?.humanId ?? null;
}

function numericValue(value: unknown): number {
  return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
}

function midpoint(value: TraitProfile["total"] | undefined): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    return (value.min + value.max) / 2;
  }

  return null;
}

function maxNullable(left: number | null, right: number | null): number | null {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return Math.max(left, right);
}

function collectPlanCanonicalCanineIds(plan: BreedingPlan): string[] {
  const canineIds = new Set(plan.originPoolCanineIds);

  for (const step of plan.steps) {
    for (const parent of [step.sire, step.dam]) {
      if (parent?.kind === "canonical") {
        canineIds.add(parent.canineId);
      }
    }
  }

  return Array.from(canineIds).sort();
}

function coerceMultiStepPlanExport(value: unknown): MultiStepPlanImportResult {
  const warnings: string[] = [];

  if (!value || typeof value !== "object") {
    return {
      exportData: null,
      warnings: ["Import JSON must be an object."]
    };
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    warnings.push("Import JSON schemaVersion is not 1.");
  }

  const exportData: MultiStepPlanExport = {
    schemaVersion: 1,
    exportedAt: typeof record.exportedAt === "string" ? record.exportedAt : "",
    planId: typeof record.planId === "string" ? record.planId : "",
    planName: typeof record.planName === "string" ? record.planName : "",
    canonicalCanineIds: coerceStringArray(record.canonicalCanineIds),
    parentOverridesByStep: coerceParentOverrideRecord(record.parentOverridesByStep),
    selectedPuppySlotByStep: coerceStringRecord(record.selectedPuppySlotByStep),
    actualPuppiesById: coerceActualPuppyRecord(record.actualPuppiesById)
  };

  if (!exportData.planId) {
    warnings.push("Import JSON is missing planId.");
  }

  return {
    exportData,
    warnings
  };
}

function coerceParentOverrideRecord(value: unknown): Record<string, PlanParentOverride> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const overrides: Record<string, PlanParentOverride> = {};

  for (const [stepId, rawOverride] of Object.entries(value as Record<string, unknown>)) {
    if (!rawOverride || typeof rawOverride !== "object") {
      continue;
    }

    const override = rawOverride as Record<string, unknown>;
    overrides[stepId] = {
      sireId: typeof override.sireId === "string" ? override.sireId : undefined,
      damId: typeof override.damId === "string" ? override.damId : undefined
    };
  }

  return overrides;
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function coerceStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function coerceActualPuppyRecord(value: unknown): Record<string, ActualPuppyInput> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const actuals: Record<string, ActualPuppyInput> = {};

  for (const [puppyId, rawActual] of Object.entries(value as Record<string, unknown>)) {
    if (!rawActual || typeof rawActual !== "object") {
      continue;
    }

    const actual = rawActual as Record<string, unknown>;
    actuals[puppyId] = {
      puppyId,
      label: typeof actual.label === "string" ? actual.label : "",
      gender: actual.gender === "M" || actual.gender === "F" ? actual.gender : "U",
      pastedStats: typeof actual.pastedStats === "string" ? actual.pastedStats : "",
      notes: typeof actual.notes === "string" ? actual.notes : ""
    };
  }

  return actuals;
}

function collectStartingRelationshipWindowIds(store: DataStore, canineIds: readonly string[]): string[] {
  const visibleIds = new Set<string>();

  for (const canineId of canineIds) {
    const lineage = store.lineageProfilesByCanineId.get(canineId);

    if (!lineage) {
      visibleIds.add(canineId);
      continue;
    }

    for (const entry of buildRelationshipSet(lineage)) {
      visibleIds.add(entry.canineId);
    }
  }

  return Array.from(visibleIds).sort();
}

function canonical(canineId: string): PlanParentReference {
  return {
    kind: "canonical",
    canineId
  };
}

function planned(puppyId: string): PlanParentReference {
  return {
    kind: "planned-puppy",
    puppyId
  };
}

function formatParentReference(
  parent: PlanParentReference | null,
  store: DataStore,
  planId = defaultPlanId,
  actualPuppiesById: Readonly<Record<string, ActualPuppyInput>> = {}
): string {
  if (!parent) {
    return "Unselected";
  }

  if (parent.kind === "canonical") {
    return formatCanineLabel(parent.canineId, store);
  }

  return actualPuppiesById[parent.puppyId]?.label.trim() || formatPlannedPuppyLabel(planId, parent.puppyId, "Unknown puppy");
}

function formatCanineLabel(canineId: string, store: DataStore): string {
  return store.caninesById.get(canineId)?.displayName ?? canineId;
}

function formatEstimateLabel(estimate: PuppyBreedingEstimate): string {
  return `${formatEstimateNumber(estimate.traitTotal)} / ${formatEstimateNumber(estimate.procreation)}`;
}

function formatEstimateNumber(value: number | null): string {
  return value === null ? "unknown" : Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}
