import { describe, expect, it } from "vitest";
import {
  estimatePuppyBreedingValue,
  evaluateBreedingCandidate,
  findBreedingCandidates,
  type CanineRecord,
  type CharacterRecord,
  type TraitProfile
} from "../src/domain/breeding/candidates.js";
import type { LineageProfile } from "../src/domain/lineage/lineage.js";

const characters: CharacterRecord[] = [
  { id: "character-dave-main", humanId: "human-dave" },
  { id: "character-dave-alt", humanId: "human-dave" },
  { id: "character-jeanie", humanId: "human-jeanie" },
  { id: "character-unknown", humanId: "human-unknown" }
];

const selected: CanineRecord = canine("selected", "Selected Sire", "character-dave-main", "M", "fox");
const strongCandidate = canine("strong", "Strong Dam", "character-jeanie", "F", "fox");
const highProcCandidate = canine("high-proc", "High Procreation Dam", "character-jeanie", "F", "fox");
const sameHumanCandidate = canine("same-human", "Same Human Dam", "character-dave-alt", "F", "fox");
const relatedCandidate = canine("related", "Related Dam", "character-jeanie", "F", "fox");
const mixedTypeCandidate = canine("mixed-type", "Mixed Type Dam", "character-jeanie", "F", "wolf");
const maleCandidate = canine("male-candidate", "Male Candidate", "character-jeanie", "M", "fox");
const inactiveCandidate = { ...canine("inactive", "Inactive Dam", "character-jeanie", "F", "fox"), status: "inactive" };

const lineageProfiles: LineageProfile[] = [
  lineage("selected", "selected-sire", "shared-ancestor"),
  lineage("strong", "strong-sire", "strong-dam"),
  lineage("high-proc", "high-proc-sire", "high-proc-dam"),
  lineage("same-human", "same-human-sire", "same-human-dam"),
  lineage("related", "related-sire", "shared-ancestor"),
  lineage("mixed-type", "mixed-type-sire", "mixed-type-dam"),
  lineage("male-candidate", "male-candidate-sire", "male-candidate-dam"),
  lineage("inactive", "inactive-sire", "inactive-dam")
];

const traitProfiles: TraitProfile[] = [
  traitProfile("selected", 800, 70),
  traitProfile("strong", 900, 50),
  traitProfile("high-proc", 850, 80),
  traitProfile("same-human", 950, 95),
  traitProfile("related", 990, 99),
  traitProfile("mixed-type", 875, 75),
  traitProfile("male-candidate", 1200, 100),
  traitProfile("inactive", 1100, 100)
];

function canine(
  id: string,
  displayName: string,
  characterId: string,
  gender: CanineRecord["gender"],
  canineType: string | null
): CanineRecord {
  return {
    id,
    displayName,
    characterId,
    gender,
    canineType,
    status: "active"
  };
}

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

function traitProfile(canineId: string, total: number, procreation: number): TraitProfile {
  return {
    canineId,
    status: "known",
    total,
    traits: {
      Procreation: procreation
    }
  };
}

describe("breeding candidate rules", () => {
  it("filters candidate mates by opposite gender and active status", () => {
    const candidates = findBreedingCandidates({
      selectedCanine: selected,
      candidateCanines: [strongCandidate, maleCandidate, inactiveCandidate],
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(candidates.map((candidate) => candidate.canine.id)).toEqual(["strong"]);
  });

  it("distinguishes genetic safety from practical direct breeding availability", () => {
    const related = evaluateBreedingCandidate(selected, relatedCandidate, {
      characters,
      traitProfiles,
      lineageProfiles
    });
    const sameHuman = evaluateBreedingCandidate(selected, sameHumanCandidate, {
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(related.isGeneticallySafe).toBe(false);
    expect(related.isDirectBreedingPractical).toBe(true);
    expect(related.relationship.sharedAncestors).toEqual([
      {
        canineId: "shared-ancestor",
        leftSlots: ["dam"],
        rightSlots: ["dam"]
      }
    ]);

    expect(sameHuman.isGeneticallySafe).toBe(true);
    expect(sameHuman.isDirectBreedingPractical).toBe(false);
    expect(sameHuman.warnings).toContain(
      "Same human owns both characters; direct breeding is not practical with alternate characters."
    );
  });

  it("excludes related and same-human candidates by default", () => {
    const candidates = findBreedingCandidates({
      selectedCanine: selected,
      candidateCanines: [strongCandidate, relatedCandidate, sameHumanCandidate],
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(candidates.map((candidate) => candidate.canine.id)).toEqual(["strong"]);
  });

  it("warns on mixed canine type separately from relationship safety", () => {
    const candidate = evaluateBreedingCandidate(selected, mixedTypeCandidate, {
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(candidate.isGeneticallySafe).toBe(true);
    expect(candidate.warnings).toContain("Mixed canine type: fox to wolf.");
  });

  it("ranks practical candidates by total score and then Procreation", () => {
    const candidates = findBreedingCandidates({
      selectedCanine: selected,
      candidateCanines: [highProcCandidate, strongCandidate, mixedTypeCandidate],
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(candidates.map((candidate) => candidate.canine.id)).toEqual([
      "strong",
      "mixed-type",
      "high-proc"
    ]);
    expect(candidates.map((candidate) => candidate.traitTotal)).toEqual([900, 875, 850]);
    expect(candidates.map((candidate) => candidate.procreation)).toEqual([50, 75, 80]);
  });

  it("surfaces Procreation as an independent ranking signal", () => {
    const candidate = evaluateBreedingCandidate(selected, highProcCandidate, {
      characters,
      traitProfiles,
      lineageProfiles
    });

    expect(candidate.traitTotal).toBe(850);
    expect(candidate.procreation).toBe(80);
  });

  it("preserves estimated puppy values as estimates instead of canonical canines", () => {
    const estimate = estimatePuppyBreedingValue(
      traitProfile("sire", 800, 70),
      traitProfile("dam", 900, 80)
    );

    expect(estimate).toEqual({
      kind: "estimate",
      traitTotal: 850,
      procreation: 75,
      notes: [
        "Estimated puppy values are planning aids, not predictions.",
        "Do not promote this estimate into canonical canine data until an actual puppy is statted."
      ]
    });
  });
});
