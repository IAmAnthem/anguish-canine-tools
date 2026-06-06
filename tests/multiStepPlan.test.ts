import { describe, expect, it } from "vitest";
import { createDataStore } from "../src/app/dataStore.js";
import {
  createDefaultMultiStepPlanViewModel,
  createMultiStepPlanExport,
  parseActualPuppyStats,
  parseMultiStepPlanExportText,
  validateMultiStepPlanExport
} from "../src/app/multiStepPlan.js";

const pastedPuppyStats = [
  "Puppy 4 Male",
  "Alertness : 29",
  "Appetite : 45",
  "Brutality : 32",
  "Development : 43",
  "Eluding : 53",
  "Energy : 29",
  "Evasion : 56",
  "Ferocity : 51",
  "Fortitude : 46",
  "Insight : 34",
  "Might : 40",
  "Nimbleness : 53",
  "Patience : 35",
  "Procreation : 52",
  "Sufficiency : 36",
  "Targeting : 40",
  "Toughness : 49",
  "TOTALS : 723"
].join("\n");

describe("multi-step plan app model", () => {
  it("builds a three-step view model with the final starting history window flushed", () => {
    const viewModel = createDefaultMultiStepPlanViewModel(createDataStore());

    expect(viewModel.steps).toHaveLength(3);
    expect(viewModel.originPoolLabels.length).toBeGreaterThan(2);
    expect(viewModel.warnings).toEqual([]);
    expect(viewModel.targetLineLabel).toBe("Carry-forward gender run");
    expect(viewModel.timeConstraintLabel).toBe(
      "Mature female heat, pregnancy, litter birth, and puppy statting"
    );
    expect(viewModel.steps.map((step) => step.estimateLabel)).not.toContain("unknown");
    expect(viewModel.steps[0].benchmarks?.averageTotal).toBeGreaterThan(0);
    expect(viewModel.steps[0].benchmarks?.bestParentTotal).toBeGreaterThan(0);
    expect(viewModel.finalStep?.flushReport?.retainedOriginCanineIds).toEqual([]);
    expect(viewModel.finalStep?.flushReport?.flushedOriginCanineIds).toHaveLength(viewModel.originPoolLabels.length);
  });

  it("uses a selected actual puppy as the parent for the next step estimate", () => {
    const viewModel = createDefaultMultiStepPlanViewModel(createDataStore(), {
      selectedPuppySlotByStep: {
        "step-1": "plan:three-step-lift-demo:step-1:puppy-2"
      },
      actualPuppiesById: {
        "plan:three-step-lift-demo:step-1:puppy-2": {
          puppyId: "plan:three-step-lift-demo:step-1:puppy-2",
          label: "Step 1 actual male",
          gender: "M",
          pastedStats: pastedPuppyStats,
          notes: "keeper"
        }
      }
    });

    expect(viewModel.steps[0].selectedPuppyLabel).toBe("Step 1 actual male");
    expect(viewModel.steps[1].carryForwardParentId).toBe("plan:three-step-lift-demo:step-1:puppy-2");
    expect(viewModel.steps[1].carryForwardParentLabel).toBe("Step 1 actual male");
    expect(viewModel.steps[1].carryForwardParentGender).toBe("M");
    expect(viewModel.steps[1].sireLabel).toBe("Step 1 actual male");
    expect(viewModel.steps[1].estimateLabel).not.toBe("920.8 / 77.3");
    expect(viewModel.steps[1].benchmarks?.bestParentTotal).toBeGreaterThanOrEqual(723);
  });

  it("uses a female selected puppy as dam and expects a male mate in the next step", () => {
    const viewModel = createDefaultMultiStepPlanViewModel(createDataStore(), {
      parentOverridesByStep: {
        "step-2": {
          sireId: "canine-ballad-fireball-730-55"
        }
      },
      selectedPuppySlotByStep: {
        "step-1": "plan:three-step-lift-demo:step-1:puppy-2"
      },
      actualPuppiesById: {
        "plan:three-step-lift-demo:step-1:puppy-2": {
          puppyId: "plan:three-step-lift-demo:step-1:puppy-2",
          label: "Step 1 actual female",
          gender: "F",
          pastedStats: pastedPuppyStats,
          notes: "keeper"
        }
      }
    });

    expect(viewModel.steps[0].selectedPuppyGender).toBe("F");
    expect(viewModel.steps[1].carryForwardParentId).toBe("plan:three-step-lift-demo:step-1:puppy-2");
    expect(viewModel.steps[1].carryForwardParentLabel).toBe("Step 1 actual female");
    expect(viewModel.steps[1].carryForwardParentGender).toBe("F");
    expect(viewModel.steps[1].sireLabel).toBe("Ballad Fireball 730/55");
    expect(viewModel.steps[1].damLabel).toBe("Step 1 actual female");
  });

  it("parses MUD-style pasted puppy stats into a trait profile", () => {
    expect(parseActualPuppyStats("puppy-4", pastedPuppyStats)).toMatchObject({
      canineId: "puppy-4",
      total: 723,
      traits: {
        Alertness: 29,
        Procreation: 52,
        Toughness: 49
      }
    });
  });

  it("exports and imports local plan session JSON", () => {
    const store = createDataStore();
    const exportData = createMultiStepPlanExport(
      store,
      {
        parentOverridesByStep: {
          "step-1": {
            sireId: "canine-ballad-fireball-730-55",
            damId: "canine-dirge-fluid-692-57"
          }
        },
        selectedPuppySlotByStep: {
          "step-1": "plan:three-step-lift-demo:step-1:puppy-2"
        },
        actualPuppiesById: {
          "plan:three-step-lift-demo:step-1:puppy-2": {
            puppyId: "plan:three-step-lift-demo:step-1:puppy-2",
            label: "Step 1 actual male",
            gender: "M",
            pastedStats: pastedPuppyStats,
            notes: "keeper"
          }
        }
      },
      "2026-06-05T12:00:00.000Z"
    );
    const imported = parseMultiStepPlanExportText(JSON.stringify(exportData));

    expect(imported.warnings).toEqual([]);
    expect(imported.exportData).toMatchObject({
      schemaVersion: 1,
      exportedAt: "2026-06-05T12:00:00.000Z",
      parentOverridesByStep: {
        "step-1": {
          sireId: "canine-ballad-fireball-730-55",
          damId: "canine-dirge-fluid-692-57"
        }
      },
      selectedPuppySlotByStep: {
        "step-1": "plan:three-step-lift-demo:step-1:puppy-2"
      }
    });
    expect(imported.exportData && validateMultiStepPlanExport(store, imported.exportData)).toEqual([]);
  });

  it("warns when imported plan JSON references missing canonical canines", () => {
    const store = createDataStore();
    const exportData = createMultiStepPlanExport(store, {}, "2026-06-05T12:00:00.000Z");

    expect(
      validateMultiStepPlanExport(store, {
        ...exportData,
        canonicalCanineIds: [...exportData.canonicalCanineIds, "canine-missing"]
      })
    ).toContain("Imported plan references missing canonical canine canine-missing.");
  });

  it("uses parent picker overrides to rebuild the starting history window", () => {
    const viewModel = createDefaultMultiStepPlanViewModel(createDataStore(), {
      parentOverridesByStep: {
        "step-1": {
          sireId: "canine-ballad-fireball-730-55",
          damId: "canine-dirge-fluid-692-57"
        }
      }
    });

    expect(viewModel.steps[0].sireLabel).toBe("Ballad Fireball 730/55");
    expect(viewModel.steps[0].damLabel).toBe("Dirge Fluid 692/57");
    expect(viewModel.originPoolLabels).toContain("Ballad Fireball 730/55");
    expect(viewModel.originPoolLabels).not.toContain("Mulapin Ringo 733/54");
  });
});
