import { describe, expect, it } from "vitest";
import { formatTraitResultRow } from "../src/domain/traits/resultRow.js";
import type { SolvedTraitProfile } from "../src/domain/traits/comparisonSolver.js";
import { solveTraitProfile } from "../src/domain/traits/comparisonSolver.js";
import { parseComparisonText } from "../src/domain/traits/comparisonParser.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
};

function profile(total: number, values: readonly number[]) {
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

function solveBaggins(): SolvedTraitProfile {
  const blocks = parseComparisonText(readLegacyFixture("Validation-UnknownToKnown.txt")).slice(0, 8);
  const names = Object.keys(knownProfiles) as Array<keyof typeof knownProfiles>;

  return solveTraitProfile(
    blocks.map((comparison, index) => ({
      comparison,
      knownProfile: knownProfiles[names[index]],
      direction: "unknown-to-known"
    }))
  );
}

describe("trait result row formatter", () => {
  it("formats an exact solved profile into display/export strings", () => {
    expect(formatTraitResultRow(solveBaggins(), { name: "Baggins" })).toEqual({
      Name: "Baggins",
      Alertness: "29",
      Appetite: "45",
      Brutality: "32",
      Development: "43",
      Eluding: "53",
      Energy: "29",
      Evasion: "56",
      Ferocity: "51",
      Fortitude: "46",
      Insight: "34",
      Might: "40",
      Nimbleness: "53",
      Patience: "35",
      Procreation: "52",
      Sufficiency: "36",
      Targeting: "40",
      Toughness: "49",
      TOTAL: "723",
      Overall: ""
    });
  });

  it("can include exact overall when an export needs every legacy field", () => {
    const row = formatTraitResultRow(solveBaggins(), {
      name: "Baggins",
      includeOverallWhenTotalIsExact: true
    });

    expect(row.TOTAL).toBe("723");
    expect(row.Overall).toBe("723");
  });

  it("formats unresolved values and ranges without losing column shape", () => {
    const solved: SolvedTraitProfile = {
      traits: {
        Alertness: { min: 28, max: 30 },
        Procreation: { min: 52, max: 52 }
      },
      traitTotal: null,
      overall: { min: 721, max: 725 },
      warnings: []
    };

    const row = formatTraitResultRow(solved, { name: "fox 2" });

    expect(row.Name).toBe("fox 2");
    expect(row.Alertness).toBe("28 to 30");
    expect(row.Procreation).toBe("52");
    expect(row.Appetite).toBe("UNKNOWN");
    expect(row.TOTAL).toBe("UNKNOWN");
    expect(row.Overall).toBe("721 to 725");
  });
});
