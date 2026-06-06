import {
  filterBreedingCanineOptions,
  getBreedingCanineOptions,
  planBreedingForCanine,
  type BreedingCanineOption,
  type PlannerCandidate
} from "./app/breedingPlanner.js";
import {
  defaultDataBrowserFilters,
  formatTraitValue,
  getDataBrowserResult,
  type DataBrowserFilters,
  type DataBrowserRow
} from "./app/dataBrowser.js";
import { createDataStore, type CanineSummary, type DataStore } from "./app/dataStore.js";
import { createHerdHealthReport, type HerdHealthReport } from "./app/herdHealth.js";
import {
  analyzeAssortativeMates,
  analyzeCompensatoryMates,
  analyzeOcsMates,
  type AssortativeCandidate,
  getAlgorithmCanineOptions,
  type CompensatoryCandidate,
  type OcsCandidate,
  type MatingAlgorithmId
} from "./app/matingAlgorithms.js";
import {
  createDefaultMultiStepPlanViewModel,
  createMultiStepPlanExport,
  parseActualPuppyStats,
  parseMultiStepPlanExportText,
  validateMultiStepPlanExport,
  type ActualPuppyInput,
  type MultiStepPlanStepView,
  type PlanParentOverride
} from "./app/multiStepPlan.js";
import {
  createCalculatorHistoryEntry,
  filterKnownCanineOptions,
  getKnownCanineOptions,
  solveCalculatorInput,
  solveCalculatorHistory,
  type CalculatorDirectionMode,
  type CalculatorHistoryEntry,
  type KnownCanineOption
} from "./app/traitCalculator.js";
import { compareLineage } from "./domain/lineage/lineage.js";
import {
  getBirthCollarSuggestions,
  getBreedingCollarSuggestions,
  getTraitCollarReferences,
  getUtilityCollarReferences,
  type CollarSuggestion
} from "./domain/reference/collarGuidance.js";
import { traitNames } from "./domain/traits/traitNames.js";

type AppView = "calculator" | "planner" | "multi-step" | "browser" | "curate" | "herd" | "algorithms" | "guidance" | "contribute";
type CuratedCanineStatus = "active" | "inactive" | "unknown";
type CurationMode = "status" | "ownership";

type ViewDefinition = {
  id: AppView;
  label: string;
  eyebrow: string;
  title: string;
  status: string;
  items: string[];
};

const views: ViewDefinition[] = [
  {
    id: "calculator",
    label: "Calculator",
    eyebrow: "Trait solving",
    title: "Canine calculator",
    status: "Ready for the tested parser and solver workflow.",
    items: ["Known canine", "Direction", "Comparison text", "Solved result"]
  },
  {
    id: "planner",
    label: "Planner",
    eyebrow: "Breeding choices",
    title: "Breeding planner",
    status: "Ready for relationship, availability, and ranking logic.",
    items: ["Selected canine", "Candidate mates", "Relationship safety", "Puppy estimate"]
  },
  {
    id: "multi-step",
    label: "Multi-Step",
    eyebrow: "Population lift",
    title: "Multi-step plan",
    status: "First pass for three-step ancestry flushing and carry-forward planning.",
    items: ["Step 1", "Step 2", "Step 3", "Final summary"]
  },
  {
    id: "browser",
    label: "Data",
    eyebrow: "Canonical records",
    title: "Canine data",
    status: "Ready for searchable public records.",
    items: ["Canines", "Owners", "Traits", "Lineage"]
  },
  {
    id: "curate",
    label: "Curate",
    eyebrow: "Records management",
    title: "Status curation",
    status: "Find records where legacy active flags conflict with current game rules.",
    items: ["Warnings", "Characters", "Status", "Patch export"]
  },
  {
    id: "herd",
    label: "Herd Health",
    eyebrow: "Population view",
    title: "Herd genetic health",
    status: "First pass at active-pool coverage, relatedness pressure, and constrained bloodlines.",
    items: ["Active pool", "Relatedness", "Ancestors", "Mate options"]
  },
  {
    id: "algorithms",
    label: "Algorithms",
    eyebrow: "Mate finder",
    title: "Mating algorithms",
    status: "Compensatory, positive assortative, and first-pass OCS ranking are all available for side-by-side mate review.",
    items: ["Algorithm", "Target canine", "Ranked mates", "Tradeoffs"]
  },
  {
    id: "guidance",
    label: "Guidance",
    eyebrow: "Reference notes",
    title: "Collars and setup",
    status: "Ready for breeding-time and birth-time reminders.",
    items: ["Trait collars", "Breeding collar", "Birth collars", "Timing"]
  },
  {
    id: "contribute",
    label: "Contribute",
    eyebrow: "Community data",
    title: "Help refresh the breeding pool",
    status: "The current data is useful but stale; active players can make it much better.",
    items: ["Spreadsheet exports", "Status updates", "Trait metrics", "Corrections"]
  }
];

let activeView: AppView = "calculator";
const dataStore = createDataStore();
const knownCanineOptions = getKnownCanineOptions(dataStore);
const breedingCanineOptions = getBreedingCanineOptions(dataStore);
const algorithmCanineOptions = getAlgorithmCanineOptions(dataStore);
const knownCanineSelectId = "known-canine-select";
const breedingTargetSelectId = "breeding-target-select";
const calculatorState: {
  selectedKnownId: string;
  knownFilter: string;
  directionMode: CalculatorDirectionMode;
  comparisonText: string;
  resultName: string;
  history: CalculatorHistoryEntry[];
  draftWarnings: string[];
} = {
  selectedKnownId: knownCanineOptions[0]?.canineId ?? "",
  knownFilter: "",
  directionMode: "auto",
  comparisonText: "",
  resultName: "",
  history: [],
  draftWarnings: []
};
const plannerState: {
  selectedTargetId: string;
  targetFilter: string;
  selectedCandidateId: string;
  includeRelatedCandidates: boolean;
  includeSameHumanCandidates: boolean;
} = {
  selectedTargetId:
    breedingCanineOptions.find((option) => option.canineId === "canine-an-untraited-canine")?.canineId ??
    breedingCanineOptions[0]?.canineId ??
    "",
  targetFilter: "",
  selectedCandidateId: "",
  includeRelatedCandidates: false,
  includeSameHumanCandidates: false
};
const multiStepState = {
  activeStepIndex: 0,
  editingPuppyId: "",
  selectedPuppySlotByStep: {} as Record<string, string>,
  actualPuppiesById: {} as Record<string, ActualPuppyInput>,
  parentOverridesByStep: {} as Record<string, PlanParentOverride>,
  exportText: "",
  importText: "",
  importWarnings: [] as string[]
};
const dataBrowserState: {
  filters: DataBrowserFilters;
  selectedCanineId: string;
} = {
  filters: { ...defaultDataBrowserFilters },
  selectedCanineId: ""
};
const curationState: {
  mode: CurationMode;
  statusUpdatesByCanineId: Record<string, CuratedCanineStatus>;
  humanUpdatesByCharacterId: Record<string, string | null>;
  copiedPatch: boolean;
} = {
  mode: "status",
  statusUpdatesByCanineId: {},
  humanUpdatesByCharacterId: {},
  copiedPatch: false
};
const algorithmState: {
  selectedAlgorithm: MatingAlgorithmId;
  selectedTargetId: string;
  prioritizedTrait: "" | (typeof traitNames)[number];
  priorityWeight: number;
} = {
  selectedAlgorithm: "compensatory",
  selectedTargetId: algorithmCanineOptions[0]?.canineId ?? "",
  prioritizedTrait: "",
  priorityWeight: 3
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

function render(): void {
  const root = document.querySelector<HTMLDivElement>("#app");

  if (!root) {
    throw new Error("App root not found.");
  }

  root.textContent = "";
  root.append(createShell());
}

function createShell(): HTMLElement {
  const shell = createElement("main", "app-shell");
  const header = createHeader(dataStore);
  const layout = createElement("section", activeView === "curate" ? "workspace workspace-wide" : "workspace");
  const nav = createNavigation();
  const panel = createPanel(views.find((view) => view.id === activeView) ?? views[0], dataStore);

  layout.append(nav, panel);
  shell.append(header, layout);

  return shell;
}

function createHeader(store: DataStore): HTMLElement {
  const header = createElement("header", "app-header");
  const titleGroup = createElement("div", "title-group");
  const eyebrow = createElement("p", "eyebrow", "Ancient Anguish");
  const title = createElement("h1", undefined, "Canine Tools");
  const summary = createElement(
    "p",
    "summary",
    "A small public workspace for canine trait solving, breeding checks, and shared reference data."
  );
  const status = createElement("div", "status-strip");
  const statusItems = [
    ["Canines", String(store.stats.canines)],
    ["Active", String(store.stats.activeCanines)],
    ["Profiles", String(store.stats.knownTraitProfiles)],
    ["Refs", String(store.stats.collarReferences)],
    ["Data", store.integrity.isValid ? "Verified" : "Needs Work"]
  ];

  for (const [label, value] of statusItems) {
    const item = createElement("div", "status-item");
    item.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    status.append(item);
  }

  titleGroup.append(eyebrow, title, summary);
  header.append(titleGroup, status);

  return header;
}

function createNavigation(): HTMLElement {
  const nav = createElement("nav", "view-tabs");
  nav.setAttribute("aria-label", "Primary views");

  for (const view of views) {
    const button = createElement("button", "tab-button", view.label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(view.id === activeView));
    button.addEventListener("click", () => {
      activeView = view.id;
      render();
    });
    nav.append(button);
  }

  return nav;
}

function createPanel(view: ViewDefinition, store: DataStore): HTMLElement {
  const panel = createElement("article", "view-panel");
  const header = createElement("div", "panel-header");
  const eyebrow = createElement("p", "eyebrow", view.eyebrow);
  const title = createElement("h2", undefined, view.title);
  const status = createElement("p", "panel-status", view.status);

  header.append(eyebrow, title, status);
  panel.append(header);

  if (view.id === "browser" || !store.integrity.isValid) {
    panel.append(createDataHealthPanel(store));
  }

  if (view.id === "calculator") {
    panel.append(createCalculatorWorkflow());
  } else if (view.id === "planner") {
    panel.append(createPlannerWorkflow());
  } else if (view.id === "multi-step") {
    panel.append(createMultiStepWorkflow());
  } else if (view.id === "browser") {
    panel.append(createDataBrowserWorkflow(store));
  } else if (view.id === "curate") {
    panel.append(createCurationWorkflow(store));
  } else if (view.id === "herd") {
    panel.append(createHerdHealthWorkflow(store));
  } else if (view.id === "algorithms") {
    panel.append(createMatingAlgorithmsWorkflow(store));
  } else if (view.id === "guidance") {
    panel.append(createGuidanceWorkflow(store));
  } else {
    panel.append(createContributorWorkflow());
  }

  return panel;
}

function createGuidanceWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  const breeding = getBreedingCollarSuggestions(store.data.reference.collars);
  const birth = getBirthCollarSuggestions(store.data.reference.collars);
  const traits = getTraitCollarReferences(store.data.reference.collars);
  const utility = getUtilityCollarReferences(store.data.reference.collars);

  section.append(
    createElement("h3", undefined, "Reference guidance"),
    createGuidanceNotice(),
    createCollarActionPanel("Breeding-time collar", breeding, "Use during the breeding action."),
    createCollarActionPanel("Birth-time collars", birth, "Put on the female before birth and remove after all pups are born."),
    createCollarActionPanel("Utility collars", utility, "General pet-care references outside breeding and birth timing."),
    createTraitCollarReferenceTable(traits)
  );

  return section;
}

function createContributorWorkflow(): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");

  section.append(
    createElement("h3", undefined, "Contribute data"),
    createContributorNotice(),
    createContributorIssueLink(),
    createContributorPanel("Best data source", [
      "Spreadsheet exports from active players are the preferred intake path.",
      "Google Sheets, Excel, CSV, or copied table data are all useful if the columns are labeled.",
      "GitHub Issues are better for one-off corrections than large breeding-pool refreshes."
    ]),
    createContributorPanel("Most useful columns", [
      "Human/player, character, canine call name, gender, and current availability status: active, inactive, or unknown.",
      "Full 17-trait block when available; total and Procreation can be derived from complete trait rows.",
      "Lineage: sire, dam, and grandparents where known.",
      "Appearance: primary color, secondary color, and eye color.",
      "Source or observed date, especially when data came from delayed player tools."
    ]),
    createContributorPanel("Status matters", [
      "Active canines surface in breeding and planning tools.",
      "Inactive canines remain useful history but should not appear as current breeding candidates.",
      "Unknown status is acceptable when a record is old but not confirmed gone."
    ]),
    createContributorPanel("Derived metrics", [
      "Send formulas for tanking score, bashing score, or any other summarized subtotals the community finds useful.",
      "These formulas can be added once active rangers agree on the trait groups.",
      "The canonical data should keep raw traits; the app can calculate the preferred summary scores."
    ])
  );

  return section;
}

function createContributorIssueLink(): HTMLElement {
  const panel = createElement("section", "data-health data-health-ok");
  const link = document.createElement("a");
  link.href = "https://github.com/IAmAnthem/anguish-canine-tools/issues";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Open GitHub Issues";

  panel.append(
    createElement("h3", undefined, "Corrections and small submissions"),
    createElement("p", undefined, "Use GitHub Issues for bad records, missing details, or small data corrections."),
    link
  );

  return panel;
}

function createContributorNotice(): HTMLElement {
  const notice = createElement("section", "warning-box");
  notice.append(
    createElement("h3", undefined, "Data is stale"),
    createElement(
      "p",
      undefined,
      "This site started from legacy records. It needs current player data before the breeding recommendations can reflect the live game."
    )
  );

  return notice;
}

