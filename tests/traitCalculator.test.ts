import { describe, expect, it } from "vitest";
import { createDataStore, type RepositoryData } from "../src/app/dataStore.js";
import {
  createCalculatorHistoryEntry,
  filterKnownCanineOptions,
  formatExportText,
  getKnownCanineOptions,
  solveCalculatorHistory,
  solveCalculatorInput
} from "../src/app/traitCalculator.js";
import { traitNames, type TraitName } from "../src/domain/traits/traitNames.js";

const exactTraits = Object.fromEntries(traitNames.map((trait, index) => [trait, index + 10])) as Record<
  TraitName,
  number
>;
const exactTotal = Object.values(exactTraits).reduce((total, value) => total + value, 0);

const data: RepositoryData = {
  canonical: {
    humans: [{ id: "human-dave", displayName: "Dave", contact: null, status: "active" }],
    characters: [{ id: "character-mulapin", name: "Mulapin", humanId: "human-dave", status: "active" }],
    canines: [
      {
        id: "canine-known",
        externalIds: {},
        callName: "Ringo",
        displayName: "Mulapin Ringo 306/23",
        characterId: "character-mulapin",
        gender: "M",
        canineType: null,
        appearance: null,
        status: "active"
      },
      {
        id: "canine-summary",
        externalIds: {},
        callName: "Summary",
        displayName: "Mulapin Summary",
        characterId: "character-mulapin",
        gender: "F",
        canineType: null,
        appearance: null,
        status: "active"
      }
    ],
    traitProfiles: [
      {
        canineId: "canine-known",
        status: "known",
        total: exactTotal,
        traits: exactTraits
      },
      {
        canineId: "canine-summary",
        status: "summary",
        total: exactTotal,
        traits: null
      }
    ],
    lineageProfiles: [
      {
        canineId: "canine-known",
        sireId: null,
        damId: null,
        paternalGrandSireId: null,
        paternalGrandDamId: null,
        maternalGrandSireId: null,
        maternalGrandDamId: null
      },
      {
        canineId: "canine-summary",
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

function comparisonText(confidence = "You are certain that"): string {
  return [
    `${confidence} Mulapin Ringo 306/23 is:`,
    ...traitNames.map((trait) => `${trait} seems similar.`),
    "Overall Ringo seems to be similar.",
    "They seem to be unrelated."
  ].join("\n");
}

describe("trait calculator app workflow", () => {
  it("offers only exact known trait profiles as calculator options", () => {
    const store = createDataStore(data);

    expect(getKnownCanineOptions(store).map((option) => option.canineId)).toEqual(["canine-known"]);
  });

  it("sorts known canine options alphabetically instead of by total score", () => {
    const store = createDataStore({
      ...data,
      canonical: {
        ...data.canonical,
        canines: [
          ...data.canonical.canines,
          {
            id: "canine-alpha",
            externalIds: {},
            callName: "Alpha",
            displayName: "Aardvark Alpha 100/10",
            characterId: "character-mulapin",
            gender: "F",
            canineType: null,
            appearance: null,
            status: "active"
          }
        ],
        traitProfiles: [
          ...data.canonical.traitProfiles,
          {
            canineId: "canine-alpha",
            status: "known",
            total: 100,
            traits: exactTraits
          }
        ],
        lineageProfiles: [
          ...data.canonical.lineageProfiles,
          {
            canineId: "canine-alpha",
            sireId: null,
            damId: null,
            paternalGrandSireId: null,
            paternalGrandDamId: null,
            maternalGrandSireId: null,
            maternalGrandDamId: null
          }
        ]
      }
    });

    expect(getKnownCanineOptions(store).map((option) => option.canineId)).toEqual(["canine-alpha", "canine-known"]);
  });

  it("filters known canine options by label or alias text", () => {
    const options = [
      {
        canineId: "canine-ballad-fireball",
        label: "Ballad Fireball 730/55 | Ballad | 730/55",
        aliases: ["Fireball", "Ballad Fireball"],
        profile: { total: 730, traits: exactTraits }
      },
      {
        canineId: "canine-cover-rocker",
        label: "Cover Rocker 714/60 | Cover | 714/60",
        aliases: ["Rocker", "Cover Rocker"],
        profile: { total: 714, traits: exactTraits }
      }
    ];

    expect(filterKnownCanineOptions(options, "ball").map((option) => option.canineId)).toEqual([
      "canine-ballad-fireball"
    ]);
    expect(filterKnownCanineOptions(options, "rock").map((option) => option.canineId)).toEqual([
      "canine-cover-rocker"
    ]);
  });

  it("requires an explicit direction before solving", () => {
    const store = createDataStore(data);
    const [known] = getKnownCanineOptions(store);
    const result = solveCalculatorInput(known, "", comparisonText(), "Solved");

    expect(result.direction).toBeNull();
    expect(result.directionSuggestion).toMatchObject({
      confidence: "strong",
      reason: "The comparison subject matches the selected known canine."
    });
    expect(result.resultRow).toBeNull();
    expect(result.exportText).toBe("");
    expect(result.warnings).toContain("Choose the comparison direction before solving.");
  });

  it("solves once the direction is explicitly selected", () => {
    const store = createDataStore(data);
    const [known] = getKnownCanineOptions(store);
    const result = solveCalculatorInput(known, "known-to-unknown", comparisonText(), "Solved");

    expect(result.direction).toBe("known-to-unknown");
    expect(result.resultRow?.Name).toBe("Solved");
    expect(result.resultRow?.TOTAL).toBe(String(exactTotal));
    expect(result.resultRow?.Procreation).toBe(String(exactTraits.Procreation));
    expect(result.exportText).toContain("Solved\t");
  });

  it("preserves parser warnings for non-certain comparison text", () => {
    const store = createDataStore(data);
    const [known] = getKnownCanineOptions(store);
    const result = solveCalculatorInput(known, "unknown-to-known", comparisonText("You think that"), "Solved");

    expect(result.warnings).toContain(
      "Comparison confidence is 'think'. Only 'certain' comparison text should be used for trait solving."
    );
  });

  it("freezes the known canine and direction into a comparison history entry", () => {
    const store = createDataStore(data);
    const [known] = getKnownCanineOptions(store);
    const { entry, warnings } = createCalculatorHistoryEntry(known, "known-to-unknown", comparisonText(), "entry-1");

    expect(warnings).toEqual([]);
    expect(entry).toMatchObject({
      id: "entry-1",
      knownCanineId: "canine-known",
      knownLabel: "Mulapin Ringo 306/23 | Mulapin | 306/23",
      direction: "known-to-unknown",
      subject: "Mulapin Ringo 306/23",
      blockCount: 1
    });
  });

  it("merges comparison history entries into the final result row", () => {
    const store = createDataStore(data);
    const [known] = getKnownCanineOptions(store);
    const first = createCalculatorHistoryEntry(known, "known-to-unknown", comparisonText(), "entry-1").entry;
    const second = createCalculatorHistoryEntry(known, "known-to-unknown", comparisonText(), "entry-2").entry;

    const result = solveCalculatorHistory([first, second].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)), "Merged");

    expect(result.resultRow?.Name).toBe("Merged");
    expect(result.resultRow?.TOTAL).toBe(String(exactTotal));
    expect(result.resultRow?.Procreation).toBe(String(exactTraits.Procreation));
    expect(result.exportText).toContain("Merged\t");
  });

  it("exports app rows without duplicating inferred overall after total", () => {
    const row = {
      Name: "Solved canine",
      ...Object.fromEntries(traitNames.map((trait) => [trait, String(exactTraits[trait])])),
      TOTAL: String(exactTotal),
      Overall: String(exactTotal)
    } as Record<"Name" | TraitName | "TOTAL" | "Overall", string>;

    expect(formatExportText(row).split("\t")).toHaveLength(19);
    expect(formatExportText(row)).toBe(
      ["Solved canine", ...traitNames.map((trait) => String(exactTraits[trait])), String(exactTotal)].join("\t")
    );
  });
});
