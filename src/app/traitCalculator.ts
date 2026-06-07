import type { DataStore, TraitProfile, TraitValue } from "./dataStore.js";
import { parseComparisonText, type ParsedComparisonBlock } from "../domain/traits/comparisonParser.js";
import {
  mergeSolvedTraitProfiles,
  solveTraitProfile,
  suggestComparisonDirection,
  type ComparisonDirection,
  type DirectionSuggestion,
  type ExactTraitProfile,
  type SolvedTraitProfile
} from "../domain/traits/comparisonSolver.js";
import { formatTraitResultRow, type TraitResultRow } from "../domain/traits/resultRow.js";
import { traitNames, type TraitName } from "../domain/traits/traitNames.js";

export type CalculatorDirectionMode = "auto" | ComparisonDirection;

export type KnownCanineOption = {
  canineId: string;
  label: string;
  aliases: string[];
  profile: ExactTraitProfile;
  humanId?: string | null;
  humanLabel?: string;
  status?: string;
  breedingRole?: string;
};

export type CalculatorResult = {
  blocks: ParsedComparisonBlock[];
  directionSuggestion: DirectionSuggestion | null;
  direction: ComparisonDirection | null;
  solved: SolvedTraitProfile | null;
  resultRow: TraitResultRow | null;
  exportText: string;
  warnings: string[];
};

export type CalculatorHistoryEntry = {
  id: string;
  knownCanineId: string;
  knownLabel: string;
  direction: ComparisonDirection;
  directionSuggestion: DirectionSuggestion;
  subject: string | null;
  blockCount: number;
  solved: SolvedTraitProfile;
  warnings: string[];
};

export type CalculatorHistoryResult = {
  solved: SolvedTraitProfile | null;
  resultRow: TraitResultRow | null;
  exportText: string;
  warnings: string[];
};

export function getKnownCanineOptions(store: DataStore): KnownCanineOption[] {
  return store.data.canonical.canines
    .map<KnownCanineOption | null>((canine) => {
      const summary = store.getCanineSummary(canine.id);
      const profile = summary?.traitProfile ? toExactTraitProfile(summary.traitProfile) : null;

      if (!summary || !profile) {
        return null;
      }

      return {
        canineId: canine.id,
        label: `${canine.displayName} | ${summary.character?.name ?? "unknown"} | ${summary.totalLabel}/${summary.procreationLabel}`,
        aliases: [canine.callName, canine.displayName, summary.character?.name, `${summary.character?.name ?? ""} ${canine.callName}`].filter(
          (alias): alias is string => Boolean(alias?.trim())
        ),
        profile,
        humanId: summary.human?.id ?? null,
        humanLabel: summary.human?.displayName ?? "unknown",
        status: canine.status,
        breedingRole: canine.breedingRole ?? "unknown"
      };
    })
    .filter((option): option is KnownCanineOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

export function filterKnownCanineOptions(
  options: readonly KnownCanineOption[],
  filterText: string
): KnownCanineOption[] {
  const query = filterText.trim().toLowerCase();

  if (!query) {
    return [...options];
  }

  return options.filter((option) =>
    [option.label, ...option.aliases].some((value) => value.toLowerCase().includes(query))
  );
}

export function solveCalculatorInput(
  knownOption: KnownCanineOption | undefined,
  directionMode: CalculatorDirectionMode,
  comparisonText: string,
  resultName = "Solved canine"
): CalculatorResult {
  const blocks = parseComparisonText(comparisonText);
  const warnings: string[] = [];

  if (!knownOption) {
    return emptyResult(blocks, ["Select a known canine before solving."]);
  }

  if (!comparisonText.trim()) {
    return emptyResult([], []);
  }

  if (blocks.length === 0) {
    return emptyResult([], ["No comparison blocks were found in the pasted text."]);
  }

  const directionSuggestion = suggestComparisonDirection(blocks[0], knownOption.aliases);
  const direction = directionMode === "auto" ? directionSuggestion.direction : directionMode;
  const solved = solveTraitProfile(
    blocks.map((comparison) => ({
      comparison,
      knownProfile: knownOption.profile,
      direction
    }))
  );

  warnings.push(...blocks.flatMap((block) => block.warnings));
  warnings.push(...blocks.flatMap((block) => block.unrecognized.map((trait) => `Unrecognized comparison phrase for '${trait}'.`)));
  warnings.push(...solved.warnings);

  const resultRow = formatTraitResultRow(solved, {
    name: resultName,
    includeOverallWhenTotalIsExact: true
  });

  return {
    blocks,
    directionSuggestion,
    direction,
    solved,
    resultRow,
    exportText: formatExportText(resultRow),
    warnings: Array.from(new Set(warnings))
  };
}

export function createCalculatorHistoryEntry(
  knownOption: KnownCanineOption | undefined,
  directionMode: CalculatorDirectionMode,
  comparisonText: string,
  id: string
): { entry: CalculatorHistoryEntry | null; warnings: string[] } {
  const result = solveCalculatorInput(knownOption, directionMode, comparisonText);

  if (!knownOption || !result.solved || !result.direction || !result.directionSuggestion) {
    return {
      entry: null,
      warnings: result.warnings.length > 0 ? result.warnings : ["Nothing was added to comparison history."]
    };
  }

  return {
    entry: {
      id,
      knownCanineId: knownOption.canineId,
      knownLabel: knownOption.label,
      direction: result.direction,
      directionSuggestion: result.directionSuggestion,
      subject: result.blocks[0]?.subject ?? null,
      blockCount: result.blocks.length,
      solved: result.solved,
      warnings: result.warnings
    },
    warnings: []
  };
}

export function solveCalculatorHistory(
  entries: readonly CalculatorHistoryEntry[],
  resultName = "Solved canine"
): CalculatorHistoryResult {
  if (entries.length === 0) {
    return {
      solved: null,
      resultRow: null,
      exportText: "",
      warnings: []
    };
  }

  const solved = mergeSolvedTraitProfiles(entries.map((entry) => entry.solved));
  const resultRow = formatTraitResultRow(solved, {
    name: resultName,
    includeOverallWhenTotalIsExact: true
  });

  return {
    solved,
    resultRow,
    exportText: formatExportText(resultRow),
    warnings: Array.from(new Set([...entries.flatMap((entry) => entry.warnings), ...solved.warnings]))
  };
}

export function formatExportText(row: TraitResultRow | null): string {
  if (!row) {
    return "";
  }

  const fields = ["Name", ...traitNames, "TOTAL"] as const;

  return fields.map((field) => row[field]).join("\t");
}

function emptyResult(blocks: ParsedComparisonBlock[], warnings: string[]): CalculatorResult {
  return {
    blocks,
    directionSuggestion: null,
    direction: null,
    solved: null,
    resultRow: null,
    exportText: "",
    warnings
  };
}

function toExactTraitProfile(profile: TraitProfile): ExactTraitProfile | null {
  if (typeof profile.total !== "number" || !profile.traits) {
    return null;
  }

  const traits: Partial<Record<TraitName, number>> = {};

  for (const trait of traitNames) {
    const value = profile.traits[trait];

    if (!isExactTraitValue(value)) {
      return null;
    }

    traits[trait] = value;
  }

  return {
    total: profile.total,
    traits
  };
}

function isExactTraitValue(value: TraitValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
