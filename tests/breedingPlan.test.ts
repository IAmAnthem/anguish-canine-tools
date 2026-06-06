import { describe, expect, it } from "vitest";
import {
  analyzeHistoryFlush,
  createEmptyBreedingPlan,
  createPlannedPuppyId,
  generatePlanLineages,
  type BreedingPlan,
  type PlanParentReference
} from "../src/domain/plans/breedingPlan.js";
import type { LineageProfile } from "../src/domain/lineage/lineage.js";

const canonicalLineages: LineageProfile[] = [
  lineage("pool-sire", "pool-sire-father", "pool-sire-mother"),
  lineage("pool-dam", "pool-dam-father", "pool-dam-mother"),
  lineage("step2-mate", "step2-mate-father", "step2-mate-mother"),
  lineage("step3-mate", "step3-mate-father", "step3-mate-mother")
];

function lineage(canineId: string, sireId: string | null, damId: string | null): LineageProfile {
  return {
    canineId,
    sireId,
    damId,
    paternalGrandSireId: null,
    paternalGrandDamId: null,
    maternalGrandSireId: null,
    maternalGrandDamId: null
  };
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

function threeStepPlan(): BreedingPlan {
  const plan = createEmptyBreedingPlan("pom-lift", "Pom three-step lift");
  const step1Puppy = createPlannedPuppyId(plan.id, 1, 1);
  const step2Puppy = createPlannedPuppyId(plan.id, 2, 1);

  plan.originPoolCanineIds = ["pool-sire", "pool-dam"];
  plan.steps[0].sire = canonical("pool-sire");
  plan.steps[0].dam = canonical("pool-dam");
  plan.steps[0].selectedPuppySlotId = step1Puppy;
  plan.steps[1].sire = planned(step1Puppy);
  plan.steps[1].dam = canonical("step2-mate");
  plan.steps[1].selectedPuppySlotId = step2Puppy;
  plan.steps[2].sire = planned(step2Puppy);
  plan.steps[2].dam = canonical("step3-mate");

  return plan;
}

describe("multi-step breeding plan domain", () => {
  it("creates local-only planned puppy IDs and six slots per step by default", () => {
    const plan = createEmptyBreedingPlan("pom-lift", "Pom three-step lift");

    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0].puppySlots).toHaveLength(6);
    expect(plan.steps[0].puppySlots[0]).toMatchObject({
      id: "plan:pom-lift:step-1:puppy-1",
      label: "Puppy 1",
      status: "empty",
      traitProfile: null
    });
  });

  it("generates chained planned puppy lineages across three steps", () => {
    const plan = threeStepPlan();
    const result = generatePlanLineages(plan, canonicalLineages);

    expect(result.warnings).toEqual([]);
    expect(result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 1, 1))).toMatchObject({
      sireId: "pool-sire",
      damId: "pool-dam"
    });
    expect(result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 2, 1))).toMatchObject({
      sireId: createPlannedPuppyId(plan.id, 1, 1),
      damId: "step2-mate",
      paternalGrandSireId: "pool-sire",
      paternalGrandDamId: "pool-dam"
    });
    expect(result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 3, 1))).toMatchObject({
      sireId: createPlannedPuppyId(plan.id, 2, 1),
      damId: "step3-mate",
      paternalGrandSireId: createPlannedPuppyId(plan.id, 1, 1),
      paternalGrandDamId: "step2-mate"
    });
  });

  it("shows original pool pets flushing out of the tracked relationship window by step three", () => {
    const plan = threeStepPlan();
    const result = generatePlanLineages(plan, canonicalLineages);
    const step1 = result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 1, 1));
    const step2 = result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 2, 1));
    const step3 = result.lineagesByPuppyId.get(createPlannedPuppyId(plan.id, 3, 1));

    expect(step1 && analyzeHistoryFlush(step1, plan.originPoolCanineIds)).toMatchObject({
      retainedOriginCanineIds: ["pool-dam", "pool-sire"],
      flushedOriginCanineIds: []
    });
    expect(step2 && analyzeHistoryFlush(step2, plan.originPoolCanineIds)).toMatchObject({
      retainedOriginCanineIds: ["pool-dam", "pool-sire"],
      flushedOriginCanineIds: []
    });
    expect(step3 && analyzeHistoryFlush(step3, plan.originPoolCanineIds)).toMatchObject({
      retainedOriginCanineIds: [],
      flushedOriginCanineIds: ["pool-dam", "pool-sire"]
    });
  });

  it("warns when a chained step references a missing planned puppy", () => {
    const plan = createEmptyBreedingPlan("broken", "Broken plan");
    plan.steps[0].sire = planned("plan:broken:step-0:puppy-1");
    plan.steps[0].dam = canonical("step2-mate");

    expect(generatePlanLineages(plan, canonicalLineages).warnings).toEqual([
      "Step 1 references a missing parent lineage.",
      "Step 2 is missing sire or dam.",
      "Step 3 is missing sire or dam."
    ]);
  });
});
