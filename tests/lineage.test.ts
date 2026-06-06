import { describe, expect, it } from "vitest";
import {
  buildRelationshipSet,
  compareLineage,
  generateHypotheticalPuppyLineage,
  type LineageProfile
} from "../src/domain/lineage/lineage.js";

const unrelatedSire: LineageProfile = {
  canineId: "canine-sire",
  sireId: "canine-sire-father",
  damId: "canine-sire-mother",
  paternalGrandSireId: "canine-sire-fathers-father",
  paternalGrandDamId: "canine-sire-fathers-mother",
  maternalGrandSireId: "canine-sire-mothers-father",
  maternalGrandDamId: "canine-sire-mothers-mother"
};

const unrelatedDam: LineageProfile = {
  canineId: "canine-dam",
  sireId: "canine-dam-father",
  damId: "canine-dam-mother",
  paternalGrandSireId: "canine-dam-fathers-father",
  paternalGrandDamId: "canine-dam-fathers-mother",
  maternalGrandSireId: "canine-dam-mothers-father",
  maternalGrandDamId: "canine-dam-mothers-mother"
};

describe("lineage relationship rules", () => {
  it("builds a relationship set from self, parents, and grandparents", () => {
    expect(buildRelationshipSet(unrelatedSire)).toEqual([
      { canineId: "canine-sire", slot: "self" },
      { canineId: "canine-sire-father", slot: "sire" },
      { canineId: "canine-sire-mother", slot: "dam" },
      { canineId: "canine-sire-fathers-father", slot: "paternalGrandSire" },
      { canineId: "canine-sire-fathers-mother", slot: "paternalGrandDam" },
      { canineId: "canine-sire-mothers-father", slot: "maternalGrandSire" },
      { canineId: "canine-sire-mothers-mother", slot: "maternalGrandDam" }
    ]);
  });

  it("ignores null, unknown, and NPC ancestry by treating them as missing", () => {
    const left: LineageProfile = {
      canineId: "canine-left",
      sireId: null,
      damId: null,
      paternalGrandSireId: null,
      paternalGrandDamId: null,
      maternalGrandSireId: null,
      maternalGrandDamId: null
    };
    const right: LineageProfile = {
      canineId: "canine-right",
      sireId: null,
      damId: null,
      paternalGrandSireId: null,
      paternalGrandDamId: null,
      maternalGrandSireId: null,
      maternalGrandDamId: null
    };

    expect(buildRelationshipSet(left)).toEqual([{ canineId: "canine-left", slot: "self" }]);
    expect(compareLineage(left, right)).toEqual({
      areRelated: false,
      sharedAncestors: []
    });
  });

  it("reports unrelated parents when no tracked IDs overlap", () => {
    expect(compareLineage(unrelatedSire, unrelatedDam)).toEqual({
      areRelated: false,
      sharedAncestors: []
    });
  });

  it("returns shared ancestor details instead of only a boolean", () => {
    const relatedDam: LineageProfile = {
      ...unrelatedDam,
      maternalGrandSireId: "canine-sire-mother"
    };

    expect(compareLineage(unrelatedSire, relatedDam)).toEqual({
      areRelated: true,
      sharedAncestors: [
        {
          canineId: "canine-sire-mother",
          leftSlots: ["dam"],
          rightSlots: ["maternalGrandSire"]
        }
      ]
    });
  });

  it("deduplicates repeated shared ancestry while preserving all matching slots", () => {
    const left: LineageProfile = {
      ...unrelatedSire,
      sireId: "canine-shared",
      paternalGrandSireId: "canine-shared"
    };
    const right: LineageProfile = {
      ...unrelatedDam,
      damId: "canine-shared",
      maternalGrandDamId: "canine-shared"
    };

    expect(compareLineage(left, right)).toEqual({
      areRelated: true,
      sharedAncestors: [
        {
          canineId: "canine-shared",
          leftSlots: ["sire", "paternalGrandSire"],
          rightSlots: ["dam", "maternalGrandDam"]
        }
      ]
    });
  });

  it("generates a hypothetical puppy lineage by shifting parents into grandparents", () => {
    expect(generateHypotheticalPuppyLineage("canine-planned-puppy", unrelatedSire, unrelatedDam)).toEqual({
      canineId: "canine-planned-puppy",
      sireId: "canine-sire",
      damId: "canine-dam",
      paternalGrandSireId: "canine-sire-father",
      paternalGrandDamId: "canine-sire-mother",
      maternalGrandSireId: "canine-dam-father",
      maternalGrandDamId: "canine-dam-mother"
    });
  });
});
