import { formatValue, type CanineSummary, type DataStore, type Gender, type RecordStatus, type TraitValue } from "./dataStore.js";

export type DataBrowserFilters = {
  query: string;
  gender: "all" | Gender;
  status: "all" | RecordStatus;
  humanId: "all" | string;
  minTotal: number | null;
  minProcreation: number | null;
  primaryColor: "all" | string;
  secondaryColor: "all" | string;
  eyeColor: "all" | string;
  knownAppearanceOnly: boolean;
};

export type DataBrowserRow = CanineSummary & {
  searchText: string;
  totalSortValue: number;
  procreationSortValue: number;
  appearanceLabel: string;
  primaryColorLabel: string;
  secondaryColorLabel: string;
  eyeColorLabel: string;
  hasKnownAppearance: boolean;
};

export type DataBrowserOption = {
  value: string;
  label: string;
};

export type DataBrowserResult = {
  rows: DataBrowserRow[];
  selected: DataBrowserRow | null;
  genderOptions: DataBrowserOption[];
  statusOptions: DataBrowserOption[];
  humanOptions: DataBrowserOption[];
  primaryColorOptions: DataBrowserOption[];
  secondaryColorOptions: DataBrowserOption[];
  eyeColorOptions: DataBrowserOption[];
};

export const defaultDataBrowserFilters: DataBrowserFilters = {
  query: "",
  gender: "all",
  status: "all",
  humanId: "all",
  minTotal: null,
  minProcreation: null,
  primaryColor: "all",
  secondaryColor: "all",
  eyeColor: "all",
  knownAppearanceOnly: false
};

export function getDataBrowserResult(
  store: DataStore,
  filters: DataBrowserFilters,
  selectedCanineId: string
): DataBrowserResult {
  const allRows = store.data.canonical.canines
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary))
    .map(createDataBrowserRow)
    .sort(sortDataBrowserRows);
  const rows = allRows.filter((row) => matchesDataBrowserFilters(row, filters));
  const selected = selectedCanineId ? rows.find((row) => row.canine.id === selectedCanineId) ?? null : null;

  return {
    rows,
    selected,
    genderOptions: buildOptions(allRows.map((row) => row.canine.gender), formatGenderOption),
    statusOptions: buildOptions(allRows.map((row) => row.canine.status), formatStatusOption),
    humanOptions: buildHumanOptions(allRows),
    primaryColorOptions: buildOptions(allRows.map((row) => row.primaryColorLabel), formatAppearanceOption),
    secondaryColorOptions: buildOptions(allRows.map((row) => row.secondaryColorLabel), formatAppearanceOption),
    eyeColorOptions: buildOptions(allRows.map((row) => row.eyeColorLabel), formatAppearanceOption)
  };
}

export function createDataBrowserRow(summary: CanineSummary): DataBrowserRow {
  const totalSortValue = numericSortValue(summary.traitProfile?.total);
  const procreationSortValue = numericSortValue(summary.traitProfile?.traits?.Procreation);
  const appearanceLabel = formatAppearance(summary.canine.appearance);
  const primaryColorLabel = formatAppearanceField(summary.canine.appearance?.primaryColor);
  const secondaryColorLabel = formatAppearanceField(summary.canine.appearance?.secondaryColor);
  const eyeColorLabel = formatAppearanceField(summary.canine.appearance?.eyeColor);
  const hasKnownAppearance = [primaryColorLabel, secondaryColorLabel, eyeColorLabel].some((value) => value !== "unknown");
  const searchText = [
    summary.canine.displayName,
    summary.canine.callName,
    summary.canine.id,
    summary.canine.gender,
    summary.canine.status,
    summary.canine.canineType,
    summary.character?.name,
    summary.human?.displayName,
    appearanceLabel
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();

  return {
    ...summary,
    totalSortValue,
    procreationSortValue,
    appearanceLabel,
    primaryColorLabel,
    secondaryColorLabel,
    eyeColorLabel,
    hasKnownAppearance,
    searchText
  };
}

export function matchesDataBrowserFilters(row: DataBrowserRow, filters: DataBrowserFilters): boolean {
  const queryTokens = filters.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (queryTokens.some((token) => !row.searchText.includes(token))) {
    return false;
  }

  if (filters.gender !== "all" && row.canine.gender !== filters.gender) {
    return false;
  }

  if (filters.status !== "all" && row.canine.status !== filters.status) {
    return false;
  }

  if (filters.humanId !== "all" && row.human?.id !== filters.humanId) {
    return false;
  }

  if (filters.minTotal !== null && row.totalSortValue < filters.minTotal) {
    return false;
  }

  if (filters.minProcreation !== null && row.procreationSortValue < filters.minProcreation) {
    return false;
  }

  if (filters.primaryColor !== "all" && row.primaryColorLabel !== filters.primaryColor) {
    return false;
  }

  if (filters.secondaryColor !== "all" && row.secondaryColorLabel !== filters.secondaryColor) {
    return false;
  }

  if (filters.eyeColor !== "all" && row.eyeColorLabel !== filters.eyeColor) {
    return false;
  }

  if (filters.knownAppearanceOnly && !row.hasKnownAppearance) {
    return false;
  }

  return true;
}

export function formatAppearance(appearance: CanineSummary["canine"]["appearance"]): string {
  return [
    `primary ${formatAppearanceField(appearance?.primaryColor)}`,
    `secondary ${formatAppearanceField(appearance?.secondaryColor)}`,
    `eyes ${formatAppearanceField(appearance?.eyeColor)}`
  ].join(", ");
}

export function formatTraitValue(value: TraitValue | undefined): string {
  return formatValue(value);
}

function sortDataBrowserRows(left: DataBrowserRow, right: DataBrowserRow): number {
  return (
    right.totalSortValue - left.totalSortValue ||
    right.procreationSortValue - left.procreationSortValue ||
    left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" })
  );
}

function numericSortValue(value: TraitValue | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    return (value.min + value.max) / 2;
  }

  return Number.NEGATIVE_INFINITY;
}

function buildOptions(values: readonly string[], formatLabel: (value: string) => string): DataBrowserOption[] {
  return Array.from(new Set(values))
    .sort((left, right) => formatLabel(left).localeCompare(formatLabel(right), undefined, { sensitivity: "base" }))
    .map((value) => ({ value, label: formatLabel(value) }));
}

function formatAppearanceField(value: string | null | undefined): string {
  return value?.trim() || "unknown";
}

function formatAppearanceOption(value: string): string {
  return value;
}

function buildHumanOptions(rows: readonly DataBrowserRow[]): DataBrowserOption[] {
  const optionsById = new Map<string, string>();

  for (const row of rows) {
    if (row.human) {
      optionsById.set(row.human.id, row.human.displayName);
    }
  }

  return Array.from(optionsById.entries())
    .sort((left, right) => left[1].localeCompare(right[1], undefined, { sensitivity: "base" }))
    .map(([value, label]) => ({ value, label }));
}

function formatGenderOption(value: string): string {
  if (value === "M") {
    return "Male";
  }

  if (value === "F") {
    return "Female";
  }

  if (value === "A") {
    return "Any/neutral";
  }

  if (value === "U") {
    return "Unknown";
  }

  return value;
}

function formatStatusOption(value: string): string {
  return value.replaceAll("-", " ");
}