function createContributorPanel(title: string, lines: readonly string[]): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of lines) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(createElement("h3", undefined, title), list);
  return panel;
}

type ActiveCanineConflict = {
  characterName: string;
  humanName: string;
  activeCanines: CanineSummary[];
};

type CanineStatusPatchUpdate = {
  canineId: string;
  status: CuratedCanineStatus;
};

type OwnershipReviewEntry = {
  characterId: string;
  characterName: string;
  currentHumanId: string | null;
  currentHumanLabel: string;
  canines: CanineSummary[];
};

type CharacterHumanPatchUpdate = {
  characterId: string;
  humanId: string | null;
};

function createCurationWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  section.append(createElement("h3", undefined, "Records curation"), createCurationModeToggle());

  if (curationState.mode === "status") {
    const conflicts = getActiveCanineConflicts(store);
    section.append(
      createCurationNotice(conflicts.length),
      createActiveCanineConflictTable(conflicts),
      createPendingStatusPatchPanel(store)
    );
  } else {
    const entries = getOwnershipReviewEntries(store);
    section.append(
      createOwnershipReviewNotice(entries.length),
      createOwnershipReviewTable(store, entries),
      createPendingHumanPatchPanel(store)
    );
  }

  return section;
}

function createMatingAlgorithmsWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section algorithm-workflow");
  const controls = createElement("div", "field-grid algorithm-controls");
  const algorithmSelect = createElement("select", "field-control");
  const targetSelect = createElement("select", "field-control");
  const prioritySelect = createElement("select", "field-control");
  const weightSelect = createElement("select", "field-control");
  const isPriorityApplicable = algorithmState.selectedAlgorithm !== "ocs";

  for (const algorithm of [
    ["compensatory", "Compensatory"],
    ["assortative", "Positive assortative"],
    ["ocs", "Optimum contribution"]
  ] as const) {
    const option = document.createElement("option");
    option.value = algorithm[0];
    option.textContent = algorithm[1];
    option.selected = algorithmState.selectedAlgorithm === algorithm[0];
    algorithmSelect.append(option);
  }

  algorithmSelect.addEventListener("change", () => {
    algorithmState.selectedAlgorithm = algorithmSelect.value as MatingAlgorithmId;
    render();
  });

  for (const optionData of algorithmCanineOptions) {
    const option = document.createElement("option");
    option.value = optionData.canineId;
    option.textContent = optionData.label;
    option.selected = algorithmState.selectedTargetId === optionData.canineId;
    targetSelect.append(option);
  }

  targetSelect.addEventListener("change", () => {
    algorithmState.selectedTargetId = targetSelect.value;
    render();
  });

  {
    const automaticOption = document.createElement("option");
    automaticOption.value = "";
    automaticOption.textContent = "Automatic";
    automaticOption.selected = algorithmState.prioritizedTrait === "";
    prioritySelect.append(automaticOption);

    for (const traitName of traitNames) {
      const option = document.createElement("option");
      option.value = traitName;
      option.textContent = traitName;
      option.selected = algorithmState.prioritizedTrait === traitName;
      prioritySelect.append(option);
    }
  }

  prioritySelect.addEventListener("change", () => {
    algorithmState.prioritizedTrait = prioritySelect.value as typeof algorithmState.prioritizedTrait;
    render();
  });

  for (let weight = 2; weight <= 10; weight += 1) {
    const option = document.createElement("option");
    option.value = String(weight);
    option.textContent = `${weight}x`;
    option.selected = algorithmState.priorityWeight === weight;
    weightSelect.append(option);
  }

  weightSelect.addEventListener("change", () => {
    algorithmState.priorityWeight = Number(weightSelect.value);
    render();
  });

  prioritySelect.disabled = !isPriorityApplicable;
  weightSelect.disabled = !isPriorityApplicable;

  controls.append(
    createLabel("Algorithm", algorithmSelect),
    createLabel("Target canine", targetSelect),
    createLabel("Priority trait", prioritySelect, !isPriorityApplicable),
    createLabel("Priority weight", weightSelect, !isPriorityApplicable)
  );
  section.append(controls);

  if (algorithmState.selectedAlgorithm === "compensatory") {
    section.append(createCompensatoryAlgorithmOutput(store));
  } else if (algorithmState.selectedAlgorithm === "assortative") {
    section.append(createAssortativeAlgorithmOutput(store));
  } else {
    section.append(createOcsAlgorithmOutput(store));
  }

  return section;
}

function createCompensatoryAlgorithmOutput(store: DataStore): HTMLElement {
  const analysis = analyzeCompensatoryMates(store, algorithmState.selectedTargetId, {
    priorityTrait: algorithmState.prioritizedTrait || null,
    priorityWeight: algorithmState.priorityWeight
  });
  const section = createElement("section", "candidate-detail");

  if (!analysis) {
    section.append(
      createElement("h3", undefined, "Compensatory pairing"),
      createElement("p", undefined, "Choose an active male or female canine with known stats to rank safe mates.")
    );
    return section;
  }

  const summaryCards = createElement("div", "result-cards");
  for (const [label, value, tooltip] of [
    ["Target", analysis.selectedLabel, "The active canine whose weaknesses we are trying to cover."],
    ["Weak spots shown", String(analysis.weaknessTraits.length), "Lowest recorded traits used to explain the compensatory ranking."],
    ["Safe candidates", String(analysis.candidates.length), "Opposite-gender active mates that remain after relatedness and same-human filters."],
    ["Algorithm", "Compensatory", "Prefers mates that are strongest where the target canine is weakest."],
    [
      "Priority",
      algorithmState.prioritizedTrait || "Automatic",
      "Optional trait emphasis. When set, the selected trait is weighted in the mate ranking."
    ],
    [
      "Weight",
      `${algorithmState.priorityWeight}x`,
      "Multiplier applied to the selected priority trait when ranking mates."
    ]
  ] as const) {
    const card = createElement("div", "result-card");
    card.title = tooltip;
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    summaryCards.append(card);
  }

  section.append(
    createElement("h3", undefined, "Compensatory pairing"),
    createElement(
      "p",
      "plan-note",
      "This first-pass ranking looks for safe mates whose strongest traits land where the selected canine is weakest."
    ),
    summaryCards,
    createWeaknessSummaryPanel(analysis.weaknessTraits)
  );

  if (analysis.warnings.length > 0) {
    section.append(createWarnings(analysis.warnings));
  }

  section.append(createCompensatoryCandidateTable(analysis.candidates));

  return section;
}

function createOcsAlgorithmOutput(store: DataStore): HTMLElement {
  const analysis = analyzeOcsMates(store, algorithmState.selectedTargetId);
  const section = createElement("section", "candidate-detail");

  if (!analysis) {
    section.append(
      createElement("h3", undefined, "Optimum contribution selection"),
      createElement("p", undefined, "Choose an active male or female canine with known stats to rank safe mates.")
    );
    return section;
  }

  const summaryCards = createElement("div", "result-cards");
  for (const [label, value, tooltip] of [
    ["Target", analysis.selectedLabel, "The active canine being matched against herd-preserving mate choices."],
    ["Safe candidates", String(analysis.candidates.length), "Opposite-gender active mates that remain after relatedness and same-human filters."],
    ["Algorithm", "OCS", "Balances estimated puppy quality against herd concentration and future flexibility penalties."],
    ["Goal", "Herd balance", "Favors improvement without pouring too much progress into already dominant lines."]
  ] as const) {
    const card = createElement("div", "result-card");
    card.title = tooltip;
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    summaryCards.append(card);
  }

  section.append(
    createElement("h3", undefined, "Optimum contribution selection"),
    createElement(
      "p",
      "plan-note",
      "This first pass treats OCS as quality minus diversity penalties: better puppies still matter, but repeated bloodlines and constrained lines are pushed downward."
    ),
    summaryCards
  );

  if (analysis.warnings.length > 0) {
    section.append(createWarnings(analysis.warnings));
  }

  section.append(createOcsCandidateTable(analysis.candidates));

  return section;
}

function createAssortativeAlgorithmOutput(store: DataStore): HTMLElement {
  const analysis = analyzeAssortativeMates(store, algorithmState.selectedTargetId, {
    priorityTrait: algorithmState.prioritizedTrait || null,
    priorityWeight: algorithmState.priorityWeight
  });
  const section = createElement("section", "candidate-detail");

  if (!analysis) {
    section.append(
      createElement("h3", undefined, "Positive assortative mating"),
      createElement("p", undefined, "Choose an active male or female canine with known stats to rank safe mates.")
    );
    return section;
  }

  const summaryCards = createElement("div", "result-cards");
  for (const [label, value, tooltip] of [
    ["Target", analysis.selectedLabel, "The active canine whose strongest traits we are trying to intensify."],
    ["Strong traits shown", String(analysis.targetStrengthTraits.length), "Highest recorded traits used to explain the assortative ranking."],
    ["Safe candidates", String(analysis.candidates.length), "Opposite-gender active mates that remain after relatedness and same-human filters."],
    ["Algorithm", "Positive assortative", "Prefers mates that are already strongest in the same areas as the target canine."],
    [
      "Priority",
      algorithmState.prioritizedTrait || "Automatic",
      "Optional trait emphasis. When set, the selected trait is weighted in the mate ranking."
    ],
    [
      "Weight",
      `${algorithmState.priorityWeight}x`,
      "Multiplier applied to the selected priority trait when ranking mates."
    ]
  ] as const) {
    const card = createElement("div", "result-card");
    card.title = tooltip;
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    summaryCards.append(card);
  }

  section.append(
    createElement("h3", undefined, "Positive assortative mating"),
    createElement(
      "p",
      "plan-note",
      "This ranking looks for safe mates that reinforce the target canine's best traits, which can push a line upward quickly but may narrow future diversity."
    ),
    summaryCards,
    createStrengthSummaryPanel(analysis.targetStrengthTraits)
  );

  if (analysis.warnings.length > 0) {
    section.append(createWarnings(analysis.warnings));
  }

  section.append(createAssortativeCandidateTable(analysis.candidates));

  return section;
}

function createWeaknessSummaryPanel(weaknessTraits: ReadonlyArray<{ traitName: string; value: number }>): HTMLElement {
  const panel = createElement("section", "plan-panel");
  panel.append(createElement("h3", undefined, "Target weak traits"));

  if (weaknessTraits.length === 0) {
    panel.append(createElement("p", undefined, "No exact trait profile is available for this target."));
    return panel;
  }

  const list = createElement(
    "p",
    undefined,
    weaknessTraits.map((entry) => `${entry.traitName} ${entry.value}`).join(" | ")
  );
  panel.append(list);

  return panel;
}

function createStrengthSummaryPanel(strengthTraits: ReadonlyArray<{ traitName: string; value: number }>): HTMLElement {
  const panel = createElement("section", "plan-panel");
  panel.append(createElement("h3", undefined, "Target strong traits"));

  if (strengthTraits.length === 0) {
    panel.append(createElement("p", undefined, "No exact trait profile is available for this target."));
    return panel;
  }

  panel.append(
    createElement(
      "p",
      undefined,
      strengthTraits.map((entry) => `${entry.traitName} ${entry.value}`).join(" | ")
    )
  );

  return panel;
}

