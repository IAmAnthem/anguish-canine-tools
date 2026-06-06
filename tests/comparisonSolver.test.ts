import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseComparisonText, type ParsedComparisonBlock } from "../src/domain/traits/comparisonParser.js";
import {
  solveComparisonRange,
  solveTraitProfile,
  suggestComparisonDirection,
  type ComparisonDirection,
  type ExactTraitProfile
} from "../src/domain/traits/comparisonSolver.js";
import { traitNames, type TraitName } from "../src/domain/traits/traitNames.js";

const repoRoot = resolve(import.meta.dirname, "..");
const legacyRepo = resolve(repoRoot, "..", "CanineCalculations");

const knownProfiles = {
  Ballad: profile(730, [26, 47, 32, 41, 51, 31, 53, 53, 43, 39, 47, 52, 37, 55, 36, 39, 48]),
  Cover: profile(714, [29, 49, 26, 40, 53, 33, 52, 55, 46, 35, 40, 50, 35, 60, 30, 37, 44]),
  Crescendo: profile(698, [29, 51, 31, 34, 49, 31, 55, 46, 45, 32, 44, 54, 34, 51, 32, 39, 41]),
  Dirge: profile(692, [26, 50, 25, 41, 51, 29, 53, 52, 39, 39, 43, 51, 31, 57, 29, 33, 43]),
  Exie: profile(694, [22, 47, 30, 43, 48, 33, 55, 44, 46, 39, 40, 55, 29, 53, 30, 38, 42]),
  Grazioso: profile(718, [24, 47, 28, 39, 54, 35, 58, 54, 45, 35, 46, 52, 34, 54, 29, 40, 44]),
  Lullaby: profile(722, [30, 46, 27, 38, 50, 29, 56, 57, 45, 39, 46, 57, 32, 57, 31, 41, 41]),
  Mulapin: profile(733, [30, 48, 26, 36, 52, 37, 59, 55, 47, 36, 47, 54, 34, 54, 37, 38, 43])
} satisfies Record<string, ExactTraitProfile>;

const expectedBaggins = {
  Alertness: 29,
  Appetite: 45,
  Brutality: 32,
  Development: 43,
  Eluding: 53,
  Energy: 29,
  Evasion: 56,
  Ferocity: 51,
  Fortitude: 46,
  Insight: 34,
  Might: 40,
  Nimbleness: 53,
  Patience: 35,
  Procreation: 52,
  Sufficiency: 36,
  Targeting: 40,
  Toughness: 49
} satisfies Record<TraitName, number>;

function profile(total: number, values: readonly number[]): ExactTraitProfile {
  return {
    total,
    traits: Object.fromEntries(
      traitNames.map((trait, index) => [trait, values[index]])
    ) as Record<TraitName, number>
  };
}

function readLegacyFixture(fileName: string): string {
  return readFileSync(resolve(legacyRepo, fileName), "utf8");
}

function firstEightInputs(fileName: string, direction: ComparisonDirection) {
  const blocks = parseComparisonText(readLegacyFixture(fileName)).slice(0, 8);
  const names = Object.keys(knownProfiles);

  return blocks.map((comparison, index) => ({
    comparison,
    knownProfile: knownProfiles[names[index] as keyof typeof knownProfiles],
    direction
  }));
}

function firstThreeInputs(fileName: string, direction: ComparisonDirection) {
  const blocks = parseComparisonText(readLegacyFixture(fileName)).slice(0, 3);
  const names = Object.keys(knownProfiles);

  return blocks.map((comparison, index) => ({
    comparison,
    knownProfile: knownProfiles[names[index] as keyof typeof knownProfiles],
    direction
  }));
}

function expectExactBagginsSolution(
  solved: ReturnType<typeof solveTraitProfile>
): void {
  for (const trait of traitNames) {
    expect(solved.traits[trait]).toEqual({
      min: expectedBaggins[trait],
      max: expectedBaggins[trait]
    });
  }

  expect(solved.traitTotal).toEqual({ min: 723, max: 723 });
  expect(solved.overall).toEqual({ min: 723, max: 723 });
}

describe("comparison solver", () => {
  it("suggests direction from the parsed subject when it matches a known alias", () => {
    const comparison = parseComparisonText(readLegacyFixture("Validation-KnownToUnknown.txt"))[0];

    expect(suggestComparisonDirection(comparison, ["Fireball", "Ballad Fireball 730/55"])).toEqual({
      direction: "known-to-unknown",
      confidence: "strong",
      reason: "The comparison subject matches the selected known canine."
    });
  });

  it("suggests unknown-to-known weakly when the parsed subject does not match the known aliases", () => {
    const comparison = parseComparisonText(readLegacyFixture("Validation-UnknownToKnown.txt"))[0];

    expect(suggestComparisonDirection(comparison, ["Fireball", "Ballad Fireball 730/55"])).toEqual({
      direction: "unknown-to-known",
      confidence: "weak",
      reason: "The comparison subject does not match the selected known canine."
    });
  });

  it("solves one unknown-to-known block by adding the comparison range to known values", () => {
    const comparison = parseComparisonText(readLegacyFixture("Validation-UnknownToKnown.txt"))[0];
    const solved = solveComparisonRange({
      comparison,
      knownProfile: knownProfiles.Ballad,
      direction: "unknown-to-known"
    });

    expect(solved.traits.Alertness).toEqual({ min: 28, max: 30 });
    expect(solved.overall).toEqual({ min: 721, max: 725 });
  });

  it("solves one known-to-unknown block by subtracting the reversed comparison range", () => {
    const comparison = parseComparisonText(readLegacyFixture("Validation-KnownToUnknown.txt"))[0];
    const solved = solveComparisonRange({
      comparison,
      knownProfile: knownProfiles.Ballad,
      direction: "known-to-unknown"
    });

    expect(solved.traits.Alertness).toEqual({ min: 28, max: 30 });
    expect(solved.overall).toEqual({ min: 721, max: 725 });
  });

  it("merges unknown-to-known validation comparisons into the expected Baggins result", () => {
    expectExactBagginsSolution(
      solveTraitProfile(firstEightInputs("Validation-UnknownToKnown.txt", "unknown-to-known"))
    );
  });

  it("merges known-to-unknown validation comparisons into the expected Baggins result", () => {
    expectExactBagginsSolution(
      solveTraitProfile(firstEightInputs("Validation-KnownToUnknown.txt", "known-to-unknown"))
    );
  });

  it("uses exact solved trait total as overall when all 17 traits are solved", () => {
    const solved = solveTraitProfile(firstThreeInputs("Validation-KnownToUnknown.txt", "known-to-unknown"));

    expect(solved.traitTotal).toEqual({ min: 723, max: 723 });
    expect(solved.overall).toEqual({ min: 723, max: 723 });
  });

  it("skips unsolved known-pet traits instead of manufacturing bad ranges", () => {
    const comparison = parseComparisonText(readLegacyFixture("Validation-UnknownToKnown.txt"))[0];
    const knownProfile: ExactTraitProfile = {
      ...knownProfiles.Ballad,
      traits: {
        ...knownProfiles.Ballad.traits,
        Alertness: null
      }
    };

    const solved = solveComparisonRange({
      comparison,
      knownProfile,
      direction: "unknown-to-known"
    });

    expect(solved.traits.Alertness).toBeUndefined();
    expect(solved.warnings).toContain("Known canine trait 'Alertness' is not solved; skipped.");
  });
});
