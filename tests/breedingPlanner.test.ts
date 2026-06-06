import { describe, expect, it } from "vitest";
import {
  filterBreedingCanineOptions,
  getBreedingCanineOptions,
  planBreedingForCanine
} from "../src/app/breedingPlanner.js";
import { createDataStore, type RepositoryData } from "../src/app/dataStore.js";

const data: RepositoryData = {
  canonical: {
    humans: [
      { id: "human-dave", displayName: "Dave", contact: null, status: "active" },
      { id: "human-jeanie", displayName: "Jeanie", contact: null, status: "active" }
    ],
    characters: [
      { id: "character-ballad", name: "Ballad", humanId: "human-dave", status: "active" },
      { id: "character-cover", name: "Cover", humanId: "human-jeanie", status: "active" },
      { id: "character-alt", name: "Alt", humanId: "human-dave", status: "active" }
    ],
    canines: [
      {
        id: "canine-an-untraited-canine",
        externalIds: {},
        callName: "An Untraited Canine",
        displayName: "An Untraited Canine",
        characterId: "character-ballad",
        gender: "A",
        canineType: null,
        appearance: null,
        status: "active"
      },
      canine("canine-ballad-fireball", "Fireball", "Ballad Fireball 730/55", "character-ballad", "M"),
      canine("canine-cover-rocker", "Rocker", "Cover Rocker 714/60", "character-cover", "F"),
      canine("canine-alt-dam", "AltDam", "Alt Dam 800/80", "character-alt", "F")
    ],
    traitProfiles: [
      traitProfile("canine-an-untraited-canine", 0, 0),
      traitProfile("canine-ballad-fireball", 730, 55),
      traitProfile("canine-cover-rocker", 714, 60),
      traitProfile("canine-alt-dam", 800, 80)
    ],
    lineageProfiles: [
      lineage("canine-an-untraited-canine", null, null),
      lineage("canine-ballad-fireball", "sire-a", "shared-dam"),
      lineage("canine-cover-rocker", "sire-b", "dam-b"),
      lineage("canine-alt-dam", "sire-c", "shared-dam")
    ],
    sourceObservations: []
  },
  reference: {
    collars: [],
    comparisonRanges: []
  }
};

function canine(id: string, callName: string, displayName: string, characterId: string, gender: "M" | "F") {
  return {
    id,
    externalIds: {},
    callName,
    displayName,
    characterId,
    gender,
    canineType: null,
    appearance: null,
    status: "active"
  };
}

function traitProfile(canineId: string, total: number, procreation: number) {
  return {
    canineId,
    status: "known",
    total,
    traits: { Procreation: procreation }
  };
}

function lineage(canineId: string, sireId: string | null, damId: string | null) {
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

describe("breeding planner app workflow", () => {
  it("sorts and filters breeding target options", () => {
    const options = getBreedingCanineOptions(createDataStore(data));

    expect(options.map((option) => option.canineId)).toEqual([
      "canine-an-untraited-canine",
      "canine-alt-dam",
      "canine-ballad-fireball",
      "canine-cover-rocker"
    ]);
    expect(filterBreedingCanineOptions(options, "ball").map((option) => option.canineId)).toEqual([
      "canine-ballad-fireball"
    ]);
  });

  it("uses the untraited canine as a neutral non-breeding starting point", () => {
    const result = planBreedingForCanine(createDataStore(data), "canine-an-untraited-canine");

    expect(result).toMatchObject({
      selectedLabel: "An Untraited Canine",
      candidates: [],
      warnings: ["Choose a male or female canine to show mate candidates."]
    });
  });

  it("plans only genetically safe practical candidates by default", () => {
    const result = planBreedingForCanine(createDataStore(data), "canine-ballad-fireball");

    expect(result.candidates.map((candidate) => candidate.canine.id)).toEqual(["canine-cover-rocker"]);
    expect(result.candidates[0]).toMatchObject({
      isGeneticallySafe: true,
      isDirectBreedingPractical: true,
      traitTotal: 714,
      procreation: 60,
      estimate: {
        kind: "estimate",
        traitTotal: 722,
        procreation: 57.5
      }
    });
  });

  it("can include related and same-human alt-blocked candidates when requested", () => {
    const result = planBreedingForCanine(createDataStore(data), "canine-ballad-fireball", {
      includeRelatedCandidates: true,
      includeSameHumanCandidates: true
    });

    expect(result.candidates.map((candidate) => candidate.canine.id)).toEqual([
      "canine-alt-dam",
      "canine-cover-rocker"
    ]);
    expect(result.candidates[0]).toMatchObject({
      isGeneticallySafe: false,
      isDirectBreedingPractical: false,
      traitTotal: 800,
      procreation: 80,
      estimate: {
        kind: "estimate",
        traitTotal: 765,
        procreation: 67.5
      }
    });
    expect(result.candidates[0].puppyLineage).toMatchObject({
      sireId: "canine-ballad-fireball",
      damId: "canine-alt-dam"
    });
  });
});
