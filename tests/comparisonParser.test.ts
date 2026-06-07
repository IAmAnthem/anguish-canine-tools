import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseComparisonText } from "../src/domain/traits/comparisonParser.js";

const repoRoot = resolve(import.meta.dirname, "..");
const legacyRepo = resolve(repoRoot, "..", "CanineCalculations");

function readLegacyFixture(fileName: string): string {
  return readFileSync(resolve(legacyRepo, fileName), "utf8");
}

describe("comparison parser", () => {
  it("parses unknown-to-known validation comparison blocks", () => {
    const blocks = parseComparisonText(readLegacyFixture("Validation-UnknownToKnown.txt"));

    expect(blocks).toHaveLength(8);
    expect(blocks[0].subject).toBe("fox 2");
    expect(blocks[0].confidence).toBe("certain");
    expect(blocks[0].isCertain).toBe(true);
    expect(blocks[0].traitCount).toBe(17);
    expect(blocks[0].traits.Alertness).toEqual({
      text: "marginally better",
      min: 2,
      max: 4,
      recognized: true
    });
    expect(blocks[0].overall?.text).toBe("slightly inferior");
    expect(blocks[0].relationship).toBe("closely related");

    for (const block of blocks) {
      expect(block.traitCount).toBe(17);
      expect(block.overall).not.toBeNull();
      expect(block.relationship).not.toBeNull();
      expect(block.unrecognized).toEqual([]);
    }
  });

  it("parses known-to-unknown validation comparison blocks", () => {
    const blocks = parseComparisonText(readLegacyFixture("Validation-KnownToUnknown.txt"));

    expect(blocks).toHaveLength(10);
    expect(blocks[0].subject).toBe("Fireball");
    expect(blocks[0].confidence).toBe("certain");
    expect(blocks[0].traitCount).toBe(17);
    expect(blocks[0].traits.Alertness).toEqual({
      text: "marginally inferior",
      min: -4,
      max: -2,
      recognized: true
    });
    expect(blocks[0].overall?.text).toBe("slightly better");

    for (const block of blocks) {
      expect(block.traitCount).toBe(17);
      expect(block.overall).not.toBeNull();
      expect(block.relationship).not.toBeNull();
      expect(block.unrecognized).toEqual([]);
    }
  });

  it("marks non-certain comparison text as unsafe for solving", () => {
    const blocks = parseComparisonText(`
You think that fox 2 is:
 Alertness seems similar.
Overall she seems to be similar.
They seem to be unrelated.
`);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].subject).toBe("fox 2");
    expect(blocks[0].confidence).toBe("think");
    expect(blocks[0].isCertain).toBe(false);
    expect(blocks[0].warnings).toHaveLength(1);
  });

  it("captures visible compare descriptions and relationship context", () => {
    const blocks = parseComparisonText(`
Songs1113 sniffs at a very large pearl trained fox.
compare petname to fox 2 out loud
You look hard at a very large frosted silver trained fox comparing to a very
large pearl trained fox ...
You are certain that Songs1113 is:
 Alertness seems barely better.
 Appetite seems marginally inferior.
 Brutality seems marginally inferior.
 Development seems barely inferior.
 Eluding seems slightly better.
 Energy seems slightly inferior.
 Evasion seems similar.
 Ferocity seems slightly inferior.
 Fortitude seems slightly inferior.
 Insight seems marginally better.
 Might seems better.
 Nimbleness seems barely inferior.
 Patience seems marginally better.
 Procreation seems marginally better.
 Sufficiency seems slightly better.
 Targeting seems similar.
 Toughness seems slightly inferior.
Overall he seems to be slightly inferior.
They seem to be unrelated.
`);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].examinedDescription).toBe("a very large frosted silver trained fox");
    expect(blocks[0].referenceDescription).toBe("a very large pearl trained fox");
    expect(blocks[0].sniffedDescription).toBe("a very large pearl trained fox");
    expect(blocks[0].relationship).toBe("unrelated");
  });
});
