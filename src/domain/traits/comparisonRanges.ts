export type ComparisonRange = {
  text: string;
  min: number;
  max: number;
};

export const comparisonRanges = [
  { text: "totally inferior", min: -1700, max: -71 },
  { text: "very inferior", min: -70, max: -20 },
  { text: "inferior", min: -19, max: -10 },
  { text: "slightly inferior", min: -9, max: -5 },
  { text: "marginally inferior", min: -4, max: -2 },
  { text: "barely inferior", min: -1, max: -1 },
  { text: "similar", min: 0, max: 0 },
  { text: "barely better", min: 1, max: 1 },
  { text: "marginally better", min: 2, max: 4 },
  { text: "slightly better", min: 5, max: 9 },
  { text: "better", min: 10, max: 19 },
  { text: "much better", min: 20, max: 70 },
  { text: "outstandingly better", min: 71, max: 1700 }
] as const satisfies readonly ComparisonRange[];