function createCompensatoryCandidateTable(candidates: readonly CompensatoryCandidate[]): HTMLElement {
  const section = createElement("section", "data-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const headerTooltips = new Map<string, string>([
    ["Candidate", "The safe mate candidate being ranked against the selected target canine."],
    ["Owner", "Current human assignment for that candidate, if known."],
    ["Score", "A relative compensatory score. Higher means this candidate covers more of the target canine's weak traits, especially the weakest ones."],
    ["Offset 1", "Strongest trait where this candidate improves on the target canine."],
    ["Offset 2", "Second-strongest trait where this candidate improves on the target canine."],
    ["Offset 3", "Third-strongest trait where this candidate improves on the target canine."],
    ["Puppy estimate", "Estimated puppy TOTAL and Procreation from this pairing, shown as total / procreation."]
  ]);

  for (const label of ["Candidate", "Owner", "Score", "Offset 1", "Offset 2", "Offset 3", "Puppy estimate"]) {
    const cell = createElement("th", undefined, label);
    const tooltip = headerTooltips.get(label);
    if (tooltip) {
      cell.title = tooltip;
    }
    headRow.append(cell);
  }
  head.append(headRow);

  if (candidates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No safe compensatory mates found with the current filters and data coverage.");
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }

  for (const entry of candidates.slice(0, 12)) {
    const [offsetOne, offsetTwo, offsetThree] = entry.strongestImprovements;
    const row = document.createElement("tr");
    const offsetOneCell = createPriorityAwareOffsetCell(offsetOne);
    const offsetTwoCell = createPriorityAwareOffsetCell(offsetTwo);
    const offsetThreeCell = createPriorityAwareOffsetCell(offsetThree);
    row.append(
      createElement("td", undefined, entry.candidate.canine.displayName),
      createElement("td", undefined, entry.candidate.humanName),
      createElement("td", "numeric-cell", entry.score.toFixed(1)),
      offsetOneCell,
      offsetTwoCell,
      offsetThreeCell,
      createElement(
        "td",
        "numeric-cell",
        entry.candidate.estimate?.traitTotal && entry.candidate.estimate?.procreation
          ? `${Math.round(entry.candidate.estimate.traitTotal)} / ${Math.round(entry.candidate.estimate.procreation)}`
          : "unknown"
      )
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(table);

  return section;
}

function createAssortativeCandidateTable(candidates: readonly AssortativeCandidate[]): HTMLElement {
  const section = createElement("section", "data-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const headerTooltips = new Map<string, string>([
    ["Candidate", "The safe mate candidate being ranked against the selected target canine."],
    ["Owner", "Current human assignment for that candidate, if known."],
    ["Score", "A relative assortative score. Higher means this candidate reinforces more of the target canine's strongest traits."],
    ["Shared 1", "Strongest trait where both the target canine and this candidate are already strong."],
    ["Shared 2", "Second-strongest trait where both the target canine and this candidate are already strong."],
    ["Shared 3", "Third-strongest trait where both the target canine and this candidate are already strong."],
    ["Puppy estimate", "Estimated puppy TOTAL and Procreation from this pairing, shown as total / procreation."]
  ]);

  for (const label of ["Candidate", "Owner", "Score", "Shared 1", "Shared 2", "Shared 3", "Puppy estimate"]) {
    const cell = createElement("th", undefined, label);
    const tooltip = headerTooltips.get(label);
    if (tooltip) {
      cell.title = tooltip;
    }
    headRow.append(cell);
  }
  head.append(headRow);

  if (candidates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No safe assortative mates found with the current filters and data coverage.");
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }

  for (const entry of candidates.slice(0, 12)) {
    const [sharedOne, sharedTwo, sharedThree] = entry.strongestSharedTraits;
    const row = document.createElement("tr");
    const sharedOneCell = createPriorityAwareSharedCell(sharedOne);
    const sharedTwoCell = createPriorityAwareSharedCell(sharedTwo);
    const sharedThreeCell = createPriorityAwareSharedCell(sharedThree);
    row.append(
      createElement("td", undefined, entry.candidate.canine.displayName),
      createElement("td", undefined, entry.candidate.humanName),
      createElement("td", "numeric-cell", entry.score.toFixed(1)),
      sharedOneCell,
      sharedTwoCell,
      sharedThreeCell,
      createElement(
        "td",
        "numeric-cell",
        entry.candidate.estimate?.traitTotal && entry.candidate.estimate?.procreation
          ? `${Math.round(entry.candidate.estimate.traitTotal)} / ${Math.round(entry.candidate.estimate.procreation)}`
          : "unknown"
      )
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(table);

  return section;
}

function createOcsCandidateTable(candidates: readonly OcsCandidate[]): HTMLElement {
  const section = createElement("section", "data-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const headerTooltips = new Map<string, string>([
    ["Candidate", "The safe mate candidate being ranked against the selected target canine."],
    ["Owner", "Current human assignment for that candidate, if known."],
    ["Score", "Overall OCS score: base quality minus diversity penalties. Higher is better."],
    ["Base quality", "Estimated puppy quality before diversity penalties, using total plus Procreation weight."],
    ["Ancestor reuse", "Penalty for using ancestors that already appear often in active tracked lineages."],
    ["Line constraint", "Penalty for choosing a candidate from a line with fewer remaining safe mates than the herd leaders."],
    ["Related peers", "Penalty for choosing a candidate from a line already closely connected to many active canines."],
    ["Puppy estimate", "Estimated puppy TOTAL and Procreation from this pairing, shown as total / procreation."]
  ]);

  for (const label of ["Candidate", "Owner", "Score", "Base quality", "Ancestor reuse", "Line constraint", "Related peers", "Puppy estimate"]) {
    const cell = createElement("th", undefined, label);
    const tooltip = headerTooltips.get(label);
    if (tooltip) {
      cell.title = tooltip;
    }
    headRow.append(cell);
  }
  head.append(headRow);

  if (candidates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No safe OCS-style mates found with the current filters and data coverage.");
    cell.colSpan = 8;
    row.append(cell);
    body.append(row);
  }

  for (const entry of candidates.slice(0, 12)) {
    const row = document.createElement("tr");
    const ancestorReuseCell = createElement("td", "numeric-cell", String(entry.ancestorReusePenalty));
    if (entry.repeatedAncestors.length > 0) {
      ancestorReuseCell.title = entry.repeatedAncestors
        .map((ancestor) => `${ancestor.label} (${ancestor.descendantCount} active descendants)`)
        .join(" | ");
    }

    row.append(
      createElement("td", undefined, entry.candidate.canine.displayName),
      createElement("td", undefined, entry.candidate.humanName),
      createElement("td", "numeric-cell", entry.score.toFixed(1)),
      createElement("td", "numeric-cell", entry.baseQuality.toFixed(1)),
      ancestorReuseCell,
      createElement("td", "numeric-cell", String(entry.constrainedLinePenalty)),
      createElement("td", "numeric-cell", String(entry.relatedPeerPenalty)),
      createElement(
        "td",
        "numeric-cell",
        entry.candidate.estimate?.traitTotal && entry.candidate.estimate?.procreation
          ? `${Math.round(entry.candidate.estimate.traitTotal)} / ${Math.round(entry.candidate.estimate.procreation)}`
          : "unknown"
      )
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(table);

  return section;
}

function formatTraitImprovement(improvement: { traitName: string; selectedValue: number; candidateValue: number; gain: number }): string {
  return `${improvement.traitName}${"isPriority" in improvement && improvement.isPriority ? " *" : ""} +${improvement.gain}`;
}

function formatSharedStrength(
  shared: { traitName: string; selectedValue: number; candidateValue: number; combined: number; isPriority?: boolean }
): string {
  return `${shared.traitName}${shared.isPriority ? " *" : ""} ${shared.selectedValue}/${shared.candidateValue}`;
}

function createPriorityAwareOffsetCell(
  improvement:
    | { traitName: string; selectedValue: number; candidateValue: number; gain: number; isPriority?: boolean; weightedGain?: number }
    | undefined
): HTMLTableCellElement {
  const cell = createElement("td");
  if (!improvement) {
    cell.textContent = "—";
    return cell;
  }

  cell.textContent = formatTraitImprovement(improvement);
  if (improvement.isPriority) {
    cell.title = `Priority-weighted trait. Gain ${improvement.gain}, weighted to ${improvement.weightedGain ?? improvement.gain}.`;
  }

  return cell;
}

function createPriorityAwareSharedCell(
  shared:
    | { traitName: string; selectedValue: number; candidateValue: number; combined: number; isPriority?: boolean; weightedCombined?: number }
    | undefined
): HTMLTableCellElement {
  const cell = createElement("td");
  if (!shared) {
    cell.textContent = "—";
    return cell;
  }

  cell.textContent = formatSharedStrength(shared);
  if (shared.isPriority) {
    cell.title = `Priority-weighted trait. Combined value ${shared.combined}, weighted to ${shared.weightedCombined ?? shared.combined}.`;
  }

  return cell;
}

function createCurationModeToggle(): HTMLElement {
  const group = createElement("div", "toggle-group");

  for (const [mode, label] of [
    ["status", "Multiple active pets"],
    ["ownership", "Ownership review"]
  ] as const) {
    const button = createElement(
      "button",
      curationState.mode === mode ? "toggle-button toggle-button-active" : "toggle-button",
      label
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(curationState.mode === mode));
    button.addEventListener("click", () => {
      curationState.mode = mode;
      render();
    });
    group.append(button);
  }

  return group;
}

function createCurationNotice(conflictCount: number): HTMLElement {
  const notice = createElement("section", conflictCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${conflictCount} character${conflictCount === 1 ? "" : "s"} need status curation`),
    createElement(
      "p",
      undefined,
      "A character can have only one active canine at a time. These warnings are records-management findings, not app errors."
    )
  );

  return notice;
}

function createActiveCanineConflictTable(conflicts: readonly ActiveCanineConflict[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Character", "Human", "Active Count", "Active Canines", "Review"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (conflicts.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No active-canine ownership conflicts found.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  }

  for (const conflict of conflicts) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, conflict.characterName),
      createElement("td", undefined, conflict.humanName),
      createElement("td", "numeric-cell", String(conflict.activeCanines.length)),
      createConflictCanineListCell(conflict.activeCanines),
      createElement("td", "warn-cell", "Needs curation")
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(createElement("h3", undefined, "Multiple active canines by character"), table);

  return section;
}

function createConflictCanineListCell(canines: readonly CanineSummary[]): HTMLTableCellElement {
  const cell = createElement("td");
  const list = createElement("ul", "compact-list");

  for (const summary of canines) {
    const item = createElement("li", "curation-canine-item");
    const pendingStatus = curationState.statusUpdatesByCanineId[summary.canine.id];
    const buttonRow = createElement("div", "button-row curation-button-row");
    const keepButton = createElement("button", "secondary-button", "Keep active");
    const inactiveButton = createElement("button", "secondary-button", "Mark inactive");
    const unknownButton = createElement("button", "secondary-button", "Mark unknown");

    keepButton.type = "button";
    inactiveButton.type = "button";
    unknownButton.type = "button";

    keepButton.addEventListener("click", () => {
      keepOnlyActiveForCharacter(summary.canine.id);
      render();
    });
    inactiveButton.addEventListener("click", () => {
      stageCanineStatus(summary.canine.id, "inactive");
      render();
    });
    unknownButton.addEventListener("click", () => {
      stageCanineStatus(summary.canine.id, "unknown");
      render();
    });

    buttonRow.append(keepButton, inactiveButton, unknownButton);
    item.append(
      createElement(
        "strong",
        undefined,
        `${summary.canine.displayName} | ${formatGenderLabel(summary.canine.gender)} | ${summary.totalLabel}/${summary.procreationLabel}`
      )
    );

    if (pendingStatus) {
      item.append(createElement("span", "pending-status", `Pending: ${pendingStatus}`));
    }

    item.append(buttonRow);
    list.append(item);
  }

  cell.append(list);
  return cell;
}

function createPendingStatusPatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingStatusUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset pending changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = {
    schemaVersion: 1,
    kind: "canine-status-patch",
    updates
  };

  output.readOnly = true;
  output.value = JSON.stringify(patch, null, 2);

  for (const label of ["Canine", "From", "To"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (updates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No pending status changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const summary = store.getCanineSummary(update.canineId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, summary?.canine.displayName ?? update.canineId),
      createElement("td", undefined, summary?.canine.status ?? "unknown"),
      createElement("td", undefined, update.status)
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.statusUpdatesByCanineId = {};
    curationState.copiedPatch = false;
    render();
  });

  copyButton.type = "button";
  copyButton.disabled = updates.length === 0;
  copyButton.addEventListener("click", () => {
    void navigator.clipboard.writeText(output.value).then(() => {
      curationState.copiedPatch = true;
      render();
    });
  });

  table.append(head, body);
  panel.append(
    createElement("h3", undefined, "Pending patch"),
    createElement(
      "p",
      "plan-note",
      "This prepares a patch for the static repository data. It does not edit the live site or the repo by itself."
    ),
    table,
    createElement("p", "plan-note", `${updates.length} changed canine status${updates.length === 1 ? "" : "es"}.`),
    output,
    createButtonRow([copyButton, resetButton])
  );

  return panel;
}

function createOwnershipReviewNotice(entryCount: number): HTMLElement {
  const notice = createElement("section", entryCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${entryCount} character${entryCount === 1 ? "" : "s"} need ownership review`),
    createElement(
      "p",
      undefined,
      "Use this mode to reassign characters that still sit on Unknown or no public human link. The app only stages a patch; it does not change repo data directly."
    )
  );

  return notice;
}

function createOwnershipReviewTable(store: DataStore, entries: readonly OwnershipReviewEntry[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Character", "Current human", "Canines", "Assign human"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No unknown or unattributed ownership records found.");
    cell.colSpan = 4;
    row.append(cell);
    body.append(row);
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, entry.characterName),
      createElement("td", undefined, entry.currentHumanLabel),
      createOwnershipCanineListCell(entry.canines),
      createOwnershipAssignmentCell(store, entry)
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(createElement("h3", undefined, "Unknown and unattributed ownership"), table);

  return section;
}

function createOwnershipCanineListCell(canines: readonly CanineSummary[]): HTMLTableCellElement {
  const cell = createElement("td");
  const list = createElement("ul", "compact-list");

  for (const summary of canines) {
    list.append(
      createElement(
        "li",
        undefined,
        `${summary.canine.displayName} | ${formatGenderLabel(summary.canine.gender)} | ${summary.canine.status}`
      )
    );
  }

  cell.append(list);
  return cell;
}

function createOwnershipAssignmentCell(store: DataStore, entry: OwnershipReviewEntry): HTMLTableCellElement {
  const cell = createElement("td");
  const wrap = createElement("div", "ownership-cell");
  const select = createElement("select", "field-control");
  const pendingHumanId = getEffectiveHumanId(entry.characterId, entry.currentHumanId);

  for (const option of getOwnershipHumanOptions(store)) {
    const element = document.createElement("option");
    element.value = option.humanId ?? "__NULL__";
    element.textContent = option.label;
    select.append(element);
  }

  select.value = pendingHumanId ?? "__NULL__";
  select.addEventListener("change", () => {
    stageCharacterHuman(entry.characterId, select.value === "__NULL__" ? null : select.value);
    render();
  });

  wrap.append(select);

  if (curationState.humanUpdatesByCharacterId[entry.characterId] !== undefined) {
    wrap.append(
      createElement(
        "span",
        "pending-status",
        `Pending: ${labelHumanOption(store, curationState.humanUpdatesByCharacterId[entry.characterId])}`
      )
    );
  }

  cell.append(wrap);
  return cell;
}

function createPendingHumanPatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingHumanUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset ownership changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = {
    schemaVersion: 1,
    kind: "character-human-patch",
    updates
  };

  output.readOnly = true;
  output.value = JSON.stringify(patch, null, 2);

  for (const label of ["Character", "From", "To"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (updates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No pending ownership changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const character = store.charactersById.get(update.characterId);
    const previousLabel = labelHumanOption(store, character?.humanId ?? null);
    const nextLabel = labelHumanOption(store, update.humanId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, character?.name ?? update.characterId),
      createElement("td", undefined, previousLabel),
      createElement("td", undefined, nextLabel)
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.humanUpdatesByCharacterId = {};
    curationState.copiedPatch = false;
    render();
  });

  copyButton.type = "button";
  copyButton.disabled = updates.length === 0;
  copyButton.addEventListener("click", () => {
    void navigator.clipboard.writeText(output.value).then(() => {
      curationState.copiedPatch = true;
      render();
    });
  });

  table.append(head, body);
  panel.append(
    createElement("h3", undefined, "Pending ownership patch"),
    createElement(
      "p",
      "plan-note",
      "This prepares a character-to-human reassignment patch for repo review. It does not edit canonical data directly."
    ),
    table,
    createElement("p", "plan-note", `${updates.length} changed character owner${updates.length === 1 ? "" : "s"}.`),
    output,
    createButtonRow([copyButton, resetButton])
  );

  return panel;
}

function createButtonRow(buttons: readonly HTMLButtonElement[]): HTMLElement {
  const row = createElement("div", "button-row");
  row.append(...buttons);
  return row;
}

function getActiveCanineConflicts(store: DataStore): ActiveCanineConflict[] {
  const activeSummariesByCharacter = new Map<string, CanineSummary[]>();

  for (const canine of store.data.canonical.canines) {
    if (canine.status !== "active") {
      continue;
    }

    const summary = store.getCanineSummary(canine.id);
    if (!summary) {
      continue;
    }

    const summaries = activeSummariesByCharacter.get(canine.characterId) ?? [];
    summaries.push(summary);
    activeSummariesByCharacter.set(canine.characterId, summaries);
  }

  return Array.from(activeSummariesByCharacter.entries())
    .filter(([, summaries]) => summaries.length > 1)
    .map(([, summaries]) => ({
      characterName: summaries[0]?.character?.name ?? "unknown",
      humanName: summaries[0]?.human?.displayName ?? "unknown",
      activeCanines: summaries.sort((left, right) =>
        left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" })
      )
    }))
    .sort(
      (left, right) =>
        right.activeCanines.length - left.activeCanines.length ||
        left.characterName.localeCompare(right.characterName, undefined, { sensitivity: "base" })
    );
}

function getEffectiveCanineStatus(canineId: string, originalStatus: string): string {
  return curationState.statusUpdatesByCanineId[canineId] ?? originalStatus;
}

function stageCanineStatus(canineId: string, status: CuratedCanineStatus): void {
  const canine = dataStore.caninesById.get(canineId);

  if (!canine) {
    return;
  }

  curationState.copiedPatch = false;

  if (canine.status === status) {
    delete curationState.statusUpdatesByCanineId[canineId];
    return;
  }

  curationState.statusUpdatesByCanineId[canineId] = status;
}

function keepOnlyActiveForCharacter(activeCanineId: string): void {
  const selectedCanine = dataStore.caninesById.get(activeCanineId);

  if (!selectedCanine) {
    return;
  }

  for (const canine of dataStore.data.canonical.canines) {
    if (canine.characterId !== selectedCanine.characterId) {
      continue;
    }

    if (canine.id === activeCanineId) {
      stageCanineStatus(canine.id, "active");
      continue;
    }

    if (getEffectiveCanineStatus(canine.id, canine.status) === "active") {
      stageCanineStatus(canine.id, "inactive");
    }
  }
}

function getPendingStatusUpdates(store: DataStore): CanineStatusPatchUpdate[] {
  return Object.entries(curationState.statusUpdatesByCanineId)
    .filter(([canineId, status]) => store.caninesById.get(canineId)?.status !== status)
    .map(([canineId, status]) => ({ canineId, status }))
    .sort((left, right) => {
      const leftName = store.caninesById.get(left.canineId)?.displayName ?? left.canineId;
      const rightName = store.caninesById.get(right.canineId)?.displayName ?? right.canineId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function getOwnershipReviewEntries(store: DataStore): OwnershipReviewEntry[] {
  const entries = store.data.canonical.characters
    .filter((character) => character.humanId === "human-unknown")
    .map((character) => {
      const canines = store.data.canonical.canines
        .filter((canine) => canine.characterId === character.id)
        .map((canine) => store.getCanineSummary(canine.id))
        .filter((summary): summary is CanineSummary => Boolean(summary))
        .sort((left, right) => left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" }));

      return {
        characterId: character.id,
        characterName: character.name,
        currentHumanId: character.humanId,
        currentHumanLabel: labelHumanOption(store, character.humanId),
        canines
      };
    })
    .filter((entry) => entry.canines.length > 0)
    .sort((left, right) => left.characterName.localeCompare(right.characterName, undefined, { sensitivity: "base" }));

  return entries;
}

function getOwnershipHumanOptions(store: DataStore): Array<{ humanId: string | null; label: string }> {
  const humans = store.data.canonical.humans
    .filter((human) => human.id !== "human-unknown")
    .sort((left, right) => left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }))
    .map((human) => ({
      humanId: human.id,
      label: human.displayName
    }));

  return [{ humanId: null, label: "Unattributed (no public human link)" }, ...humans];
}

function labelHumanOption(store: DataStore, humanId: string | null): string {
  if (humanId === null) {
    return "Unattributed";
  }

  return store.humansById.get(humanId)?.displayName ?? humanId;
}

function getEffectiveHumanId(characterId: string, originalHumanId: string | null): string | null {
  return Object.prototype.hasOwnProperty.call(curationState.humanUpdatesByCharacterId, characterId)
    ? curationState.humanUpdatesByCharacterId[characterId]
    : originalHumanId;
}

function stageCharacterHuman(characterId: string, humanId: string | null): void {
  const character = dataStore.charactersById.get(characterId);

  if (!character) {
    return;
  }

  curationState.copiedPatch = false;

  if (character.humanId === humanId) {
    delete curationState.humanUpdatesByCharacterId[characterId];
    return;
  }

  curationState.humanUpdatesByCharacterId[characterId] = humanId;
}

function getPendingHumanUpdates(store: DataStore): CharacterHumanPatchUpdate[] {
  return Object.entries(curationState.humanUpdatesByCharacterId)
    .filter(([characterId, humanId]) => store.charactersById.get(characterId)?.humanId !== humanId)
    .map(([characterId, humanId]) => ({ characterId, humanId }))
    .sort((left, right) => {
      const leftName = store.charactersById.get(left.characterId)?.name ?? left.characterId;
      const rightName = store.charactersById.get(right.characterId)?.name ?? right.characterId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function createHerdHealthWorkflow(store: DataStore): HTMLElement {
  const report = createHerdHealthReport(store);
  const section = createElement("section", "workflow-section guidance-layout");

  section.append(
    createElement("h3", undefined, "Active pool health"),
    createHerdHealthNotice(report),
    createHerdOverviewCards(report),
    createOverusedAncestorTable(report),
    createLowMateOptionTable(report)
  );

  return section;
}

function createHerdHealthNotice(report: HerdHealthReport): HTMLElement {
  const relatedness = report.relatednessPressure.relatedPairPercent;
  const notice = createElement("section", relatedness !== null && relatedness > 0.35 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, "Population snapshot"),
    createElement(
      "p",
      undefined,
      relatedness === null
        ? "There is not enough active lineage coverage to calculate herd relatedness pressure yet."
        : `${formatPercent(relatedness)} of comparable active pairs share tracked ancestry. This is a first-pass pressure signal, not a complete genetics model.`
    )
  );

  return notice;
}

function createHerdOverviewCards(report: HerdHealthReport): HTMLElement {
  const cards = createElement("div", "result-cards herd-overview-cards");
  const overview = report.overview;
  const relatedness = report.relatednessPressure;
  const cardValues = [
    [
      "Active canines",
      String(overview.activeCanines),
      "Count of active canines in the canonical dataset."
    ],
    [
      "Gender split",
      `${overview.activeMales} M / ${overview.activeFemales} F`,
      "Active canines grouped by recorded gender. Unknown gender is not included in this split."
    ],
    [
      "Trait coverage",
      `${overview.activeWithTraitProfiles}/${overview.activeCanines}`,
      "How many active canines have a trait profile available for solving, planning, and comparison."
    ],
    [
      "Lineage coverage",
      `${overview.activeWithLineageProfiles}/${overview.activeCanines}`,
      "How many active canines have tracked parent and grandparent lineage data."
    ],
    [
      "Avg total",
      formatNullableNumber(overview.averageTotal),
      "Average TOTAL score across active canines with known trait profiles."
    ],
    [
      "Avg Procreation",
      formatNullableNumber(overview.averageProcreation),
      "Average Procreation value across active canines with known trait profiles."
    ],
    [
      "Related pairs",
      `${relatedness.relatedPairs}/${relatedness.comparablePairs}`,
      "Comparable active mating pairs that are blocked by tracked parent or grandparent relatedness."
    ],
    [
      "Inactive/unknown",
      `${overview.inactiveCanines}/${overview.unknownStatusCanines}`,
      "Inactive canines shown first, then canines whose status is still unknown."
    ]
  ];

  for (const [label, value, tooltip] of cardValues) {
    const card = createElement("div", "result-card");
    card.title = tooltip;
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  return cards;
}

function createOverusedAncestorTable(report: HerdHealthReport): HTMLElement {
  const section = createElement("section", "data-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Tracked ancestor", "Active descendants"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (report.overusedAncestors.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No repeated tracked ancestors found in the active pool.");
    cell.colSpan = 2;
    row.append(cell);
    body.append(row);
  }

  for (const ancestor of report.overusedAncestors) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, ancestor.label),
      createElement("td", "numeric-cell", String(ancestor.descendantCount))
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(
    createElement("h3", undefined, "Repeated tracked ancestors"),
    createElement("p", "plan-note", "Ancestors appearing in multiple active lineages can indicate bloodlines that are becoming hard to avoid."),
    table
  );

  return section;
}

function createLowMateOptionTable(report: HerdHealthReport): HTMLElement {
  const section = createElement("section", "data-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const heading = createElement("h3", undefined, "Lowest safe-mate counts");
  heading.title = "Active canines with the fewest genetically safe opposite-gender mates in the current active pool.";
  const headerTooltips = new Map<string, string>([
    ["Active canine", "The active canine being evaluated for breeding flexibility."],
    ["Gender", "Recorded gender for the active canine."],
    ["Safe mates", "Possible mates remaining after tracked parent and grandparent relatedness blocks are removed."],
    ["Possible mates", "Active opposite-gender candidates before relatedness filtering."],
    ["Owner", "Current human assignment for the active canine, if known."]
  ]);

  for (const label of ["Active canine", "Gender", "Safe mates", "Possible mates", "Owner"]) {
    const cell = createElement("th", undefined, label);
    const tooltip = headerTooltips.get(label);
    if (tooltip) {
      cell.title = tooltip;
    }
    headRow.append(cell);
  }
  head.append(headRow);

  if (report.lowMateOptions.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No constrained active canines found with current lineage coverage.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  }

  for (const option of report.lowMateOptions) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, option.summary.canine.displayName),
      createElement("td", undefined, formatGenderLabel(option.summary.canine.gender)),
      createElement("td", option.safeMateCount === 0 ? "warn-cell numeric-cell" : "numeric-cell", String(option.safeMateCount)),
      createElement("td", "numeric-cell", String(option.possibleMateCount)),
      createElement("td", undefined, option.summary.human?.displayName ?? "unattributed")
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(
    heading,
    createElement("p", "plan-note", "These records have the fewest genetically safe opposite-gender active mates within the tracked parent/grandparent window."),
    table
  );

  return section;
}

function formatNullableNumber(value: number | null): string {
  return value === null ? "unknown" : String(Math.round(value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function createGuidanceNotice(): HTMLElement {
  const notice = createElement("section", "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, "Guidance only"),
    createElement(
      "p",
      undefined,
      "Collars are reminders for setup timing and player action. They do not change stored trait data or mutate inherited puppy stats in this app."
    )
  );

  return notice;
}

function createCollarActionPanel(
  title: string,
  suggestions: readonly CollarSuggestion[],
  timing: string
): HTMLElement {
  const panel = createElement("section", "plan-panel");
  panel.append(createElement("h3", undefined, title), createElement("p", "plan-note", timing));

  for (const suggestion of suggestions) {
    const item = createElement("article", "guidance-item");
    item.append(
      createElement("strong", undefined, formatCollarHeading(suggestion)),
      createElement("span", "subtle-line", `Wearer: ${formatCollarWearer(suggestion.wearer)}`),
      createElement("p", undefined, suggestion.effect)
    );
    panel.append(item);
  }

  return panel;
}

function createTraitCollarReferenceTable(suggestions: readonly CollarSuggestion[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const table = createElement("table", "data-table guidance-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Gem", "Trait", "Reference"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const suggestion of suggestions) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, suggestion.gem),
      createElement("td", undefined, suggestion.trait ?? "unknown"),
      createElement("td", undefined, suggestion.effect)
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(createElement("h3", undefined, "Passive trait collar reference"), table);
  return section;
}

function formatCollarHeading(suggestion: CollarSuggestion): string {
  return suggestion.trait ? `${suggestion.gem} / ${suggestion.trait}` : suggestion.gem;
}

function formatCollarWearer(wearer: CollarSuggestion["wearer"]): string {
  if (wearer === "unique-pet") {
    return "unique pet";
  }

  if (wearer === "female") {
    return "female";
  }

  return "reference only";
}

function createDataBrowserWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section");
  const layout = createElement("div", "data-browser-layout");
  const output = createElement("div", "calculator-output");
  const controls = createDataBrowserControls(store, output);

  renderDataBrowserOutput(output, store);
  layout.append(controls, output);
  section.append(createElement("h3", undefined, "Data browser"), layout);

  return section;
}

function createDataBrowserControls(store: DataStore, output: HTMLElement): HTMLElement {
  const controls = createElement("div", "calculator-form");
  const result = getDataBrowserResult(store, dataBrowserState.filters, dataBrowserState.selectedCanineId);

  controls.append(
    createLabel("Search canines", createDataBrowserTextInput("query", "ball, whap, bunny, Dave... ", output, store)),
    createLabel("Gender", createDataBrowserSelect("gender", result.genderOptions, output, store)),
    createLabel("Status", createDataBrowserSelect("status", result.statusOptions, output, store)),
    createLabel("Human", createDataBrowserSelect("humanId", result.humanOptions, output, store)),
    createLabel("Minimum total", createDataBrowserNumberInput("minTotal", output, store)),
    createLabel("Minimum Procreation", createDataBrowserNumberInput("minProcreation", output, store)),
    createLabel("Primary color", createDataBrowserSelect("primaryColor", result.primaryColorOptions, output, store)),
    createLabel("Secondary color", createDataBrowserSelect("secondaryColor", result.secondaryColorOptions, output, store)),
    createLabel("Eye color", createDataBrowserSelect("eyeColor", result.eyeColorOptions, output, store)),
    createDataBrowserKnownAppearanceToggle(output, store),
    createDataBrowserActions(output, store)
  );

  return controls;
}

function createDataBrowserTextInput(
  field: "query",
  placeholder: string,
  output: HTMLElement,
  store: DataStore
): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.value = dataBrowserState.filters[field];
  input.placeholder = placeholder;
  input.addEventListener("input", () => {
    dataBrowserState.filters[field] = input.value;
    renderDataBrowserOutput(output, store);
  });

  return input;
}

function createDataBrowserSelect(
  field: "gender" | "status" | "humanId" | "primaryColor" | "secondaryColor" | "eyeColor",
  options: readonly { value: string; label: string }[],
  output: HTMLElement,
  store: DataStore
): HTMLSelectElement {
  const select = createElement("select", "field-control");
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  select.append(allOption);

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = String(dataBrowserState.filters[field]);
  select.addEventListener("change", () => {
    dataBrowserState.filters[field] = select.value;
    renderDataBrowserOutput(output, store);
  });

  return select;
}

function createDataBrowserKnownAppearanceToggle(output: HTMLElement, store: DataStore): HTMLElement {
  const button = createToggleButton(
    dataBrowserState.filters.knownAppearanceOnly ? "Show Unknown Appearance" : "Known Appearance Only",
    dataBrowserState.filters.knownAppearanceOnly,
    () => {
      dataBrowserState.filters.knownAppearanceOnly = !dataBrowserState.filters.knownAppearanceOnly;
      button.textContent = dataBrowserState.filters.knownAppearanceOnly ? "Show Unknown Appearance" : "Known Appearance Only";
      button.className = dataBrowserState.filters.knownAppearanceOnly ? "toggle-button toggle-button-active" : "toggle-button";
      button.setAttribute("aria-pressed", String(dataBrowserState.filters.knownAppearanceOnly));
      renderDataBrowserOutput(output, store);
    }
  );

  return button;
}

function createDataBrowserNumberInput(
  field: "minTotal" | "minProcreation",
  output: HTMLElement,
  store: DataStore
): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = dataBrowserState.filters[field] === null ? "" : String(dataBrowserState.filters[field]);
  input.addEventListener("input", () => {
    const value = Number(input.value);
    dataBrowserState.filters[field] = input.value.trim() === "" || !Number.isFinite(value) ? null : value;
    renderDataBrowserOutput(output, store);
  });

  return input;
}

function createDataBrowserActions(output: HTMLElement, store: DataStore): HTMLElement {
  const actions = createElement("div", "button-row");
  const resetButton = createElement("button", "secondary-button", "Reset filters");
  resetButton.type = "button";
  resetButton.addEventListener("click", () => {
    dataBrowserState.filters = { ...defaultDataBrowserFilters };
    dataBrowserState.selectedCanineId = "";
    render();
  });
  actions.append(resetButton, createElement("span", "subtle-line", "Canonical data is read-only in this public app."));

  void output;
  void store;
  return actions;
}

function renderDataBrowserOutput(output: HTMLElement, store: DataStore): void {
  const result = getDataBrowserResult(store, dataBrowserState.filters, dataBrowserState.selectedCanineId);

  output.textContent = "";
  output.append(createDataBrowserSummary(result.rows.length, store.stats.canines));
  output.append(createDataBrowserTable(result.rows));
  output.append(createDataBrowserDetail(result.selected, store));
}

function createDataBrowserSummary(visibleCount: number, totalCount: number): HTMLElement {
  const summary = createElement("section", "data-health data-health-ok");
  summary.append(
    createElement("h3", undefined, `${visibleCount} of ${totalCount} canines shown`),
    createElement("p", undefined, "Search includes canine name, call name, character, human, status, gender, type, and appearance.")
  );

  return summary;
}

function createDataBrowserTable(rows: readonly DataBrowserRow[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table data-browser-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const visibleRows = rows.slice(0, 20);

  for (const label of ["Canine", "Owner", "Gender", "Status", "Total", "Procreation"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const row of visibleRows) {
    const tr = document.createElement("tr");
    tr.className = row.canine.id === dataBrowserState.selectedCanineId ? "selected-row" : "";
    tr.addEventListener("click", () => {
      dataBrowserState.selectedCanineId = row.canine.id;
      const output = tr.closest(".calculator-output");
      if (output instanceof HTMLElement) {
        renderDataBrowserOutput(output, dataStore);
      }
    });
    tr.append(
      createDataBrowserNameCell(row),
      createElement("td", undefined, `${row.character?.name ?? "unknown"} / ${row.human?.displayName ?? "unknown"}`),
      createElement("td", undefined, formatGenderLabel(row.canine.gender)),
      createElement("td", undefined, row.canine.status),
      createElement("td", "numeric-cell", row.totalLabel),
      createElement("td", "numeric-cell", row.procreationLabel)
    );
    body.append(tr);
  }

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const cell = createElement("td", undefined, "No canines match the current filters.");
    cell.colSpan = 6;
    emptyRow.append(cell);
    body.append(emptyRow);
  }

  table.append(head, body);
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Canonical canines"), tablePane);

  if (rows.length > visibleRows.length) {
    section.append(createElement("p", "subtle-line", `Showing first ${visibleRows.length} matches. Narrow the filters to inspect the remaining ${rows.length - visibleRows.length}.`));
  }

  return section;
}

function createDataBrowserNameCell(row: DataBrowserRow): HTMLTableCellElement {
  const cell = createElement("td");
  cell.append(
    createElement("strong", undefined, row.canine.displayName),
    createElement("span", "subtle-line", row.canine.id)
  );

  return cell;
}

function createDataBrowserDetail(row: DataBrowserRow | null, store: DataStore): HTMLElement {
  const detail = createElement("section", "candidate-detail");

  if (!row) {
    detail.append(createElement("h3", undefined, "Canine detail"), createElement("p", undefined, "No canine selected."));
    return detail;
  }

  const cards = createElement("div", "result-cards");
  for (const [label, value] of [
    ["Total", row.totalLabel],
    ["Procreation", row.procreationLabel],
    ["Gender", formatGenderLabel(row.canine.gender)]
  ]) {
    const card = createElement("div", "result-card");
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  detail.append(createElement("h3", undefined, row.canine.displayName), cards);
  detail.append(createDataBrowserIdentityPanel(row));
  detail.append(createDataBrowserTraitTable(row));
  detail.append(createDataBrowserLineagePanel(row, store));
  detail.append(createDataBrowserSourcePanel(row, store));

  return detail;
}

function createDataBrowserIdentityPanel(row: DataBrowserRow): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const items: Array<[string, string]> = [
    ["Call name", row.canine.callName],
    ["Character", row.character?.name ?? "unknown"],
    ["Human", row.human?.displayName ?? "unknown"],
    ["Status", row.canine.status],
    ["Type", row.canine.canineType ?? "unknown"],
    ["Primary color", row.primaryColorLabel],
    ["Secondary color", row.secondaryColorLabel],
    ["Eye color", row.eyeColorLabel]
  ];

  panel.append(createElement("h3", undefined, "Identity"));
  panel.append(createKeyValueList(items));
  return panel;
}

function createDataBrowserTraitTable(row: DataBrowserRow): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const table = createElement("table", "data-table trait-result-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Trait", "Value"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const traitName of traitNames) {
    const tr = document.createElement("tr");
    tr.append(
      createElement("td", undefined, traitName),
      createElement("td", "numeric-cell", formatTraitValue(row.traitProfile?.traits?.[traitName]))
    );
    body.append(tr);
  }

  table.append(head, body);
  section.append(createElement("h3", undefined, "Traits"), table);
  return section;
}

function createDataBrowserLineagePanel(row: DataBrowserRow, store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const lineage = row.lineageProfile;

  panel.append(createElement("h3", undefined, "Lineage"));

  if (!lineage) {
    panel.append(createElement("p", "plan-note", "No lineage profile recorded."));
    return panel;
  }

  panel.append(
    createKeyValueList([
      ["Sire", formatLineageCanine(lineage.sireId, store)],
      ["Dam", formatLineageCanine(lineage.damId, store)],
      ["Paternal grandsire", formatLineageCanine(lineage.paternalGrandSireId, store)],
      ["Paternal granddam", formatLineageCanine(lineage.paternalGrandDamId, store)],
      ["Maternal grandsire", formatLineageCanine(lineage.maternalGrandSireId, store)],
      ["Maternal granddam", formatLineageCanine(lineage.maternalGrandDamId, store)]
    ])
  );

  return panel;
}

function createDataBrowserSourcePanel(row: DataBrowserRow, store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const observations = store.data.canonical.sourceObservations.filter((observation) => observation.entityId === row.canine.id);
  panel.append(createElement("h3", undefined, "Sources"));

  if (observations.length === 0) {
    panel.append(createElement("p", "plan-note", "No source observations recorded."));
    return panel;
  }

  const list = createElement("ul", "compact-list");
  for (const observation of observations.slice(0, 6)) {
    list.append(
      createElement(
        "li",
        undefined,
        `${observation.source}${observation.sourceObservedAt ? ` (${observation.sourceObservedAt})` : ""}${observation.externalId ? ` | external ${observation.externalId}` : ""}`
      )
    );
  }
  panel.append(list);
  return panel;
}

function createKeyValueList(items: readonly (readonly [string, string])[]): HTMLElement {
  const list = createElement("dl", "key-value-list");

  for (const [key, value] of items) {
    list.append(createElement("dt", undefined, key), createElement("dd", undefined, value));
  }

  return list;
}

function formatLineageCanine(canineId: string | null, store: DataStore): string {
  if (!canineId) {
    return "unknown";
  }

  return store.caninesById.get(canineId)?.displayName ?? canineId;
}

function createMultiStepWorkflow(): HTMLElement {
  const viewModel = createDefaultMultiStepPlanViewModel(dataStore, {
    parentOverridesByStep: multiStepState.parentOverridesByStep,
    selectedPuppySlotByStep: multiStepState.selectedPuppySlotByStep,
    actualPuppiesById: multiStepState.actualPuppiesById
  });
  const activeStep =
    viewModel.steps[multiStepState.activeStepIndex] ?? viewModel.steps[0] ?? null;
  const section = createElement("section", "workflow-section");
  const layout = createElement("div", "multi-step-layout");
  const sidebar = createElement("div", "multi-step-sidebar");
  const output = createElement("div", "calculator-output");

  sidebar.append(
    createElement("h3", undefined, viewModel.plan.name),
    createPlanStrategyPanel(viewModel.targetLineLabel, viewModel.timeConstraintLabel),
    createPlanPersistencePanel(),
    createOriginPoolPanel(viewModel.originPoolLabels),
    createStepNavigation(viewModel.steps)
  );

  if (viewModel.warnings.length > 0) {
    output.append(createWarnings(viewModel.warnings));
  }

  if (activeStep) {
    output.append(createMultiStepDetail(activeStep), createHistoryFlushPanel(activeStep));
  }

  output.append(createFinalPlanSummary(viewModel.finalStep));
  layout.append(sidebar, output);
  section.append(createElement("h3", undefined, "Multi-step plan mode"), layout);

  return section;
}

function createPlanPersistencePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const exportButton = createElement("button", "secondary-button", "Export JSON");
  const importButton = createElement("button", "secondary-button", "Import JSON");
  const exportOutput = createElement("textarea", "field-control plan-json-output");
  const importInput = createElement("textarea", "field-control plan-json-output");

  exportOutput.readOnly = true;
  exportOutput.value = multiStepState.exportText;
  importInput.value = multiStepState.importText;
  importInput.placeholder = "Paste a previously exported plan JSON here.";
  importInput.addEventListener("input", () => {
    multiStepState.importText = importInput.value;
  });

  exportButton.type = "button";
  exportButton.addEventListener("click", () => {
    const exportData = createMultiStepPlanExport(dataStore, {
      parentOverridesByStep: multiStepState.parentOverridesByStep,
      selectedPuppySlotByStep: multiStepState.selectedPuppySlotByStep,
      actualPuppiesById: multiStepState.actualPuppiesById
    });
    multiStepState.exportText = JSON.stringify(exportData, null, 2);
    render();
  });

  importButton.type = "button";
  importButton.addEventListener("click", () => {
    const result = parseMultiStepPlanExportText(multiStepState.importText);

    if (!result.exportData) {
      multiStepState.importWarnings = result.warnings;
      render();
      return;
    }

    const validationWarnings = validateMultiStepPlanExport(dataStore, result.exportData);
    multiStepState.importWarnings = [...result.warnings, ...validationWarnings];

    if (validationWarnings.length === 0) {
      multiStepState.parentOverridesByStep = result.exportData.parentOverridesByStep;
      multiStepState.selectedPuppySlotByStep = result.exportData.selectedPuppySlotByStep;
      multiStepState.actualPuppiesById = result.exportData.actualPuppiesById;
      multiStepState.editingPuppyId = "";
    }

    render();
  });

  panel.append(
    createElement("h3", undefined, "Plan JSON"),
    exportButton,
    exportOutput,
    importInput,
    importButton
  );

  if (multiStepState.importWarnings.length > 0) {
    const list = createElement("ul", "error-list");
    for (const warning of multiStepState.importWarnings) {
      list.append(createElement("li", undefined, warning));
    }
    panel.append(list);
  }

  return panel;
}

function createPlanStrategyPanel(targetLineLabel: string, timeConstraintLabel: string): HTMLElement {
  const panel = createElement("section", "plan-panel");
  panel.append(
    createElement("h3", undefined, "Plan focus"),
    createElement("p", "plan-note", targetLineLabel),
    createElement("p", "plan-note", timeConstraintLabel)
  );

  return panel;
}

function createOriginPoolPanel(originPoolLabels: readonly string[]): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const label of originPoolLabels) {
    list.append(createElement("li", undefined, label));
  }

  panel.append(createElement("h3", undefined, "Starting history window"), list);
  return panel;
}

function createStepNavigation(steps: readonly MultiStepPlanStepView[]): HTMLElement {
  const nav = createElement("div", "step-nav");

  for (const [index, step] of steps.entries()) {
    const button = createElement("button", "step-button", step.step.label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === multiStepState.activeStepIndex));
    button.addEventListener("click", () => {
      multiStepState.activeStepIndex = index;
      render();
    });
    nav.append(button);
  }

  return nav;
}

function createMultiStepDetail(stepView: MultiStepPlanStepView): HTMLElement {
  const detail = createElement("section", "candidate-detail");
  const cards = createElement("div", "result-cards");
  const selectedPuppyCardLabel =
    stepView.stepNumber === 3 ? "Cycle output puppy" : "Next carry-forward";

  for (const [label, value] of [
    ["Sire", stepView.sireLabel],
    ["Dam", stepView.damLabel],
    [selectedPuppyCardLabel, stepView.selectedPuppyLabel],
    ["Estimated puppy", stepView.estimateLabel]
  ]) {
    const card = createElement("div", "result-card");
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  detail.append(createElement("h3", undefined, stepView.step.label), createStepParentPickerPanel(stepView), cards);

  if (stepView.step.notes) {
    detail.append(createElement("p", "plan-note", stepView.step.notes));
  }

  detail.append(createPuppySlotPreview(stepView));
  return detail;
}

function createStepParentPickerPanel(stepView: MultiStepPlanStepView): HTMLElement {
  const panel = createElement("section", "plan-panel");

  panel.append(createElement("h3", undefined, "Parents"));

  if (stepView.stepNumber === 1) {
    panel.append(
      createLabel("Sire", createParentSelect(stepView, "sireId", "M")),
      createLabel("Dam", createParentSelect(stepView, "damId", "F"))
    );
  } else {
    const mateGender = getCarryForwardMateGender(stepView);
    const mateField = mateGender === "M" ? "sireId" : "damId";
    panel.append(
      createElement("p", "plan-note", `Carry-forward parent: ${stepView.carryForwardParentLabel}`),
      createElement("p", "plan-note", `Carry-forward gender: ${formatGenderLabel(stepView.carryForwardParentGender)}`),
      createLabel(`${formatGenderLabel(mateGender)} mate`, createParentSelect(stepView, mateField, mateGender))
    );
  }

  const warnings = getStepParentWarnings(stepView);
  if (warnings.length > 0) {
    const list = createElement("ul", "error-list");
    for (const warning of warnings) {
      list.append(createElement("li", undefined, warning));
    }
    panel.append(list);
  }

  return panel;
}

function createParentSelect(
  stepView: MultiStepPlanStepView,
  field: keyof PlanParentOverride,
  gender: "M" | "F"
): HTMLSelectElement {
  const select = createElement("select", "field-control");
  const currentValue = getStepParentCanonicalId(stepView, field) ?? "";

  for (const option of getMultiStepParentOptions(gender, stepView, field, currentValue)) {
    const element = document.createElement("option");
    element.value = option.canineId;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = currentValue;
  select.addEventListener("change", () => {
    multiStepState.parentOverridesByStep[stepView.step.id] = {
      ...(multiStepState.parentOverridesByStep[stepView.step.id] ?? {}),
      [field]: select.value
    };
    multiStepState.importWarnings = [];
    render();
  });

  return select;
}

function getMultiStepParentOptions(
  gender: "M" | "F",
  stepView: MultiStepPlanStepView,
  field: keyof PlanParentOverride,
  currentValue: string
): BreedingCanineOption[] {
  const options = dataStore.data.canonical.canines
    .filter((canine) => canine.gender === gender)
    .filter((canine) => canine.status === "active")
    .filter((canine) => dataStore.lineageProfilesByCanineId.has(canine.id))
    .filter((canine) => typeof dataStore.traitProfilesByCanineId.get(canine.id)?.total === "number")
    .map((canine) => {
      const summary = dataStore.getCanineSummary(canine.id);
      const warnings = getParentOptionWarnings(canine.id, stepView, field);
      return {
        canineId: canine.id,
        label: `${canine.displayName} | ${summary?.human?.displayName ?? "unknown"} | ${summary?.totalLabel ?? "unknown"}/${summary?.procreationLabel ?? "unknown"}${warnings.length > 0 ? ` | ${warnings.join(", ")}` : " | Safe"}`,
        sortPrefix: warnings.length > 0 ? "1" : "0",
        aliases: [canine.displayName, canine.callName].filter((alias): alias is string => Boolean(alias))
      };
    })
    .sort(
      (left, right) =>
        left.sortPrefix.localeCompare(right.sortPrefix) ||
        left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
    );

  if (currentValue && !options.some((option) => option.canineId === currentValue)) {
    const summary = dataStore.getCanineSummary(currentValue);
    if (summary) {
      return [
        {
          canineId: currentValue,
          label: `${summary.canine.displayName} | ${summary.human?.displayName ?? "unknown"} | ${summary.totalLabel}/${summary.procreationLabel} | Unavailable`,
          aliases: [summary.canine.displayName, summary.canine.callName]
        },
        ...options
      ];
    }
  }

  return options;
}

function getParentOptionWarnings(
  canineId: string,
  stepView: MultiStepPlanStepView,
  field: keyof PlanParentOverride
): string[] {
  const warnings: string[] = [];

  if (stepView.stepNumber === 1) {
    const otherParentId = getStepParentCanonicalId(stepView, field === "sireId" ? "damId" : "sireId");
    if (otherParentId && areSameConcreteHuman(canineId, otherParentId)) {
      warnings.push("Alt-Blocked");
    }

    return warnings;
  }

  if (!stepView.carryForwardParentLineage) {
    return warnings;
  }

  const candidateLineage = dataStore.lineageProfilesByCanineId.get(canineId);

  if (!candidateLineage) {
    warnings.push("Missing lineage");
    return warnings;
  }

  if (compareLineage(stepView.carryForwardParentLineage, candidateLineage).areRelated) {
    warnings.push("Related");
  }

  return warnings;
}

function getCarryForwardMateGender(stepView: MultiStepPlanStepView): "M" | "F" {
  return stepView.carryForwardParentGender === "F" ? "M" : "F";
}

function getStepParentCanonicalId(stepView: MultiStepPlanStepView, field: keyof PlanParentOverride): string | null {
  const parent = field === "sireId" ? stepView.step.sire : stepView.step.dam;
  return parent?.kind === "canonical" ? parent.canineId : null;
}

function getStepParentWarnings(stepView: MultiStepPlanStepView): string[] {
  const warnings: string[] = [];
  const sireId = getStepParentCanonicalId(stepView, "sireId");
  const damId = getStepParentCanonicalId(stepView, "damId");

  if (stepView.stepNumber === 1 && sireId && damId && areSameConcreteHuman(sireId, damId)) {
    warnings.push("Step 1 parents are owned by the same human; direct breeding is alt-blocked.");
  }

  if (stepView.stepNumber > 1 && stepView.carryForwardParentGender === "U") {
    warnings.push("Carry-forward puppy gender is unknown; mate picker defaults to female until actual gender is entered.");
  }

  if (stepView.stepNumber > 1) {
    const mateGender = getCarryForwardMateGender(stepView);
    const mateField = mateGender === "M" ? "sireId" : "damId";
    const mateId = getStepParentCanonicalId(stepView, mateField);

    if (mateId) {
      warnings.push(...getSelectedMateWarnings(mateId, stepView, mateField));
    }
  }

  return warnings;
}

function getSelectedMateWarnings(
  mateId: string,
  stepView: MultiStepPlanStepView,
  field: keyof PlanParentOverride
): string[] {
  const warnings = getParentOptionWarnings(mateId, stepView, field);
  const selectedWarnings: string[] = [];

  if (warnings.includes("Related") && stepView.carryForwardParentLineage) {
    const candidateLineage = dataStore.lineageProfilesByCanineId.get(mateId);
    const comparison = candidateLineage ? compareLineage(stepView.carryForwardParentLineage, candidateLineage) : null;
    const shared = comparison?.sharedAncestors
      .slice(0, 3)
      .map((ancestor) => `${formatPlanId(ancestor.canineId)} (${ancestor.leftSlots.join("/")})`)
      .join(", ");

    selectedWarnings.push(
      shared
        ? `Selected mate is related to the selected carry-forward puppy through ${shared}.`
        : "Selected mate is related to the selected carry-forward puppy."
    );
  }

  if (warnings.includes("Alt-Blocked")) {
    selectedWarnings.push("Selected parents are owned by the same human; direct breeding is alt-blocked.");
  }

  return selectedWarnings;
}

function areSameConcreteHuman(leftCanineId: string, rightCanineId: string): boolean {
  const leftHumanId = getHumanIdForCanine(leftCanineId);
  const rightHumanId = getHumanIdForCanine(rightCanineId);

  return (
    Boolean(leftHumanId && rightHumanId) &&
    leftHumanId !== "human-anyone" &&
    leftHumanId !== "human-unknown" &&
    leftHumanId === rightHumanId
  );
}

function getHumanIdForCanine(canineId: string): string | null {
  const canine = dataStore.caninesById.get(canineId);
  const character = canine ? dataStore.charactersById.get(canine.characterId) : undefined;
  return character?.humanId ?? null;
}

function createPuppySlotPreview(stepView: MultiStepPlanStepView): HTMLElement {
  const section = createElement("section", "plan-panel");
  const slots = createElement("div", "puppy-slot-grid");

  for (const slot of stepView.step.puppySlots) {
    const slotElement = createElement(
      "button",
      slot.id === stepView.selectedPuppyId ? "puppy-slot puppy-slot-selected" : "puppy-slot"
    );
    const actual = multiStepState.actualPuppiesById[slot.id];
    slotElement.type = "button";
    slotElement.addEventListener("click", () => {
      multiStepState.editingPuppyId = slot.id;
      render();
    });
    slotElement.append(
      createElement("strong", undefined, slot.label),
      createElement(
        "span",
        undefined,
        formatPuppySlotStatus(slot.id === stepView.selectedPuppyId, actual)
      )
    );
    slots.append(slotElement);
  }

  section.append(createElement("h3", undefined, "Litter slots"), slots);
  section.append(createPuppySlotEditor(stepView));
  return section;
}

function createPuppySlotEditor(stepView: MultiStepPlanStepView): HTMLElement {
  const selectedSlot =
    stepView.step.puppySlots.find((slot) => slot.id === multiStepState.editingPuppyId) ??
    stepView.step.puppySlots.find((slot) => slot.id === stepView.selectedPuppyId) ??
    stepView.step.puppySlots[0];
  const editor = createElement("div", "puppy-editor");

  if (!selectedSlot) {
    editor.append(createElement("p", "plan-note", "No puppy slot available."));
    return editor;
  }

  const draft = getActualPuppyDraft(selectedSlot.id, selectedSlot.label);
  const carryButton = createElement("button", "secondary-button", "Use as carry-forward");
  carryButton.type = "button";
  carryButton.addEventListener("click", () => {
    multiStepState.selectedPuppySlotByStep[stepView.step.id] = selectedSlot.id;
    multiStepState.editingPuppyId = selectedSlot.id;
    render();
  });

  editor.append(
    createElement("h3", undefined, `Edit ${selectedSlot.label}`),
    createLabel("Puppy label", createPuppyTextInput(draft, "label")),
    createLabel("Gender", createPuppyGenderSelect(draft)),
    createLabel("Pasted stat block", createPuppyStatsInput(draft)),
    createPuppyJumpMetrics(stepView, draft),
    createLabel("Notes", createPuppyNotesInput(draft)),
    carryButton
  );

  return editor;
}

function createPuppyJumpMetrics(stepView: MultiStepPlanStepView, draft: ActualPuppyInput): HTMLElement {
  const metrics = createElement("div", "result-cards puppy-metric-cards");
  const benchmarks = stepView.benchmarks;
  const profile = parseActualPuppyStats(draft.puppyId, draft.pastedStats);
  const actualTotal = getProfileTotal(profile);

  for (const [label, actual, baseline] of [
    ["Total gain over parent avg", actualTotal, benchmarks?.averageTotal ?? null],
    ["Total gain over best parent", actualTotal, benchmarks?.bestParentTotal ?? null]
  ] as const) {
    const card = createElement("div", "result-card");
    card.append(
      createElement("span", "status-label", label),
      createElement("strong", undefined, formatJumpMetric(actual, baseline))
    );
    metrics.append(card);
  }

  return metrics;
}

function getActualPuppyDraft(puppyId: string, fallbackName: string): ActualPuppyInput {
  const existing = multiStepState.actualPuppiesById[puppyId];

  if (existing) {
    return existing;
  }

  const draft: ActualPuppyInput = {
    puppyId,
    label: fallbackName,
    gender: "U",
    pastedStats: "",
    notes: ""
  };

  multiStepState.actualPuppiesById[puppyId] = draft;
  return draft;
}

function createPuppyTextInput(draft: ActualPuppyInput, field: "label"): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.value = draft[field];
  input.addEventListener("input", () => {
    updateActualPuppy(draft.puppyId, { [field]: input.value });
  });

  return input;
}

function createPuppyGenderSelect(draft: ActualPuppyInput): HTMLSelectElement {
  const select = createElement("select", "field-control");

  for (const [value, label] of [
    ["U", "Unknown"],
    ["M", "Male"],
    ["F", "Female"]
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  select.value = draft.gender;
  select.addEventListener("change", () => {
    updateActualPuppy(draft.puppyId, { gender: select.value as ActualPuppyInput["gender"] });
  });

  return select;
}

function createPuppyNotesInput(draft: ActualPuppyInput): HTMLTextAreaElement {
  const textarea = createElement("textarea", "field-control puppy-notes-input");
  textarea.value = draft.notes;
  textarea.addEventListener("input", () => {
    updateActualPuppy(draft.puppyId, { notes: textarea.value });
  });

  return textarea;
}

function createPuppyStatsInput(draft: ActualPuppyInput): HTMLTextAreaElement {
  const textarea = createElement("textarea", "field-control puppy-stats-input");
  textarea.value = draft.pastedStats;
  textarea.spellcheck = false;
  textarea.placeholder = [
    "Puppy 4 Male",
    "Alertness : 29",
    "Appetite : 45",
    "...",
    "Procreation : 52",
    "Toughness : 49",
    "TOTALS : 723"
  ].join("\n");
  textarea.addEventListener("input", () => {
    updateActualPuppy(draft.puppyId, { pastedStats: textarea.value });
  });

  return textarea;
}

function updateActualPuppy(puppyId: string, patch: Partial<ActualPuppyInput>): void {
  multiStepState.actualPuppiesById[puppyId] = {
    ...getActualPuppyDraft(puppyId, "Puppy"),
    ...patch
  };
}

function formatJumpMetric(actual: number | null, baseline: number | null): string {
  if (actual === null || baseline === null) {
    return "unknown";
  }

  const jump = actual - baseline;
  const formatted = Number.isInteger(jump) ? String(jump) : jump.toFixed(1);
  return jump > 0 ? `+${formatted}` : formatted;
}

function formatPuppySlotStatus(isCarryForward: boolean, actual: ActualPuppyInput | undefined): string {
  const profile = actual ? parseActualPuppyStats(actual.puppyId, actual.pastedStats) : null;
  const total = getProfileTotal(profile);
  const procreation = getProfileProcreation(profile);
  const score =
    profile
      ? `${formatPlannerNumber(total)} / ${formatPlannerNumber(procreation)}`
      : "No actual stats";

  return isCarryForward ? `Carry-forward | ${score}` : score;
}

function getProfileTotal(profile: ReturnType<typeof parseActualPuppyStats>): number | null {
  return typeof profile?.total === "number" ? profile.total : null;
}

function getProfileProcreation(profile: ReturnType<typeof parseActualPuppyStats>): number | null {
  const procreation = profile?.traits?.Procreation;
  return typeof procreation === "number" ? procreation : null;
}

function createHistoryFlushPanel(stepView: MultiStepPlanStepView): HTMLElement {
  const panel = createElement("section", "history-flush-panel");
  const report = stepView.flushReport;

  panel.append(createElement("h3", undefined, "History flush"));

  if (!report) {
    panel.append(createElement("p", undefined, "No selected puppy lineage is available for this step."));
    return panel;
  }

  const cards = createElement("div", "result-cards");
  const retained = report.retainedOriginCanineIds.length;
  const flushed = report.flushedOriginCanineIds.length;

  for (const [label, value] of [
    ["Still Tracked", String(retained)],
    ["Flushed", String(flushed)],
    ["Window", retained === 0 ? "Clean" : "Parent/grandparent"]
  ]) {
    const card = createElement("div", "result-card");
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  panel.append(cards);

  if (report.trackedOriginEntries.length > 0) {
    const list = createElement("ul", "compact-list");
    for (const entry of report.trackedOriginEntries) {
      list.append(createElement("li", undefined, `${formatPlanId(entry.canineId)} remains as ${entry.slot}`));
    }
    panel.append(createElement("h3", undefined, "Still remembered"), list);
  }

  if (report.flushedOriginCanineIds.length > 0) {
    const list = createElement("ul", "compact-list");
    for (const canineId of report.flushedOriginCanineIds) {
      list.append(createElement("li", undefined, formatPlanId(canineId)));
    }
    panel.append(createElement("h3", undefined, "Forgotten by window"), list);
  }

  return panel;
}

function createFinalPlanSummary(finalStep: MultiStepPlanStepView | null): HTMLElement {
  const panel = createElement("section", "data-health data-health-ok");
  const retainedCount = finalStep?.flushReport?.retainedOriginCanineIds.length ?? 0;
  const flushedCount = finalStep?.flushReport?.flushedOriginCanineIds.length ?? 0;
  const status =
    retainedCount === 0 && flushedCount > 0
      ? "Final planned puppy is clean against the starting history window."
      : "Final planned puppy still carries starting history inside the tracked window.";

  panel.append(createElement("h3", undefined, "Final step preview"), createElement("p", undefined, status));
  return panel;
}

function createPlannerWorkflow(): HTMLElement {
  const result = planBreedingForCanine(dataStore, plannerState.selectedTargetId, {
    includeRelatedCandidates: plannerState.includeRelatedCandidates,
    includeSameHumanCandidates: plannerState.includeSameHumanCandidates
  });
  if (!plannerState.selectedCandidateId || !result.candidates.some((candidate) => candidate.canine.id === plannerState.selectedCandidateId)) {
    plannerState.selectedCandidateId = result.candidates[0]?.canine.id ?? "";
  }

  const selectedCandidate = result.candidates.find((candidate) => candidate.canine.id === plannerState.selectedCandidateId) ?? null;
  const section = createElement("section", "workflow-section");
  const layout = createElement("div", "planner-layout");
  const controls = createElement("div", "calculator-form");
  const output = createElement("div", "calculator-output");

  controls.append(
    createLabel("Breeding target filter", createBreedingTargetFilterInput()),
    createLabel("Breeding target", createBreedingTargetSelect()),
    createPlannerFilterToggles()
  );

  output.append(createPlannerSummary(result.selectedLabel, result.selected?.gender ?? null, result.candidates.length, result.warnings));
  output.append(createCandidateTable(result.candidates));
  output.append(createCandidateDetail(selectedCandidate));

  layout.append(controls, output);
  section.append(createElement("h3", undefined, "Breeding planner workflow"), layout);

  return section;
}

function createBreedingTargetFilterInput(): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.value = plannerState.targetFilter;
  input.placeholder = "ball, cover, ringo...";
  input.addEventListener("input", () => {
    plannerState.targetFilter = input.value;
    const select = document.querySelector<HTMLSelectElement>(`#${breedingTargetSelectId}`);
    if (select) {
      updateBreedingTargetSelectOptions(select);
    }
  });

  return input;
}

function createBreedingTargetSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control");
  select.id = breedingTargetSelectId;
  select.addEventListener("change", () => {
    plannerState.selectedTargetId = select.value;
    plannerState.selectedCandidateId = "";
    render();
  });
  updateBreedingTargetSelectOptions(select);

  return select;
}

function createPlannerFilterToggles(): HTMLElement {
  const group = createElement("div", "toggle-group");
  const relatedButton = createToggleButton(
    plannerState.includeRelatedCandidates ? "Hide Related" : "Show Related",
    plannerState.includeRelatedCandidates,
    () => {
      plannerState.includeRelatedCandidates = !plannerState.includeRelatedCandidates;
      plannerState.selectedCandidateId = "";
      render();
    }
  );
  const altButton = createToggleButton(
    plannerState.includeSameHumanCandidates ? "Hide Alt-Blocked" : "Show Alt-Blocked",
    plannerState.includeSameHumanCandidates,
    () => {
      plannerState.includeSameHumanCandidates = !plannerState.includeSameHumanCandidates;
      plannerState.selectedCandidateId = "";
      render();
    }
  );

  group.append(relatedButton, altButton);
  return group;
}

function createToggleButton(label: string, isActive: boolean, onClick: () => void): HTMLButtonElement {
  const button = createElement("button", isActive ? "toggle-button toggle-button-active" : "toggle-button", label);
  button.type = "button";
  button.setAttribute("aria-pressed", String(isActive));
  button.addEventListener("click", onClick);

  return button;
}

function getFilteredBreedingTargetOptions(): BreedingCanineOption[] {
  return filterBreedingCanineOptions(breedingCanineOptions, plannerState.targetFilter);
}

function updateBreedingTargetSelectOptions(select: HTMLSelectElement): void {
  const filteredOptions = getFilteredBreedingTargetOptions();
  select.textContent = "";

  if (filteredOptions.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = plannerState.selectedTargetId;
    emptyOption.textContent = "No matching breeding targets";
    select.append(emptyOption);
    return;
  }

  const selectedTargetIsVisible = filteredOptions.some((option) => option.canineId === plannerState.selectedTargetId);
  if (!selectedTargetIsVisible) {
    plannerState.selectedTargetId = filteredOptions[0].canineId;
    plannerState.selectedCandidateId = "";
  }

  for (const option of filteredOptions) {
    const element = document.createElement("option");
    element.value = option.canineId;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = plannerState.selectedTargetId;
}

function createPlannerSummary(
  selectedLabel: string,
  selectedGender: string | null,
  candidateCount: number,
  warnings: readonly string[]
): HTMLElement {
  const summary = createElement("section", warnings.length > 0 ? "warning-box" : "data-health data-health-ok");
  summary.append(
    createElement("h3", undefined, selectedLabel),
    createElement(
      "p",
      undefined,
      `${candidateCount} opposite-gender active candidate${candidateCount === 1 ? "" : "s"} found. Estimates update live from the selected target and candidate trait profiles.`
    )
  );
  summary.append(createElement("p", "subtle-line", `Target gender: ${formatGenderLabel(selectedGender)}`));

  if (warnings.length > 0) {
    const list = createElement("ul", "error-list");
    for (const warning of warnings) {
      list.append(createElement("li", undefined, warning));
    }
    summary.append(list);
  }

  return summary;
}

function createCandidateTable(candidates: readonly PlannerCandidate[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const title = createElement("h3", undefined, "Candidate mates");
  const table = createElement("table", "data-table candidate-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  const shouldShowReasonColumn = plannerState.includeRelatedCandidates || plannerState.includeSameHumanCandidates;
  const labels = shouldShowReasonColumn ? ["Mate", "Score", "Live Estimate", "Why Shown"] : ["Mate", "Score", "Live Estimate"];

  for (const label of labels) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const candidate of candidates.slice(0, 20)) {
    const row = document.createElement("tr");
    row.className = candidate.canine.id === plannerState.selectedCandidateId ? "selected-row" : "";
    row.addEventListener("click", () => {
      plannerState.selectedCandidateId = candidate.canine.id;
      render();
    });
    const cells = [
      createCandidateNameCell(candidate),
      createElement("td", "numeric-cell", `${formatPlannerNumber(candidate.traitTotal)} / ${formatPlannerNumber(candidate.procreation)}`),
      createElement(
        "td",
        "numeric-cell",
        candidate.estimate ? formatPlannerPair(candidate.estimate.traitTotal, candidate.estimate.procreation) : "unknown"
      )
    ];

    if (shouldShowReasonColumn) {
      cells.push(createElement("td", undefined, formatCandidateReason(candidate)));
    }

    row.append(...cells);
    body.append(row);
  }

  table.append(head, body);
  section.append(title, table);

  return section;
}

function createCandidateNameCell(candidate: PlannerCandidate): HTMLTableCellElement {
  const cell = createElement("td");
  cell.append(
    createElement("strong", undefined, candidate.canine.displayName),
    createElement(
      "span",
      "subtle-line",
      `${formatGenderLabel(candidate.canine.gender)} | ${candidate.characterName} / ${candidate.humanName}`
    )
  );

  return cell;
}

function formatCandidateReason(candidate: PlannerCandidate): string {
  const reasons: string[] = [];

  if (!candidate.isGeneticallySafe) {
    reasons.push("Related");
  }

  if (!candidate.isDirectBreedingPractical) {
    reasons.push("Alt-Blocked");
  }

  return reasons.length > 0 ? reasons.join(", ") : "Standard";
}

function formatPlanId(value: string): string {
  return value.replace(/^canine-/, "").replaceAll("-", " ");
}

function createCandidateDetail(candidate: PlannerCandidate | null): HTMLElement {
  const detail = createElement("section", "candidate-detail");

  if (!candidate) {
    detail.append(createElement("h3", undefined, "Candidate detail"), createElement("p", undefined, "No candidate selected."));
    return detail;
  }

  const cards = createElement("div", "result-cards");
  for (const [label, value] of [
    ["Live Estimate", candidate.estimate ? formatPlannerPair(candidate.estimate.traitTotal, candidate.estimate.procreation) : "unknown"],
    ["Genetic", candidate.isGeneticallySafe ? "Safe" : "Related"],
    ["Availability", candidate.isDirectBreedingPractical ? "Direct breeding available" : "Same-human alt blocked"]
  ]) {
    const card = createElement("div", "result-card");
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  detail.append(createElement("h3", undefined, candidate.canine.displayName), cards);

  if (candidate.warnings.length > 0) {
    detail.append(createWarnings(candidate.warnings));
  }

  if (candidate.relationship.sharedAncestors.length > 0) {
    const list = createElement("ul", "error-list lineage-list");
    for (const ancestor of candidate.relationship.sharedAncestors) {
      list.append(
        createElement(
          "li",
          undefined,
          `${ancestor.canineId}: target ${ancestor.leftSlots.join(", ")} / mate ${ancestor.rightSlots.join(", ")}`
        )
      );
    }
    detail.append(createElement("h3", undefined, "Shared ancestry"), list);
  }

  if (candidate.puppyLineage) {
    const lineage = candidate.puppyLineage;
    const preview = createElement("pre", "lineage-preview");
    preview.textContent = [
      `sire: ${lineage.sireId ?? "unknown"}`,
      `dam: ${lineage.damId ?? "unknown"}`,
      `paternal grandsire: ${lineage.paternalGrandSireId ?? "unknown"}`,
      `paternal granddam: ${lineage.paternalGrandDamId ?? "unknown"}`,
      `maternal grandsire: ${lineage.maternalGrandSireId ?? "unknown"}`,
      `maternal granddam: ${lineage.maternalGrandDamId ?? "unknown"}`
    ].join("\n");
    detail.append(createElement("h3", undefined, "Hypothetical puppy lineage"), preview);
  }

  if (candidate.estimate) {
    const noteList = createElement("ul", "error-list");
    for (const note of candidate.estimate.notes) {
      noteList.append(createElement("li", undefined, note));
    }
    detail.append(noteList);
  }

  return detail;
}

function formatPlannerNumber(value: number | null): string {
  return value === null ? "unknown" : Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPlannerPair(left: number | null, right: number | null): string {
  return `${formatPlannerNumber(left)} / ${formatPlannerNumber(right)}`;
}

function formatGenderLabel(gender: string | null): string {
  if (gender === "M") {
    return "Male";
  }

  if (gender === "F") {
    return "Female";
  }

  if (gender === "A") {
    return "Any/neutral";
  }

  return "Unknown";
}

function createPlaceholderGrid(view: ViewDefinition): HTMLElement {
  const grid = createElement("div", "tool-grid");

  for (const item of view.items) {
    const tile = createElement("section", "tool-tile");
    tile.append(createElement("h3", undefined, item), createElement("div", "tile-slot"));
    grid.append(tile);
  }

  return grid;
}

function createDataHealthPanel(store: DataStore): HTMLElement {
  const panel = createElement(
    "section",
    store.integrity.isValid ? "data-health data-health-ok" : "data-health data-health-error"
  );
  const title = createElement("h3", undefined, store.integrity.isValid ? "Repository data loaded" : "Data load problem");
  const summary = createElement(
    "p",
    undefined,
    store.integrity.isValid
      ? `${store.stats.humans} humans, ${store.stats.characters} characters, ${store.stats.activeCanines} active canines, ${store.stats.knownTraitProfiles} known trait profiles, ${store.stats.lineageProfiles} lineage profiles, ${store.stats.collarReferences} collar references.`
      : `${store.integrity.errors.length} data issue${store.integrity.errors.length === 1 ? "" : "s"} found.`
  );

  panel.append(title, summary);

  if (!store.integrity.isValid) {
    const list = createElement("ul", "error-list");
    for (const error of store.integrity.errors.slice(0, 8)) {
      list.append(createElement("li", undefined, error));
    }
    panel.append(list);
  }

  return panel;
}

function createTopCaninesTable(summaries: CanineSummary[]): HTMLElement {
  const section = createElement("section", "data-table-section");
  const title = createElement("h3", undefined, "Top known canines");
  const table = createElement("table", "data-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Canine", "Character", "Human", "Total", "Procreation"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const summary of summaries) {
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, summary.canine.displayName),
      createElement("td", undefined, summary.character?.name ?? "unknown"),
      createElement("td", undefined, summary.human?.displayName ?? "unknown"),
      createElement("td", "numeric-cell", summary.totalLabel),
      createElement("td", "numeric-cell", summary.procreationLabel)
    );
    body.append(row);
  }

  table.append(head, body);
  section.append(title, table);

  return section;
}

function createCalculatorWorkflow(): HTMLElement {
  const selectedKnown = knownCanineOptions.find((option) => option.canineId === calculatorState.selectedKnownId);
  const draftResult = solveCalculatorInput(selectedKnown, calculatorState.directionMode, calculatorState.comparisonText);
  const result = solveCalculatorHistory(calculatorState.history, calculatorState.resultName || "Solved canine");
  const section = createElement("section", "workflow-section");
  const controls = createElement("div", "calculator-layout");
  const form = createElement("div", "calculator-form");
  const output = createElement("div", "calculator-output");

  form.append(
    createLabel("Known canine filter", createKnownCanineFilterInput()),
    createLabel("Known canine", createKnownCanineSelect()),
    createLabel("Comparison direction", createDirectionSelect()),
    createLabel("Result name", createResultNameInput()),
    createLabel("Comparison text", createComparisonTextArea()),
    createCalculatorActions()
  );

  output.append(
    createDirectionHint(draftResult.directionSuggestion, draftResult.direction),
    createWarnings([...calculatorState.draftWarnings, ...result.warnings]),
    createComparisonHistory(calculatorState.history)
  );

  if (result.resultRow) {
    output.append(createResultCards(result.resultRow), createTraitResultTable(result.resultRow), createExportBlock(result.exportText));
  } else {
    output.append(createElement("div", "empty-state", "Add comparisons to build a merged solved profile."));
  }

  controls.append(form, output);
  section.append(createElement("h3", undefined, "Trait calculator workflow"), controls);

  return section;
}

function createKnownCanineSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control");
  select.id = knownCanineSelectId;

  select.addEventListener("change", () => {
    calculatorState.selectedKnownId = select.value;
  });

  updateKnownCanineSelectOptions(select);

  return select;
}

function createKnownCanineFilterInput(): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.value = calculatorState.knownFilter;
  input.placeholder = "ball, ringo, mulapin...";
  input.addEventListener("input", () => {
    calculatorState.knownFilter = input.value;
    const select = document.querySelector<HTMLSelectElement>(`#${knownCanineSelectId}`);
    if (select) {
      updateKnownCanineSelectOptions(select);
    }
  });

  return input;
}

function getFilteredKnownCanineOptions(): KnownCanineOption[] {
  return filterKnownCanineOptions(knownCanineOptions, calculatorState.knownFilter);
}

function updateKnownCanineSelectOptions(select: HTMLSelectElement): void {
  const filteredOptions = getFilteredKnownCanineOptions();

  select.textContent = "";

  if (filteredOptions.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = calculatorState.selectedKnownId;
    emptyOption.textContent = "No matching known canines";
    select.append(emptyOption);
    return;
  }

  const selectedKnownIsVisible = filteredOptions.some((option) => option.canineId === calculatorState.selectedKnownId);
  if (!selectedKnownIsVisible) {
    calculatorState.selectedKnownId = filteredOptions[0].canineId;
  }

  for (const option of filteredOptions) {
    const element = document.createElement("option");
    element.value = option.canineId;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = calculatorState.selectedKnownId;
}

function createDirectionSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control");
  const options: Array<[CalculatorDirectionMode, string]> = [
    ["auto", "Auto-suggest"],
    ["unknown-to-known", "Unknown to known"],
    ["known-to-unknown", "Known to unknown"]
  ];

  select.addEventListener("change", () => {
    calculatorState.directionMode = select.value as CalculatorDirectionMode;
    render();
  });

  for (const [value, label] of options) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = label;
    select.append(element);
  }

  select.value = calculatorState.directionMode;

  return select;
}

function createResultNameInput(): HTMLInputElement {
  const input = createElement("input", "field-control");
  input.value = calculatorState.resultName;
  input.placeholder = "Solved canine";
  input.addEventListener("input", () => {
    calculatorState.resultName = input.value;
  });

  return input;
}

function createComparisonTextArea(): HTMLTextAreaElement {
  const textarea = createElement("textarea", "field-control comparison-input");
  textarea.value = calculatorState.comparisonText;
  textarea.spellcheck = false;
  textarea.addEventListener("input", () => {
    calculatorState.comparisonText = textarea.value;
  });

  return textarea;
}

function createCalculatorActions(): HTMLElement {
  const actions = createElement("div", "button-row");
  const solveButton = createElement("button", "primary-button", "Add comparison");
  const resetButton = createElement("button", "secondary-button", "Reset");

  solveButton.type = "button";
  solveButton.addEventListener("click", () => {
    addComparisonToHistory();
  });

  resetButton.type = "button";
  resetButton.addEventListener("click", () => {
    calculatorState.history = [];
    calculatorState.comparisonText = "";
    calculatorState.draftWarnings = [];
    render();
  });

  actions.append(solveButton, resetButton);
  return actions;
}

function addComparisonToHistory(): void {
  const selectedKnown = knownCanineOptions.find((option) => option.canineId === calculatorState.selectedKnownId);
  const { entry, warnings } = createCalculatorHistoryEntry(
    selectedKnown,
    calculatorState.directionMode,
    calculatorState.comparisonText,
    crypto.randomUUID()
  );

  calculatorState.draftWarnings = warnings;

  if (entry) {
    calculatorState.history = [...calculatorState.history, entry];
    calculatorState.comparisonText = "";
  }

  render();
}

function createLabel(text: string, control: HTMLElement, isDimmed = false): HTMLElement {
  const label = createElement("label", isDimmed ? "field-label field-label-dimmed" : "field-label");
  label.append(createElement("span", undefined, text), control);

  return label;
}

function createDirectionHint(
  suggestion: ReturnType<typeof solveCalculatorInput>["directionSuggestion"],
  direction: ReturnType<typeof solveCalculatorInput>["direction"]
): HTMLElement {
  const hint = createElement("div", "direction-hint");
  const directionLabel =
    direction === "known-to-unknown"
      ? "Known to unknown"
      : direction === "unknown-to-known"
        ? "Unknown to known"
        : "Waiting";
  const reason = suggestion ? `${suggestion.confidence} suggestion: ${suggestion.reason}` : "Paste text to inspect direction.";

  hint.append(createElement("strong", undefined, directionLabel), createElement("span", undefined, reason));

  return hint;
}

function createWarnings(warnings: readonly string[]): HTMLElement {
  const box = createElement("div", warnings.length > 0 ? "warning-box" : "warning-box warning-box-empty");

  if (warnings.length === 0) {
    box.textContent = "No parser or solver warnings.";
    return box;
  }

  const list = createElement("ul", "error-list");
  for (const warning of warnings.slice(0, 12)) {
    list.append(createElement("li", undefined, warning));
  }
  box.append(list);

  return box;
}

function createComparisonHistory(entries: readonly CalculatorHistoryEntry[]): HTMLElement {
  const section = createElement("section", "history-panel");
  const title = createElement("h3", undefined, `Comparison history (${entries.length})`);

  section.append(title);

  if (entries.length === 0) {
    section.append(createElement("p", undefined, "No comparisons added yet."));
    return section;
  }

  const list = createElement("ol", "history-list");

  for (const entry of entries) {
    const item = createElement("li", "history-item");
    const summary = createElement(
      "span",
      undefined,
      `${entry.knownLabel} | ${formatDirectionLabel(entry.direction)} | ${entry.blockCount} block${entry.blockCount === 1 ? "" : "s"}`
    );
    const removeButton = createElement("button", "icon-button", "Remove");
    removeButton.type = "button";
    removeButton.addEventListener("click", () => {
      calculatorState.history = calculatorState.history.filter((historyEntry) => historyEntry.id !== entry.id);
      render();
    });
    item.append(summary, removeButton);
    list.append(item);
  }

  section.append(list);
  return section;
}

function formatDirectionLabel(direction: CalculatorHistoryEntry["direction"]): string {
  return direction === "known-to-unknown" ? "known to unknown" : "unknown to known";
}

function createResultCards(row: Record<string, string>): HTMLElement {
  const cards = createElement("div", "result-cards");
  const values = [
    ["TOTAL", row.TOTAL],
    ["Procreation", row.Procreation],
    ["Overall", row.Overall || "same as total"]
  ];

  for (const [label, value] of values) {
    const card = createElement("div", "result-card");
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    cards.append(card);
  }

  return cards;
}

function createTraitResultTable(row: Record<string, string>): HTMLElement {
  const table = createElement("table", "data-table trait-result-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Trait", "Solved value"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  for (const trait of traitNames) {
    const tr = document.createElement("tr");
    tr.append(createElement("td", undefined, trait), createElement("td", "numeric-cell", row[trait]));
    body.append(tr);
  }

  table.append(head, body);
  return table;
}

function createExportBlock(exportText: string): HTMLElement {
  const block = createElement("div", "export-block");
  const textarea = createElement("textarea", "field-control export-output");
  const button = createElement("button", "secondary-button", "Copy row");

  textarea.readOnly = true;
  textarea.value = exportText;
  button.type = "button";
  button.addEventListener("click", () => {
    void navigator.clipboard?.writeText(exportText);
  });

  block.append(createElement("h3", undefined, "Export row"), textarea, button);
  return block;
}

render();
