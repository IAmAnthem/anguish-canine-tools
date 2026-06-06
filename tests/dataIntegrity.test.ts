import collars from "../data/reference/collars.json" with { type: "json" };
import comparisonRanges from "../data/reference/comparison-ranges.json" with { type: "json" };
import canines from "../data/canonical/canines.json" with { type: "json" };
import characters from "../data/canonical/characters.json" with { type: "json" };
import humans from "../data/canonical/humans.json" with { type: "json" };
import lineageProfiles from "../data/canonical/lineage-profiles.json" with { type: "json" };
import traitProfiles from "../data/canonical/trait-profiles.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  validateAllData,
  validateActiveCanineOwnership,
  validateCanonicalData,
  validateReferenceData,
  type CanonicalDataSet,
  type ReferenceDataSet
} from "../src/domain/dataIntegrity.js";

const canonicalData = {
  humans,
  characters,
  canines,
  traitProfiles,
  lineageProfiles
} as CanonicalDataSet;

const referenceData = {
  collars,
  comparisonRanges
} as ReferenceDataSet;

describe("data integrity checks", () => {
  it("validates canonical and reference data from the repository", () => {
    expect(validateAllData(canonicalData, referenceData)).toEqual({
      isValid: true,
      errors: []
    });
  });

  it("reports duplicate IDs", () => {
    expect(
      validateCanonicalData({
        ...canonicalData,
        humans: [{ id: "human-dave" }, { id: "human-dave" }],
        characters: [],
        canines: [],
        traitProfiles: [],
        lineageProfiles: []
      })
    ).toEqual({
      isValid: false,
      errors: ["Human duplicate id 'human-dave'."]
    });
  });

  it("reports broken canonical references", () => {
    expect(
      validateCanonicalData({
        humans: [],
        characters: [{ id: "character-missing-human", humanId: "human-missing" }],
        canines: [{ id: "canine-missing-character", characterId: "character-missing" }],
        traitProfiles: [{ canineId: "canine-missing-traits" }],
        lineageProfiles: [
          {
            canineId: "canine-missing-lineage",
            sireId: "canine-missing-sire",
            damId: null,
            paternalGrandSireId: null,
            paternalGrandDamId: null,
            maternalGrandSireId: null,
            maternalGrandDamId: null
          }
        ]
      })
    ).toEqual({
      isValid: false,
      errors: [
        "Character 'character-missing-human' references missing humanId 'human-missing'.",
        "Canine 'canine-missing-character' references missing characterId 'character-missing'.",
        "Trait profile 'canine-missing-traits' references missing canineId 'canine-missing-traits'.",
        "Lineage profile 'canine-missing-lineage' references missing canineId 'canine-missing-lineage'.",
        "Lineage profile 'canine-missing-lineage' references missing sireId 'canine-missing-sire'."
      ]
    });
  });

  it("allows null lineage parent and grandparent references", () => {
    expect(
      validateCanonicalData({
        humans: [{ id: "human-a" }],
        characters: [{ id: "character-a", humanId: "human-a" }],
        canines: [{ id: "canine-a", characterId: "character-a" }],
        traitProfiles: [],
        lineageProfiles: [
          {
            canineId: "canine-a",
            sireId: null,
            damId: null,
            paternalGrandSireId: null,
            paternalGrandDamId: null,
            maternalGrandSireId: null,
            maternalGrandDamId: null
          }
        ]
      })
    ).toEqual({
      isValid: true,
      errors: []
    });
  });

  it("reports multiple active canines owned by the same character", () => {
    expect(
      validateActiveCanineOwnership([
        { id: "canine-a", characterId: "character-a", status: "active" },
        { id: "canine-b", characterId: "character-a", status: "active" },
        { id: "canine-c", characterId: "character-a", status: "inactive" }
      ])
    ).toEqual({
      isValid: false,
      errors: ["Character 'character-a' has multiple active canines: canine-a, canine-b."]
    });
  });

  it("reports malformed reference data", () => {
    expect(
      validateReferenceData({
        collars: [
          {
            gem: "Red",
            kind: "birth",
            trait: null,
            activation: "during-breeding",
            wearer: "unique-pet",
            effect: "Wrong timing."
          }
        ],
        comparisonRanges: [
          { text: "similar", min: 0, max: 0 },
          { text: "similar", min: 0, max: 0 },
          { text: "", min: 10, max: 1 }
        ]
      } as ReferenceDataSet)
    ).toEqual({
      isValid: false,
      errors: [
        "Birth collar 'Red' must be active before birth through the litter.",
        "Birth collar 'Red' must be worn by the female.",
        "Comparison range duplicate id 'similar'.",
        "Comparison range at index 2 is malformed."
      ]
    });
  });
});
