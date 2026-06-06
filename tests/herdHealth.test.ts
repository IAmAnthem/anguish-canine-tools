import { describe, expect, it } from "vitest";
import { createDataStore, type RepositoryData } from "../src/app/dataStore.js";
import { createHerdHealthReport } from "../src/app/herdHealth.js";

const baseReferenceData = {
  collars: [],
  comparisonRanges: []
};

describe("createHerdHealthReport", () => {
  it("summarizes active pool coverage and relatedness pressure", () => {
    const store = createDataStore({
      canonical: {
        humans: [
          { id: "human-a", displayName: "A", contact: null, status: "active" },
          { id: "human-b", displayName: "B", contact: null, status: "active" }
        ],
        characters: [
          { id: "character-a", name: "A", humanId: "human-a", status: "active" },
          { id: "character-b", name: "B", humanId: "human-b", status: "active" },
          { id: "character-c", name: "C", humanId: "human-b", status: "active" },
          { id: "character-d", name: "D", humanId: "human-b", status: "active" }
        ],
        canines: [
          createCanine("sire-1", "Sire 1", "character-a", "M", "inactive"),
          createCanine("dam-1", "Dam 1", "character-b", "F", "inactive"),
          createCanine("active-male", "Active Male", "character-a", "M", "active"),
          createCanine("active-female-related", "Active Female Related", "character-b", "F", "active"),
          createCanine("active-female-clear", "Active Female Clear", "character-c", "F", "active"),
          createCanine("old-record", "Old Record", "character-d", "F", "unknown")
        ],
        traitProfiles: [
          createTraitProfile("active-male", 700, 50),
          createTraitProfile("active-female-related", 800, 60),
          createTraitProfile("active-female-clear", 900, 70)
        ],
        lineageProfiles: [
          createLineage("sire-1"),
          createLineage("dam-1"),
          createLineage("active-male", "sire-1", "dam-1"),
          createLineage("active-female-related", "sire-1", null),
          createLineage("active-female-clear")
        ],
        sourceObservations: []
      },
      reference: baseReferenceData
    } satisfies RepositoryData);

    const report = createHerdHealthReport(store);

    expect(report.overview.activeCanines).toBe(3);
    expect(report.overview.unknownStatusCanines).toBe(1);
    expect(report.overview.averageTotal).toBe(800);
    expect(report.relatednessPressure.comparablePairs).toBe(3);
    expect(report.relatednessPressure.relatedPairs).toBe(1);
    expect(report.overusedAncestors[0]).toMatchObject({
      canineId: "sire-1",
      descendantCount: 2
    });
    expect(report.lowMateOptions.find((option) => option.summary.canine.id === "active-female-related")).toMatchObject({
      safeMateCount: 0,
      possibleMateCount: 1
    });
    expect(report.lowMateOptions.find((option) => option.summary.canine.id === "active-male")).toMatchObject({
      safeMateCount: 1,
      possibleMateCount: 2
    });
  });
});

function createCanine(id: string, displayName: string, characterId: string, gender: string, status: string) {
  return {
    id,
    externalIds: {},
    callName: displayName,
    displayName,
    characterId,
    gender,
    canineType: null,
    appearance: null,
    status
  };
}

function createTraitProfile(canineId: string, total: number, procreation: number) {
  return {
    canineId,
    status: "known",
    total,
    traits: {
      Procreation: procreation
    }
  };
}

function createLineage(canineId: string, sireId: string | null = null, damId: string | null = null) {
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
