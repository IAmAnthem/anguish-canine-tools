import { describe, expect, it } from "vitest";
import { createDataStore, formatValue, loadRepositoryData, type RepositoryData } from "../src/app/dataStore.js";

const baseData: RepositoryData = {
  canonical: {
    humans: [{ id: "human-dave", displayName: "Dave", contact: null, status: "active" }],
    characters: [{ id: "character-mulapin", name: "Mulapin", humanId: "human-dave", status: "active" }],
    canines: [
      {
        id: "canine-a",
        externalIds: {},
        callName: "A",
        displayName: "Mulapin A 900/80",
        characterId: "character-mulapin",
        gender: "F",
        canineType: null,
        appearance: null,
        status: "active"
      },
      {
        id: "canine-b",
        externalIds: {},
        callName: "B",
        displayName: "Mulapin B 875/90",
        characterId: "character-mulapin",
        gender: "M",
        canineType: null,
        appearance: null,
        status: "inactive"
      }
    ],
    traitProfiles: [
      {
        canineId: "canine-a",
        status: "known",
        total: 900,
        traits: { Procreation: 80 }
      },
      {
        canineId: "canine-b",
        status: "known",
        total: 875,
        traits: { Procreation: { min: 89, max: 90 } }
      }
    ],
    lineageProfiles: [
      {
        canineId: "canine-a",
        sireId: null,
        damId: null,
        paternalGrandSireId: null,
        paternalGrandDamId: null,
        maternalGrandSireId: null,
        maternalGrandDamId: null
      },
      {
        canineId: "canine-b",
        sireId: null,
        damId: null,
        paternalGrandSireId: null,
        paternalGrandDamId: null,
        maternalGrandSireId: null,
        maternalGrandDamId: null
      }
    ],
    sourceObservations: []
  },
  reference: {
    collars: [],
    comparisonRanges: []
  }
};

describe("data store", () => {
  it("loads repository data with passing integrity checks", () => {
    const store = createDataStore(loadRepositoryData());

    expect(store.integrity).toEqual({ isValid: true, errors: [] });
    expect(store.stats.canines).toBeGreaterThan(0);
    expect(store.stats.knownTraitProfiles).toBeGreaterThan(0);
    expect(store.stats.collarReferences).toBeGreaterThan(0);
  });

  it("joins canine, character, human, traits, and lineage into a summary", () => {
    const store = createDataStore(baseData);

    expect(store.getCanineSummary("canine-a")).toMatchObject({
      canine: { displayName: "Mulapin A 900/80" },
      character: { name: "Mulapin" },
      human: { displayName: "Dave" },
      totalLabel: "900",
      procreationLabel: "80"
    });
  });

  it("returns top known canines by numeric total score", () => {
    const store = createDataStore(baseData);

    expect(store.getTopKnownCanines(1).map((summary) => summary.canine.id)).toEqual(["canine-a"]);
  });

  it("formats unknown, single, and range values", () => {
    expect(formatValue(undefined)).toBe("unknown");
    expect(formatValue(null)).toBe("unknown");
    expect(formatValue(80)).toBe("80");
    expect(formatValue({ min: 89, max: 90 })).toBe("89-90");
    expect(formatValue({ min: 90, max: 90 })).toBe("90");
  });
});
