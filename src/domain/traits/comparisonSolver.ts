import type { ParsedComparisonBlock, ParsedPhraseRange } from "./comparisonParser.js";
import { traitNames, type TraitName } from "./traitNames.js";

export type ComparisonDirection = "unknown-to-known" | "known-to-unknown";

export type ExactTraitProfile = {
  traits: Partial<Record<TraitName, number | null | undefined>>;
  total?: number | null;
};

export type ValueRange = {
  min: number;
  max: number;
};

export type DirectionSuggestion = {
  direction: ComparisonDirection;
  confidence: "strong" | "weak";
  reason: string;
};

export type SolvedComparisonRange = {
  traits: Partial<Record<TraitName, ValueRange>>;
  traitTotal: ValueRange | null;
  overall: ValueRange | null;
  warnings: string[];
};

export type SolvedTraitProfile = {
  traits: Partial<Record<TraitName, ValueRange>>;
  traitTotal: ValueRange | null;
  overall: ValueRange | null;
  warnings: string[];
};

export type ComparisonInput = {
  comparison: ParsedComparisonBlock;
  knownProfile: ExactTraitProfile;
  direction: ComparisonDirection;
};

function normalizeName(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isExactNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecognizedRange(range: ParsedPhraseRange | null | undefined): range is ParsedPhraseRange {
  return Boolean(range?.recognized && isExactNumber(range.min) && isExactNumber(range.max));
}

function intersectRange(current: ValueRange | undefined, next: ValueRange): ValueRange {
  if (!current) {
    return next;
  }

  return {
    min: Math.max(current.min, next.min),
    max: Math.min(current.max, next.max)
  };
}

function hasImpossibleRange(range: ValueRange): boolean {
  return range.min > range.max;
}

function isExactRange(range: ValueRange | null): range is ValueRange {
  return Boolean(range && range.min === range.max);
}

export function suggestComparisonDirection(
  comparison: Pick<ParsedComparisonBlock, "subject">,
  knownAliases: readonly string[]
): DirectionSuggestion {
  const subject = comparison.subject ? normalizeName(comparison.subject) : null;
  const aliases = knownAliases.map(normalizeName).filter(Boolean);

  if (subject && aliases.includes(subject)) {
    return {
      direction: "known-to-unknown",
      confidence: "strong",
      reason: "The comparison subject matches the selected known canine."
    };
  }

  return {
    direction: "unknown-to-known",
    confidence: subject ? "weak" : "weak",
    reason: subject
      ? "The comparison subject does not match the selected known canine."
      : "The comparison subject could not be read from the pasted text."
  };
}

export function solveValueRange(
  knownValue: number,
  phraseRange: Pick<ParsedPhraseRange, "min" | "max">,
  direction: ComparisonDirection
): ValueRange {
  if (!isExactNumber(phraseRange.min) || !isExactNumber(phraseRange.max)) {
    throw new Error("Cannot solve from an unrecognized comparison phrase range.");
  }

  if (direction === "unknown-to-known") {
    return {
      min: knownValue + phraseRange.min,
      max: knownValue + phraseRange.max
    };
  }

  return {
    min: knownValue - phraseRange.max,
    max: knownValue - phraseRange.min
  };
}

export function solveComparisonRange(input: ComparisonInput): SolvedComparisonRange {
  const warnings = [...input.comparison.warnings];
  const traits: Partial<Record<TraitName, ValueRange>> = {};

  for (const trait of traitNames) {
    const knownValue = input.knownProfile.traits[trait];
    const phraseRange = input.comparison.traits[trait];

    if (!isExactNumber(knownValue)) {
      warnings.push(`Known canine trait '${trait}' is not solved; skipped.`);
      continue;
    }

    if (!isRecognizedRange(phraseRange)) {
      warnings.push(`Comparison phrase for '${trait}' is missing or unrecognized; skipped.`);
      continue;
    }

    traits[trait] = solveValueRange(knownValue, phraseRange, input.direction);
  }

  const traitTotal = calculateTraitTotal(traits);
  let overall: ValueRange | null = null;

  if (isExactNumber(input.knownProfile.total) && isRecognizedRange(input.comparison.overall)) {
    overall = solveValueRange(input.knownProfile.total, input.comparison.overall, input.direction);
  } else if (!isExactNumber(input.knownProfile.total)) {
    warnings.push("Known canine total is not solved; skipped overall comparison.");
  } else if (!isRecognizedRange(input.comparison.overall)) {
    warnings.push("Overall comparison phrase is missing or unrecognized; skipped.");
  }

  return {
    traits,
    traitTotal,
    overall,
    warnings
  };
}

export function mergeSolvedTraitProfiles(solved: readonly SolvedComparisonRange[]): SolvedTraitProfile {
  const traits: Partial<Record<TraitName, ValueRange>> = {};
  const warnings: string[] = solved.flatMap((entry) => entry.warnings);
  let overall: ValueRange | null = null;

  for (const entry of solved) {
    for (const trait of traitNames) {
      const next = entry.traits[trait];
      if (!next) {
        continue;
      }

      const merged = intersectRange(traits[trait], next);
      traits[trait] = merged;

      if (hasImpossibleRange(merged)) {
        warnings.push(`Solved range for '${trait}' is impossible after merging comparisons.`);
      }
    }

    if (entry.overall) {
      overall = intersectRange(overall ?? undefined, entry.overall);
      if (hasImpossibleRange(overall)) {
        warnings.push("Solved overall range is impossible after merging comparisons.");
      }
    }
  }

  const traitTotal = calculateTraitTotal(traits);

  if (isExactRange(traitTotal)) {
    overall = traitTotal;
  }

  return {
    traits,
    traitTotal,
    overall,
    warnings
  };
}

export function solveTraitProfile(inputs: readonly ComparisonInput[]): SolvedTraitProfile {
  return mergeSolvedTraitProfiles(inputs.map((input) => solveComparisonRange(input)));
}

export function calculateTraitTotal(
  traits: Partial<Record<TraitName, ValueRange>>
): ValueRange | null {
  let min = 0;
  let max = 0;

  for (const trait of traitNames) {
    const range = traits[trait];
    if (!range) {
      return null;
    }

    min += range.min;
    max += range.max;
  }

  return { min, max };
}
