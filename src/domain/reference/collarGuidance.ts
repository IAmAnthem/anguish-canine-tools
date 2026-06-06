export type CollarKind = "trait" | "breeding" | "birth" | "utility";
export type CollarActivation =
  | "passive-reference"
  | "during-breeding"
  | "before-birth-through-litter";
export type CollarWearer = "unique-pet" | "female" | null;

export type CollarReference = {
  gem: string;
  kind: CollarKind;
  trait: string | null;
  activation: CollarActivation;
  wearer: CollarWearer;
  effect: string;
};

export type CollarGuidanceContext = "trait-reference" | "breeding" | "birth" | "utility-reference";

export type CollarSuggestion = {
  gem: string;
  kind: CollarKind;
  activation: CollarActivation;
  wearer: CollarWearer;
  trait: string | null;
  effect: string;
  guidanceOnly: true;
  mutatesInheritedTraits: false;
};

export type CollarValidationResult = {
  isValid: boolean;
  errors: string[];
};

const validKinds = new Set<CollarKind>(["trait", "breeding", "birth", "utility"]);
const validActivations = new Set<CollarActivation>([
  "passive-reference",
  "during-breeding",
  "before-birth-through-litter"
]);
const validWearers = new Set<CollarWearer>([null, "unique-pet", "female"]);

export function validateCollarReferences(
  collars: readonly CollarReference[]
): CollarValidationResult {
  const errors: string[] = [];

  collars.forEach((collar, index) => {
    if (!collar.gem) {
      errors.push(`Collar at index ${index} is missing gem.`);
    }

    if (!validKinds.has(collar.kind)) {
      errors.push(`Collar '${collar.gem}' has invalid kind '${collar.kind}'.`);
    }

    if (!validActivations.has(collar.activation)) {
      errors.push(`Collar '${collar.gem}' has invalid activation '${collar.activation}'.`);
    }

    if (!validWearers.has(collar.wearer)) {
      errors.push(`Collar '${collar.gem}' has invalid wearer '${collar.wearer}'.`);
    }

    if (collar.kind === "breeding" && collar.activation !== "during-breeding") {
      errors.push(`Breeding collar '${collar.gem}' must be active during breeding.`);
    }

    if (collar.kind === "birth" && collar.activation !== "before-birth-through-litter") {
      errors.push(`Birth collar '${collar.gem}' must be active before birth through the litter.`);
    }

    if (collar.kind === "birth" && collar.wearer !== "female") {
      errors.push(`Birth collar '${collar.gem}' must be worn by the female.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getCollarSuggestions(
  collars: readonly CollarReference[],
  context: CollarGuidanceContext
): CollarSuggestion[] {
  return collars
    .filter((collar) => collarMatchesContext(collar, context))
    .map(toSuggestion);
}

export function getBreedingCollarSuggestions(
  collars: readonly CollarReference[]
): CollarSuggestion[] {
  return getCollarSuggestions(collars, "breeding");
}

export function getBirthCollarSuggestions(collars: readonly CollarReference[]): CollarSuggestion[] {
  return getCollarSuggestions(collars, "birth");
}

export function getTraitCollarReferences(
  collars: readonly CollarReference[]
): CollarSuggestion[] {
  return getCollarSuggestions(collars, "trait-reference");
}

export function getUtilityCollarReferences(collars: readonly CollarReference[]): CollarSuggestion[] {
  return getCollarSuggestions(collars, "utility-reference");
}

function collarMatchesContext(collar: CollarReference, context: CollarGuidanceContext): boolean {
  if (context === "breeding") {
    return collar.kind === "breeding" && collar.activation === "during-breeding";
  }

  if (context === "birth") {
    return collar.kind === "birth" && collar.activation === "before-birth-through-litter";
  }

  if (context === "utility-reference") {
    return collar.kind === "utility" && collar.activation === "passive-reference";
  }

  return collar.kind === "trait" && collar.activation === "passive-reference";
}

function toSuggestion(collar: CollarReference): CollarSuggestion {
  return {
    gem: collar.gem,
    kind: collar.kind,
    activation: collar.activation,
    wearer: collar.wearer,
    trait: collar.trait,
    effect: collar.effect,
    guidanceOnly: true,
    mutatesInheritedTraits: false
  };
}
