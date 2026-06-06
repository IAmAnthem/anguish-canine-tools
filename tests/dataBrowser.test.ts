import { describe, expect, it } from "vitest";
import {
  defaultDataBrowserFilters,
  formatAppearance,
  getDataBrowserResult
} from "../src/app/dataBrowser.js";
import { createDataStore, type RepositoryData } from "../src/app/dataStore.js";

const browserData: RepositoryData = {
  canonical: {
    humans: [
      { id: "human-dave", displayName: "Dave", contact: null, status: "active" },
      { id: "human-jeanie", displayName: "Jeanie", contact: null, status: "active" }
    ],
    characters: [
      { id: "character-mulapin", name: "Mulapin", humanId: "human-dave", status: "active" },
      { id: "character-whap", name: "Whap", humanId: "human-jeanie", status: "active" }
    ],
    canines: [
      {
        id: "canine-ringo",
        externalIds: {},
        callName: "Ringo",
        displayName: "Mulapin Ringo 733/54",
        characterId: "character-mulapin",
        gender: "M",
        canineType: "fox",
        appearance: { primaryColor: "Black", secondaryColor: "Silver", eyeColor: "Turquoise" },
        status: "active"
      },
      {
        id: "canine-bunny",
        externalIds: {},
        callName: "Bunny",
        displayName: "Whap Bunny 1126",
        characterId: "character-whap",
        gender: "F",
        canineType: null,
        appearance: null,
        status: "active"
      }
    ],
    traitProfiles: [
      {
        canineId: "canine-ringo",
        status: "known",
        total: 733,
        traits: { Procreation: 54 }
      },
      {
        canineId: "canine-bunny",
        status: "summary",
        total: 1126,
        traits: { Procreation: { min: 80, max: 82 } }
      }
    ],
    lineageProfiles: [
      {
        canineId: "canine-ringo",
        sireId: null,
        damId: null,
        paternalGrandSireId: null,
        paternalGrandDamId: null,
        maternalGrandSireId: null,
        maternalGrandDamId: null
      },
      {
        canineId: "canine-bunny",
        sireId: "canine-ringo",
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

describe("data browser app model", () => {
  it("sorts canonical canines by total and Procreation", () => {
    const result = getDataBrowserResult(createDataStore(browserData), defaultDataBrowserFilters, "");

    expect(result.rows.map((row) => row.canine.id)).toEqual(["canine-bunny", "canine-ringo"]);
    expect(result.selected).toBeNull();
  });

  it("selects detail only when a visible canine id is selected", () => {
    const result = getDataBrowserResult(createDataStore(browserData), defaultDataBrowserFilters, "canine-bunny");

    expect(result.selected?.canine.id).toBe("canine-bunny");
  });

  it("filters by search, gender, human, and minimum scores", () => {
    const result = getDataBrowserResult(
      createDataStore(browserData),
      {
        ...defaultDataBrowserFilters,
        query: "mulapin black",
        gender: "M",
        humanId: "human-dave",
        minTotal: 700,
        minProcreation: 50
      },
      ""
    );

    expect(result.rows.map((row) => row.canine.id)).toEqual(["canine-ringo"]);
  });

  it("formats observed appearance without inventing hidden color data", () => {
    expect(formatAppearance(browserData.canonical.canines[0].appearance)).toBe(
      "primary Black, secondary Silver, eyes Turquoise"
    );
    expect(formatAppearance(null)).toBe("primary unknown, secondary unknown, eyes unknown");
  });

  it("filters by individual appearance fields and known appearance", () => {
    const result = getDataBrowserResult(
      createDataStore(browserData),
      {
        ...defaultDataBrowserFilters,
        primaryColor: "Black",
        secondaryColor: "Silver",
        eyeColor: "Turquoise",
        knownAppearanceOnly: true
      },
      ""
    );

    expect(result.rows.map((row) => row.canine.id)).toEqual(["canine-ringo"]);
  });
});
