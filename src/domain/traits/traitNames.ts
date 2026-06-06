export const traitNames = [
  "Alertness",
  "Appetite",
  "Brutality",
  "Development",
  "Eluding",
  "Energy",
  "Evasion",
  "Ferocity",
  "Fortitude",
  "Insight",
  "Might",
  "Nimbleness",
  "Patience",
  "Procreation",
  "Sufficiency",
  "Targeting",
  "Toughness"
] as const;

export type TraitName = (typeof traitNames)[number];
