import type { SolvedTraitProfile, ValueRange } from "./comparisonSolver.js";
import { traitNames, type TraitName } from "./traitNames.js";

export type TraitResultRow = Record<TraitName | "Name" | "TOTAL" | "Overall", string>;

export type FormatTraitResultRowOptions = {
  name?: string;
  unknownText?: string;
  includeOverallWhenTotalIsExact?: boolean;
};

function formatRange(range: ValueRange | null | undefined, unknownText: string): string {
  if (!range) {
    return unknownText;
  }

  if (range.min === range.max) {
    return String(range.min);
  }

  return `${range.min} to ${range.max}`;
}

function isExactRange(range: ValueRange | null | undefined): boolean {
  return Boolean(range && range.min === range.max);
}

export function formatTraitResultRow(
  solved: SolvedTraitProfile,
  options: FormatTraitResultRowOptions = {}
): TraitResultRow {
  const unknownText = options.unknownText ?? "UNKNOWN";
  const row = {
    Name: options.name ?? "",
    TOTAL: formatRange(solved.traitTotal, unknownText),
    Overall: ""
  } as TraitResultRow;

  for (const trait of traitNames) {
    row[trait] = formatRange(solved.traits[trait], unknownText);
  }

  const shouldIncludeOverall =
    options.includeOverallWhenTotalIsExact || !isExactRange(solved.traitTotal);

  row.Overall = shouldIncludeOverall ? formatRange(solved.overall, unknownText) : "";

  return row;
}
