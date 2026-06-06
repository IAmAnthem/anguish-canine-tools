import collars from "../data/reference/collars.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  getBirthCollarSuggestions,
  getBreedingCollarSuggestions,
  getTraitCollarReferences,
  getUtilityCollarReferences,
  validateCollarReferences,
  type CollarReference
} from "../src/domain/reference/collarGuidance.js";

const collarReferences = collars as CollarReference[];

describe("collar guidance", () => {
  it("validates the collar/gem reference data shape", () => {
    expect(validateCollarReferences(collarReferences)).toEqual({
      isValid: true,
      errors: []
    });
  });

  it("confirms collar categories are trait, breeding, birth, and utility", () => {
    const kinds = new Set(collarReferences.map((collar) => collar.kind));

    expect(kinds).toEqual(new Set(["trait", "breeding", "birth", "utility"]));
  });

  it("surfaces Opal/unique pet collar as breeding-time guidance only", () => {
    expect(getBreedingCollarSuggestions(collarReferences)).toEqual([
      {
        gem: "Opal",
        kind: "breeding",
        activation: "during-breeding",
        wearer: "unique-pet",
        trait: "Procreation",
        effect:
          "Unique pet collar: buffs Procreation during breeding. Litter-size impact applies when the female is the one wearing the collar; breeding success and crossbreed penalty may also be affected. Does not alter inherited trait numbers.",
        guidanceOnly: true,
        mutatesInheritedTraits: false
      }
    ]);
  });

  it("surfaces birth collars as female before-birth-through-litter guidance", () => {
    const suggestions = getBirthCollarSuggestions(collarReferences);

    expect(suggestions).toHaveLength(6);
    expect(suggestions.map((suggestion) => suggestion.gem)).toEqual([
      "Red",
      "Green",
      "Orange",
      "Purple",
      "Pink",
      "Blue"
    ]);
    expect(
      suggestions.every(
        (suggestion) =>
          suggestion.kind === "birth" &&
          suggestion.activation === "before-birth-through-litter" &&
          suggestion.wearer === "female" &&
          suggestion.guidanceOnly &&
          !suggestion.mutatesInheritedTraits
      )
    ).toBe(true);
  });

  it("keeps passive trait collars separate from breeding and birth actions", () => {
    const suggestions = getTraitCollarReferences(collarReferences);

    expect(suggestions).toHaveLength(16);
    expect(suggestions[0]).toMatchObject({
      gem: "Topaz",
      kind: "trait",
      activation: "passive-reference",
      wearer: null,
      trait: "Alertness",
      guidanceOnly: true,
      mutatesInheritedTraits: false
    });
  });

  it("keeps utility collars separate from timed breeding and birth actions", () => {
    expect(getUtilityCollarReferences(collarReferences)).toEqual([
      {
        gem: "Fine medicinal",
        kind: "utility",
        activation: "passive-reference",
        wearer: "unique-pet",
        trait: null,
        effect:
          "Preferred general-purpose ranger pet collar. Heals the pet over time while stocked; refill with herbs to keep the healing flowing.",
        guidanceOnly: true,
        mutatesInheritedTraits: false
      }
    ]);
  });

  it("rejects birth collar data that would imply trait mutation behavior", () => {
    const invalid = [
      {
        gem: "Red",
        kind: "birth",
        trait: null,
        activation: "during-breeding",
        wearer: "unique-pet",
        effect: "Wrong timing."
      }
    ] as CollarReference[];

    expect(validateCollarReferences(invalid)).toEqual({
      isValid: false,
      errors: [
        "Birth collar 'Red' must be active before birth through the litter.",
        "Birth collar 'Red' must be worn by the female."
      ]
    });
  });
});
