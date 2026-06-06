import { comparisonRanges, type ComparisonRange } from "./comparisonRanges.js";
import { traitNames, type TraitName } from "./traitNames.js";

export type ComparisonConfidence = "certain" | "think" | "feel" | "unknown";

export type ParsedPhraseRange = {
  text: string;
  min: number | null;
  max: number | null;
  recognized: boolean;
};

export type ParsedComparisonBlock = {
  subject: string | null;
  confidence: ComparisonConfidence;
  isCertain: boolean;
  warnings: string[];
  traits: Partial<Record<TraitName, ParsedPhraseRange>>;
  traitCount: number;
  overall: ParsedPhraseRange | null;
  relationship: string | null;
  unrecognized: string[];
};

const confidenceStartPattern =
  /^\s*(?:You are certain that\b|You (?:think|feel)(?: that)?\b)/i;

const blockEndPattern = /^\s*They seem to be .+?\.\s*$/i;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePhrase(text: string): string {
  return text.trim().toLowerCase();
}

function buildRangeLookup(ranges: readonly ComparisonRange[]) {
  return new Map(ranges.map((range) => [range.text, range]));
}

export function getComparisonConfidence(text: string): ComparisonConfidence {
  if (/^\s*You are certain that\b/im.test(text)) {
    return "certain";
  }

  if (/^\s*You think(?: that)?\b/im.test(text)) {
    return "think";
  }

  if (/^\s*You feel(?: that)?\b/im.test(text)) {
    return "feel";
  }

  return "unknown";
}

export function splitComparisonBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let insideBlock = false;

  for (const line of lines) {
    if (confidenceStartPattern.test(line)) {
      if (insideBlock && current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }

      insideBlock = true;
    }

    if (insideBlock) {
      current.push(line);
    }

    if (insideBlock && blockEndPattern.test(line)) {
      blocks.push(current.join("\n"));
      current = [];
      insideBlock = false;
    }
  }

  if (insideBlock && current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

export function parseComparisonBlock(
  text: string,
  ranges: readonly ComparisonRange[] = comparisonRanges
): ParsedComparisonBlock {
  const rangeLookup = buildRangeLookup(ranges);
  const confidence = getComparisonConfidence(text);
  const warnings: string[] = [];
  const traits: Partial<Record<TraitName, ParsedPhraseRange>> = {};
  const unrecognized: string[] = [];
  let subject: string | null = null;
  let overall: ParsedPhraseRange | null = null;
  let relationship: string | null = null;

  for (const line of text.split(/\r?\n/)) {
    const certainSubject = line.match(/^\s*You are certain that\s+(.+?)\s+is:\s*$/i);
    const uncertainSubject = line.match(/^\s*You (?:think|feel)(?: that)?\s+(.+?)\s+is:\s*$/i);

    if (certainSubject) {
      subject = certainSubject[1].trim();
    } else if (uncertainSubject) {
      subject = uncertainSubject[1].trim();
    }

    for (const trait of traitNames) {
      const traitPattern = new RegExp(
        `^\\s*${escapeRegex(trait)}\\s+seems\\s+(.+?)\\.\\s*$`,
        "i"
      );
      const match = line.match(traitPattern);

      if (match) {
        const phrase = normalizePhrase(match[1]);
        const range = rangeLookup.get(phrase);
        traits[trait] = {
          text: phrase,
          min: range?.min ?? null,
          max: range?.max ?? null,
          recognized: Boolean(range)
        };
      }
    }

    const overallMatch = line.match(/^\s*Overall\s+\w+\s+seems\s+to\s+be\s+(.+?)\.\s*$/i);
    if (overallMatch) {
      const phrase = normalizePhrase(overallMatch[1]);
      const range = rangeLookup.get(phrase);
      overall = {
        text: phrase,
        min: range?.min ?? null,
        max: range?.max ?? null,
        recognized: Boolean(range)
      };
    }

    const relationshipMatch = line.match(/^\s*They seem to be (.+?)\.\s*$/i);
    if (relationshipMatch) {
      relationship = normalizePhrase(relationshipMatch[1]);
    }
  }

  for (const [trait, parsedRange] of Object.entries(traits)) {
    if (!parsedRange.recognized) {
      unrecognized.push(trait);
    }
  }

  if (overall && !overall.recognized) {
    unrecognized.push("Overall");
  }

  if (confidence !== "certain") {
    warnings.push(
      `Comparison confidence is '${confidence}'. Only 'certain' comparison text should be used for trait solving.`
    );
  }

  return {
    subject,
    confidence,
    isCertain: confidence === "certain",
    warnings,
    traits,
    traitCount: Object.keys(traits).length,
    overall,
    relationship,
    unrecognized
  };
}

export function parseComparisonText(text: string): ParsedComparisonBlock[] {
  return splitComparisonBlocks(text).map((block) => parseComparisonBlock(block));
}
