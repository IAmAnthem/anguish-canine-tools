import {
  filterBreedingCanineOptions,
  getBreedingCanineOptions,
  planBreedingForCanine,
  type BreedingCanineOption,
  type PlannerCandidate
} from "./app/breedingPlanner.js";
import {
  createDataBrowserRow,
  defaultDataBrowserFilters,
  formatTraitValue,
  getDataBrowserResult,
  type DataBrowserFilters,
  type DataBrowserRow
} from "./app/dataBrowser.js";
import {
  createDataStore,
  formatBreedingRole,
  type CanineAppearance,
  type BreedingRole,
  type CanineSummary,
  type DataStore
} from "./app/dataStore.js";
import { createHerdHealthReport, type HerdHealthReport } from "./app/herdHealth.js";
import { getAutoPlanDemoPackage, getAutoPlanSummary, type AutoPlanPackage } from "./app/autoPlan.js";
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
  rangerAbilityNotes,
  rangerAbilityRows,
  rangerAppearanceNotes,
  rangerBondingRows,
  rangerBreedingNotes,
  rangerBreedingStockNotes,
  rangerClassOverview,
  rangerCommandRows,
  rangerCompareNotes,
  rangerDescriptorRows,
  rangerEyeRows,
  rangerHeatRows,
  rangerMiscNotes,
  rangerObserveRows,
  rangerPetRoleNotes,
  rangerRaceRows,
  rangerSizeRows,
  rangerStatNotes,
  rangerTameNotes,
  rangerTraitDescriptorRows,
  rangerTraitNames,
  rangerTrainingNotes,
  rangerVisibleStatTables
} from "./app/rangerClassData.js";
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

type AppView = "calculator" | "planner" | "multi-step" | "browser" | "herd" | "autoplan" | "algorithms" | "ranger" | "directions" | "contribute";
type CuratedCanineStatus = "active" | "inactive" | "unknown";
type CuratedBreedingRole = "breeding" | "play-only" | "retired" | "unknown";
type CuratedGender = "M" | "F" | "U" | "A";
type CurationMode = "status" | "ownership" | "breeding-role" | "canine-type" | "gender" | "appearance";
type HerdPane = "health" | "curate";
type RangerPane = "overview" | "abilities" | "companions" | "breeding" | "appearance" | "gear";

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
    id: "herd",
    label: "Herd Health",
    eyebrow: "Population view",
    title: "Herd health and curation",
    status: "Population health plus maintainer curation tools for keeping the breeding pool usable.",
    items: ["Health", "Curate", "Relatedness", "Mate options"]
  },
  {
    id: "autoplan",
    label: "AutoPlan",
    eyebrow: "Roadmap generation",
    title: "AutoPlan mode",
    status: "First-pass roadmap builder for multi-player, multi-cycle breeding plans and shareable handoff packages.",
    items: ["Players", "Cycles", "Roadmap", "Exchange"]
  },
  {
    id: "algorithms",
    label: "Algorithms",
    eyebrow: "Mate finder",
    title: "Mating algorithms",
    status: "OCS is the default general-breeding ranking, with compensatory and assortative modes for special goals.",
    items: ["Algorithm", "Target canine", "Ranked mates", "Tradeoffs"]
  },
  {
    id: "ranger",
    label: "Ranger Class",
    eyebrow: "Class reference",
    title: "Ranger class data",
    status: "Curated ranger-class mechanics, companion science, breeding guidance, and collar reference data.",
    items: ["Overview", "Companions", "Breeding", "Appearance"]
  },
  {
    id: "directions",
    label: "App Directions",
    eyebrow: "How to use this",
    title: "App directions",
    status: "Orientation for what each tab does and how to move through the site.",
    items: ["Tabs", "Workflow", "Start here", "Why"]
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
  knownHumanId: "all" | string;
  hideRetiredKnowns: boolean;
  directionMode: CalculatorDirectionMode;
  comparisonText: string;
  resultName: string;
  humanName: string;
  characterName: string;
  callName: string;
  observedDescription: string;
  exportStatus: CuratedCanineStatus;
  exportBreedingRole: CuratedBreedingRole;
  history: CalculatorHistoryEntry[];
  draftWarnings: string[];
} = {
  selectedKnownId: knownCanineOptions[0]?.canineId ?? "",
  knownFilter: "",
  knownHumanId: "all",
  hideRetiredKnowns: true,
  directionMode: "auto",
  comparisonText: "",
  resultName: "",
  humanName: "",
  characterName: "",
  callName: "",
  observedDescription: "",
  exportStatus: "active",
  exportBreedingRole: "breeding",
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
  hideInactive: boolean;
  filters: Pick<DataBrowserFilters, "query" | "gender" | "status" | "breedingRole" | "canineType" | "humanId"> & {
    characterId: "all" | string;
  };
  selectedCanineId: string;
  statusUpdatesByCanineId: Record<string, CuratedCanineStatus>;
  breedingRoleUpdatesByCanineId: Record<string, CuratedBreedingRole>;
  canineTypeUpdatesByCanineId: Record<string, string | null>;
  genderUpdatesByCanineId: Record<string, CuratedGender>;
  appearanceUpdatesByCanineId: Record<string, CanineAppearance>;
  humanUpdatesByCharacterId: Record<string, string | null>;
  copiedPatch: boolean;
} = {
  mode: "status",
  hideInactive: true,
  filters: {
    query: "",
    gender: "all",
    status: "all",
    breedingRole: "all",
    canineType: "all",
    humanId: "all",
    characterId: "all"
  },
  selectedCanineId: "",
  statusUpdatesByCanineId: {},
  breedingRoleUpdatesByCanineId: {},
  canineTypeUpdatesByCanineId: {},
  genderUpdatesByCanineId: {},
  appearanceUpdatesByCanineId: {},
  humanUpdatesByCharacterId: {},
  copiedPatch: false
};
const herdState: {
  activePane: HerdPane;
} = {
  activePane: "health"
};
const autoPlanDemoPackage = getAutoPlanDemoPackage();
const autoPlanState: {
  cooperatingHumanIds: [string, string];
  advancingHumanId: string;
  advancingStrategy: "lowest" | "highest";
  requestedAltCount: number;
  cyclesPerLine: number;
} = {
  cooperatingHumanIds: [
    autoPlanDemoPackage.request.cooperatingHumanIds[0] ?? dataStore.data.canonical.humans[0]?.id ?? "",
    autoPlanDemoPackage.request.cooperatingHumanIds[1] ?? dataStore.data.canonical.humans[1]?.id ?? ""
  ],
  advancingHumanId: autoPlanDemoPackage.request.advancingHumanId,
  advancingStrategy: "lowest",
  requestedAltCount: autoPlanDemoPackage.request.requestedAltCount,
  cyclesPerLine: autoPlanDemoPackage.request.cyclesPerLine
};
const rangerState: {
  activePane: RangerPane;
} = {
  activePane: "overview"
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
  const layout = createElement(
    "section",
    activeView === "herd" || activeView === "autoplan" ? "workspace workspace-wide" : "workspace"
  );
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
  const links = createElement("p", "summary header-links");
  const siteLink = document.createElement("a");
  const telnetLink = document.createElement("a");
  const status = createElement("div", "status-strip");
  const statusItems = [
    ["Canines", String(store.stats.canines), "Total canonical canine records currently loaded into the app."],
    ["Active", String(store.stats.activeCanines), "Canines currently marked active in the dataset, whether or not they are part of the breeding cadre."],
    ["Breeding", String(store.stats.breedingCanines), "Active canines currently treated as part of the breeding cadre for planner, herd, and algorithm views."],
    ["Profiles", String(store.stats.knownTraitProfiles), "Known trait profiles with usable solved stat data."],
    ["Refs", String(store.stats.collarReferences), "Reference rows loaded for collars, gems, and related guidance tables."],
    ["Data", store.integrity.isValid ? "Verified" : "Needs Work", "Repository data integrity status based on the built-in validation checks."]
  ];

  for (const [label, value, tooltip] of statusItems) {
    const item = createElement("div", "status-item");
    item.title = tooltip;
    item.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    status.append(item);
  }

  siteLink.href = "https://anguish.org/";
  siteLink.target = "_blank";
  siteLink.rel = "noreferrer";
  siteLink.textContent = "https://anguish.org/";

  telnetLink.href = "telnet://ancient.anguish.org:2222";
  telnetLink.textContent = "telnet://ancient.anguish.org:2222";

  links.append("Website: ", siteLink, " | Telnet: ", telnetLink);

  titleGroup.append(eyebrow, title, summary, links);
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
  } else if (view.id === "herd") {
    panel.append(createHerdWorkspace(store));
  } else if (view.id === "autoplan") {
    panel.append(createAutoPlanPlaceholderWorkflow());
  } else if (view.id === "algorithms") {
    panel.append(createMatingAlgorithmsWorkflow(store));
  } else if (view.id === "ranger") {
    panel.append(createRangerClassWorkflow(store));
  } else if (view.id === "directions") {
    panel.append(createAppDirectionsWorkflow());
  } else {
    panel.append(createContributorWorkflow());
  }

  return panel;
}

function createHerdWorkspace(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  section.append(createElement("h3", undefined, "Herd health"), createHerdPaneToggle());

  if (herdState.activePane === "health") {
    section.append(createHerdHealthWorkflow(store));
  } else {
    section.append(createCurationWorkflow(store));
  }

  return section;
}

function createHerdPaneToggle(): HTMLElement {
  const group = createElement("div", "toggle-group");

  for (const [pane, label] of [
    ["health", "Herd health"],
    ["curate", "Curate"]
  ] as const) {
    const button = createElement(
      "button",
      herdState.activePane === pane ? "toggle-button toggle-button-active" : "toggle-button",
      label
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(herdState.activePane === pane));
    button.addEventListener("click", () => {
      herdState.activePane = pane;
      render();
    });
    group.append(button);
  }

  return group;
}

function createAutoPlanPlaceholderWorkflow(): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  const generatedPackage = createAutoPlanPreviewPackage(dataStore);
  const summary = getAutoPlanSummary(generatedPackage);
  section.append(
    createAutoPlanRequestPanel(dataStore),
    createAutoPlanSummaryPanel(summary),
    createAutoPlanPackageShapePanel(generatedPackage),
    createAutoPlanLinePreviewPanel(generatedPackage, dataStore)
  );
  return section;
}

function createAutoPlanRequestPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const controls = createElement("div", "field-grid algorithm-controls");
  const firstHumanSelect = createElement("select", "field-control");
  const secondHumanSelect = createElement("select", "field-control");
  const advancingHumanSelect = createElement("select", "field-control");
  const advancingStrategySelect = createElement("select", "field-control");
  const altCountSelect = createElement("select", "field-control");
  const cycleCountSelect = createElement("select", "field-control");
  const humanOptions = store.data.canonical.humans
    .filter((human) => human.id !== "human-unknown")
    .sort((left, right) => left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }));

  for (const human of humanOptions) {
    const firstOption = document.createElement("option");
    firstOption.value = human.id;
    firstOption.textContent = human.displayName;
    firstOption.selected = autoPlanState.cooperatingHumanIds[0] === human.id;
    firstHumanSelect.append(firstOption);

    const secondOption = document.createElement("option");
    secondOption.value = human.id;
    secondOption.textContent = human.displayName;
    secondOption.selected = autoPlanState.cooperatingHumanIds[1] === human.id;
    secondHumanSelect.append(secondOption);

    const advancingOption = document.createElement("option");
    advancingOption.value = human.id;
    advancingOption.textContent = human.displayName;
    advancingOption.selected = autoPlanState.advancingHumanId === human.id;
    advancingHumanSelect.append(advancingOption);
  }

  for (let count = 1; count <= 4; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = String(count);
    option.selected = autoPlanState.requestedAltCount === count;
    altCountSelect.append(option);
  }

  for (let count = 1; count <= 4; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = String(count);
    option.selected = autoPlanState.cyclesPerLine === count;
    cycleCountSelect.append(option);
  }

  for (const [value, label] of [
    ["lowest", "Autopick lowest active characters"],
    ["highest", "Autopick highest active characters"]
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = autoPlanState.advancingStrategy === value;
    advancingStrategySelect.append(option);
  }

  firstHumanSelect.addEventListener("change", () => {
    autoPlanState.cooperatingHumanIds[0] = firstHumanSelect.value;
    render();
  });
  secondHumanSelect.addEventListener("change", () => {
    autoPlanState.cooperatingHumanIds[1] = secondHumanSelect.value;
    render();
  });
  advancingHumanSelect.addEventListener("change", () => {
    autoPlanState.advancingHumanId = advancingHumanSelect.value;
    render();
  });
  advancingStrategySelect.addEventListener("change", () => {
    autoPlanState.advancingStrategy = advancingStrategySelect.value as typeof autoPlanState.advancingStrategy;
    render();
  });
  altCountSelect.addEventListener("change", () => {
    autoPlanState.requestedAltCount = Number(altCountSelect.value);
    render();
  });
  cycleCountSelect.addEventListener("change", () => {
    autoPlanState.cyclesPerLine = Number(cycleCountSelect.value);
    render();
  });

  controls.append(
    createLabel("Player 1", firstHumanSelect),
    createLabel("Player 2", secondHumanSelect),
    createLabel("Advancing player", advancingHumanSelect),
    createLabel("Advancing strategy", advancingStrategySelect),
    createLabel("Alts to advance", altCountSelect),
    createLabel("Cycles per line", cycleCountSelect)
  );

  panel.append(
    createElement("h3", undefined, "AutoPlan request"),
    createElement(
      "p",
      "plan-note",
      "This first pass builds a shareable roadmap skeleton. The default planning assumption is OCS-style general breeding, then the human herdmaster reviews and adjusts the specific pairings. By default, AutoPlan starts from the advancing player's lowest active lines."
    ),
    controls
  );

  return panel;
}

function createAutoPlanSummaryPanel(summary: ReturnType<typeof getAutoPlanSummary>): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("dl", "key-value-list");
  const items: Array<[string, string]> = [
    ["Package", summary.packageName],
    ["Cooperating humans", summary.cooperatingHumans.join(" + ")],
    ["Advancing human", summary.advancingHumanId],
    ["Advancing strategy", autoPlanState.advancingStrategy === "lowest" ? "Lowest active lines first" : "Highest active lines first"],
    ["Line count", String(summary.lineCount)],
    ["Cycles per line", String(summary.cyclesPerLine)],
    ["Total cycles", String(summary.totalCycles)]
  ];

  for (const [label, value] of items) {
    list.append(createElement("dt", undefined, label), createElement("dd", undefined, value));
  }

  panel.append(
    createElement("h3", undefined, "AutoPlan roadmap summary"),
    createElement("p", "plan-note", "This is the first-pass AutoPlan package shape: request, roadmap lines, and cycle skeletons generated from the current player choices."),
    list
  );

  return panel;
}

function createAutoPlanPackageShapePanel(pkg: AutoPlanPackage): HTMLElement {
  return createSimpleTablePanel(
    "AutoPlan package fields",
    "These are the top-level structures Phase 5A is defining before generation logic exists.",
    ["Field", "Purpose"],
    [
      ["request", "Who is cooperating, who is advancing, how many lines, and how many cycles."],
      ["sourceSnapshot", "What canonical data snapshot the roadmap was based on."],
      ["lines", "Parallel advancing tracks that the roadmap will manage."],
      ["cycles", "Concrete breeding-cycle skeletons inside each line."],
      ["estimatedCarryForwardId", "A distinct AutoPlan-local placeholder for the expected keeper/output of that cycle."],
      ["status", "Whether a line or cycle is still planned, in progress, blocked, or completed later."]
    ]
  );
}

function createAutoPlanLinePreviewPanel(pkg: AutoPlanPackage, store: DataStore): HTMLElement {
  const section = createElement("section", "guidance-layout");

  for (const line of pkg.lines) {
    const panel = createElement("section", "plan-panel");
    const lineActivePet = getPrimaryActivePetForCharacter(store, line.advancingCharacterId);
    const rows = line.cycles.map((cycle) => [
      String(cycle.cycleNumber),
      cycle.advancingCharacterId,
      cycle.cycleNumber === 1
        ? describeCharacterPets(store, cycle.advancingCharacterId)
        : `${line.lineId}:carry-${cycle.cycleNumber - 1}`,
      cycle.supportCharacterId ?? "unassigned",
      cycle.supportCharacterId ? describeCharacterPets(store, cycle.supportCharacterId) : "unassigned",
      cycle.estimatedCarryForwardId.replace(`${line.lineId}:`, ""),
      cycle.goal
    ]);

    panel.append(
      createElement("h3", undefined, line.lineLabel),
      createElement(
        "p",
        "plan-note",
        `Line id: ${line.lineId} | Starting pet: ${describeCharacterPets(store, line.advancingCharacterId)}${
          lineActivePet?.traitProfile && typeof lineActivePet.traitProfile.total === "number"
            ? ` | Total ${lineActivePet.traitProfile.total} / Proc ${formatTraitValue(lineActivePet.traitProfile.traits?.Procreation)}`
            : ""
        }`
      ),
      createSimpleTablePanel(
        "Cycle roadmap",
        "Each cycle is a concrete breeding step with an expected carry-forward result, even before the real litter exists.",
        ["Cycle", "Advancing character", "Advancing pet(s)", "Support character", "Support pet(s)", "Estimated carry-forward", "Goal"],
        rows
      )
    );

    section.append(panel);
  }

  return section;
}

function describeCharacterPets(store: DataStore, characterId: string): string {
  const activePets = store.data.canonical.canines
    .filter((canine) => canine.characterId === characterId && canine.status === "active")
    .sort((left, right) => left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }))
    .map((canine) => `${canine.displayName} (${formatBreedingRole(normalizeCuratedBreedingRole(canine.breedingRole))})`);

  if (activePets.length > 0) {
    return activePets.join(" | ");
  }

  const unknownPets = store.data.canonical.canines
    .filter((canine) => canine.characterId === characterId && canine.status === "unknown")
    .sort((left, right) => left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }))
    .map((canine) => `${canine.displayName} (${formatBreedingRole(normalizeCuratedBreedingRole(canine.breedingRole))})`);

  if (unknownPets.length > 0) {
    return `${unknownPets[0]} (no active pet marked)`;
  }

  return "no active pet record";
}

function createAutoPlanPreviewPackage(store: DataStore): AutoPlanPackage {
  const cooperatingHumanIds = Array.from(new Set(autoPlanState.cooperatingHumanIds.filter(Boolean)));
  const primaryHumanId = autoPlanState.advancingHumanId || cooperatingHumanIds[0] || "";
  const supportHumanIds = cooperatingHumanIds.filter((humanId) => humanId !== primaryHumanId);
  const advancingCharacters = getAutoPlanAdvancingCharacters(store, primaryHumanId, autoPlanState.requestedAltCount);
  const lines = advancingCharacters.map((characterId, index) => {
    const lineId = `line-${index + 1}`;
    const lineLabel = `${lookupCharacterName(store, characterId)} roadmap`;
    const lineActivePet = getPrimaryActivePetForCharacter(store, characterId);
    const supportCharacters = supportHumanIds.flatMap((humanId) =>
      getAutoPlanSupportCharacters(store, humanId, lineActivePet?.canine.gender ?? null)
    );
    return {
      lineId,
      advancingCharacterId: characterId,
      lineLabel,
      status: "planned" as const,
      cycles: Array.from({ length: autoPlanState.cyclesPerLine }, (_, cycleIndex) => {
        const supportCharacterId = supportCharacters.length > 0 ? supportCharacters[cycleIndex % supportCharacters.length] : null;
        return {
          cycleId: `${lineId}:cycle-${cycleIndex + 1}`,
          cycleNumber: cycleIndex + 1,
          advancingCharacterId: characterId,
          supportCharacterId,
          goal:
            cycleIndex === 0
              ? "Use general OCS-safe pairing to start the line cleanly."
              : cycleIndex === autoPlanState.cyclesPerLine - 1
                ? "Produce the cycle output and prepare the keeper for play or the next roadmap."
                : "Carry the best keeper forward while preserving herd diversity.",
          estimatedCarryForwardId: `${lineId}:carry-${cycleIndex + 1}`,
          status: "planned" as const
        };
      })
    };
  });

  return {
    schemaVersion: 1,
    kind: "autoplan-package",
    exportedAt: new Date().toISOString(),
    packageId: `autoplan-${primaryHumanId || "unknown"}`,
    packageName: `${lookupHumanName(store, primaryHumanId)} AutoPlan`,
    sourceSnapshot: {
      source: "canonical-repo-data",
      integrity: store.integrity.isValid ? "verified" : "needs-work",
      notes: "Generated from the current static repository snapshot."
    },
    request: {
      cooperatingHumanIds,
      advancingHumanId: primaryHumanId,
      advancingCharacterIds: advancingCharacters,
      requestedAltCount: autoPlanState.requestedAltCount,
      cyclesPerLine: autoPlanState.cyclesPerLine,
      notes: "Default planning assumption: OCS-style general breeding, then human review for actual pairing choices."
    },
    lines
  };
}

function getAutoPlanAdvancingCharacters(store: DataStore, humanId: string, limit: number): string[] {
  return getHumanCharacterPets(store, humanId)
    .sort((left, right) => {
      const leftTotal = typeof left.traitProfile?.total === "number" ? left.traitProfile.total : -1;
      const rightTotal = typeof right.traitProfile?.total === "number" ? right.traitProfile.total : -1;
      const totalOrder = autoPlanState.advancingStrategy === "lowest" ? leftTotal - rightTotal : rightTotal - leftTotal;
      return (
        totalOrder ||
        lookupCharacterName(store, left.character!.id).localeCompare(lookupCharacterName(store, right.character!.id), undefined, {
          sensitivity: "base"
        })
      );
    })
    .map((summary) => summary.character!.id)
    .slice(0, limit);
}

function getAutoPlanSupportCharacters(store: DataStore, humanId: string, advancingGender: string | null): string[] {
  return getHumanCharacterPets(store, humanId)
    .filter((summary) => {
      if (!advancingGender || advancingGender === "U" || summary.canine.gender === "U") {
        return true;
      }
      return summary.canine.gender !== advancingGender;
    })
    .sort((left, right) => {
      const leftTotal = typeof left.traitProfile?.total === "number" ? left.traitProfile.total : -1;
      const rightTotal = typeof right.traitProfile?.total === "number" ? right.traitProfile.total : -1;
      return (
        rightTotal - leftTotal ||
        lookupCharacterName(store, left.character!.id).localeCompare(lookupCharacterName(store, right.character!.id), undefined, {
          sensitivity: "base"
        })
      );
    })
    .map((summary) => summary.character!.id);
}

function getHumanCharacterPets(store: DataStore, humanId: string): CanineSummary[] {
  const rows = store.data.canonical.canines
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary))
    .filter((summary) => summary.character?.humanId === humanId)
    .filter((summary) => summary.canine.status === "active")
    .filter((summary) => normalizeCuratedBreedingRole(summary.canine.breedingRole) === "breeding");

  const bestByCharacter = new Map<string, CanineSummary>();
  for (const summary of rows) {
    const existing = bestByCharacter.get(summary.character!.id);
    const existingTotal = typeof existing?.traitProfile?.total === "number" ? existing.traitProfile.total : -1;
    const nextTotal = typeof summary.traitProfile?.total === "number" ? summary.traitProfile.total : -1;
    if (!existing || nextTotal > existingTotal) {
      bestByCharacter.set(summary.character!.id, summary);
    }
  }

  return Array.from(bestByCharacter.values());
}

function getPrimaryActivePetForCharacter(store: DataStore, characterId: string): CanineSummary | null {
  const candidates = store.data.canonical.canines
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary))
    .filter((summary) => summary.canine.characterId === characterId && summary.canine.status === "active")
    .sort((left, right) => {
      const leftRole = normalizeCuratedBreedingRole(left.canine.breedingRole);
      const rightRole = normalizeCuratedBreedingRole(right.canine.breedingRole);
      const leftRoleRank = leftRole === "breeding" ? 0 : leftRole === "play-only" ? 1 : leftRole === "unknown" ? 2 : 3;
      const rightRoleRank = rightRole === "breeding" ? 0 : rightRole === "play-only" ? 1 : rightRole === "unknown" ? 2 : 3;
      const leftTotal = typeof left.traitProfile?.total === "number" ? left.traitProfile.total : -1;
      const rightTotal = typeof right.traitProfile?.total === "number" ? right.traitProfile.total : -1;
      return (
        leftRoleRank - rightRoleRank ||
        rightTotal - leftTotal ||
        left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" })
      );
    });

  return candidates[0] ?? null;
}

function lookupHumanName(store: DataStore, humanId: string): string {
  return store.humansById.get(humanId)?.displayName ?? humanId ?? "Unknown";
}

function lookupCharacterName(store: DataStore, characterId: string): string {
  return store.charactersById.get(characterId)?.name ?? characterId;
}

function createRangerClassWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  const breeding = getBreedingCollarSuggestions(store.data.reference.collars);
  const birth = getBirthCollarSuggestions(store.data.reference.collars);
  const traits = getTraitCollarReferences(store.data.reference.collars);
  const utility = getUtilityCollarReferences(store.data.reference.collars);

  section.append(createElement("h3", undefined, "Ranger class"), createRangerPaneToggle());

  if (rangerState.activePane === "overview") {
    section.append(
      createRangerOverviewPanel(),
      createRangerRaceTablePanel(),
      createPetRolesGuidancePanel(),
      createBreedingStockGuidancePanel()
    );
  } else if (rangerState.activePane === "abilities") {
    section.append(createRangerAbilitiesPanel(), createRangerObservePanel(), createRangerAbilityNotesPanel());
  } else if (rangerState.activePane === "companions") {
    section.append(
      createRangerCompanionBasicsPanel(),
      createRangerBondingPanel(),
      createRangerCommandsPanel(),
      createWolfStatsGuidancePanel()
    );
  } else if (rangerState.activePane === "breeding") {
    section.append(
      createAdvancingPetsGuidancePanel(),
      createMaxedPetImprovementPanel(),
      createBreedingProgramGuidancePanel(),
      createRangerBreedingMechanicsPanel()
    );
  } else if (rangerState.activePane === "appearance") {
    section.append(createRangerAppearancePanel(), createRangerEyeColorPanel(), createRangerMarkingsPanel(), createRangerMiscPanel());
  } else {
    section.append(
      createGuidanceNotice(),
      createCollarActionPanel("Breeding-time collar", breeding, "Use during the breeding action."),
      createCollarActionPanel("Birth-time collars", birth, "Put on the female before birth and remove after all pups are born."),
      createCollarActionPanel("Utility collars", utility, "General pet-care references outside breeding and birth timing."),
      createTraitCollarReferenceTable(traits)
    );
  }

  return section;
}

function createAppDirectionsWorkflow(): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  section.append(createElement("h3", undefined, "App directions"), createUsingAppGuidancePanel(), createRecommendedWorkflowPanel());
  return section;
}

function createRangerPaneToggle(): HTMLElement {
  const group = createElement("div", "toggle-group");

  for (const [pane, label] of [
    ["overview", "Overview"],
    ["abilities", "Abilities"],
    ["companions", "Companions"],
    ["breeding", "Breeding"],
    ["appearance", "Appearance"],
    ["gear", "Collars & gear"]
  ] as const) {
    const button = createElement(
      "button",
      rangerState.activePane === pane ? "toggle-button toggle-button-active" : "toggle-button",
      label
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(rangerState.activePane === pane));
    button.addEventListener("click", () => {
      rangerState.activePane = pane;
      render();
    });
    group.append(button);
  }

  return group;
}

function createRangerOverviewPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const items: Array<[string, string]> = [
    ["Class Hall", rangerClassOverview.classHall],
    ["Defense Modes", rangerClassOverview.defenseModes],
    ["Level Bonus", rangerClassOverview.levelBonus],
    ["Skilling", rangerClassOverview.skilling],
    ["Symbol", rangerClassOverview.symbol]
  ];
  const list = createElement("dl", "key-value-list");
  for (const [label, value] of items) {
    list.append(createElement("dt", undefined, label), createElement("dd", undefined, value));
  }
  panel.append(
    createElement("h3", undefined, "Class basics"),
    createElement("p", "plan-note", rangerClassOverview.introduction),
    list
  );
  return panel;
}

function createRangerRaceTablePanel(): HTMLElement {
  return createSimpleTablePanel(
    "Race baselines",
    "Race, core stats, and guild options from the ranger class guide.",
    ["Race", "Str", "Dex", "Int", "Con", "Wis", "HP", "SP", "Guild selection"],
    rangerRaceRows
  );
}

function createRangerAbilitiesPanel(): HTMLElement {
  return createSimpleTablePanel(
    "Ranger abilities",
    "Core active commands, their SP costs, and what they are for.",
    ["Ability", "SP", "Description"],
    rangerAbilityRows
  );
}

function createRangerObservePanel(): HTMLElement {
  return createSimpleTablePanel(
    "Observe and glance difficulty scale",
    "These responses scale relative to the Ranger's level compared to the target.",
    ["Relative level", "Response"],
    rangerObserveRows
  );
}

function createRangerAbilityNotesPanel(): HTMLElement {
  return createBulletPanel("Practical ranger notes", "Hard-won operational notes from the guide about crafting, Woodcraft, and corpse processing.", rangerAbilityNotes);
}

function createAdvancingPetsGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Start with any traited pet if possible. Forest tames and NPC pets are much weaker long-term and are mostly useful for late cosmetic or breed adjustments.",
    "Pets must reach Very Large, Stage 2 (VL2) before they count for advancement. Males can breed immediately at VL2; females also need to wait for heat.",
    "Generation investment speeds future raising dramatically. Legacy notes suggest early pets take roughly 40 hours to reach VL2, while mature lines can drop near 4 hours.",
    "Development likely helps growth time a little, but the biggest acceleration comes from working multiple generations forward.",
    "Breeding progress is time-gated by female heat, pregnancy, litter birth, puppy growth, and puppy statting. That is why mature females are the scarce resource in a breeding program.",
    "Certain compares are critical for accurate stat solving. Females reliably gain certain compares after enough puppies; male certainty is less well understood."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "How advancing pets works"),
    createElement(
      "p",
      "plan-note",
      "A new breeder usually needs two mental models at once: advancing a pet line over generations, and knowing when a pet is actually ready to breed."
    ),
    list
  );

  return panel;
}

function createBreedingProgramGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "The game only remembers parent and grandparent lineage strongly enough to matter for the current workflow, so the program goal is often to push starting ancestry beyond that window.",
    "The Multi-Step workflow does this by carrying one gender line forward for several generations, then switching when needed. You are improving the herd, not only producing one good puppy.",
    "Procreation is the lynchpin breeding trait because bigger litters mean more chances to roll an above-average puppy.",
    "Candidate quality is never deterministic. A useful mental model is parent average plus a random spread, slightly favorable to long-term player advancement.",
    "Unique names make family tracking easier, but names are not perfect identity. The canonical data and lineage view matter more than memory."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "How a breeding program progresses"),
    createElement(
      "p",
      "plan-note",
      "Use this panel as the newcomer orientation before diving into Planner, Multi-Step, Herd Health, or Algorithms."
    ),
    list
  );

  return panel;
}

function createMaxedPetImprovementPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "The best answer is usually not 'keep this exact gigantic pet forever.' The better answer is to breed its line upward against the strongest safe mates in the wider herd.",
    "A player's gigantic pet becomes more valuable when it contributes to a broader bloodline instead of circling inside the same close family.",
    "What the herd needs most is genetic diversity. In a small population, repeated sibling or near-sibling breeding quickly creates dead ends.",
    "If you only keep breeding inside one tight family, you may preserve a familiar pet line for a while, but you weaken your future mate options and trap yourself behind relationship penalties.",
    "The strongest long-term move is usually to breed your pet into the known herd, produce an improved puppy, and then keep pushing that bloodline forward with unrelated stock.",
    "So the practical question is less 'how do I raise this gigantic pet's stats directly?' and more 'which safe mate lets this bloodline contribute the best next-generation puppy without shrinking herd diversity?'"
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "How to improve a maxed pet"),
    createElement(
      "p",
      "plan-note",
      "Players often ask how to move one fully raised pet upward. Here, maxed means the pet has reached the maximum size allowed by the Ranger's race. Traits are a separate question from visible size."
    ),
    list
  );

  return panel;
}

function createRangerCompanionBasicsPanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createBulletPanel("Taming and companion basics", "High-level ranger companion rules from the class guide.", rangerTameNotes),
    createSimpleTablePanel("Trained size bands", "After taming, the size description hints at the canine's level.", ["Level", "Description"], rangerSizeRows)
  );
  return section;
}

function createRangerBondingPanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createSimpleTablePanel(
      "Bonding and maximum size by race",
      "Bonded canines requiring 5 or less Wisdom to tame can stay forever and grow over time. Maximum size depends on unmodified Ranger Wisdom.",
      ["Race / Wisdom", "Maximum size", "Level", "Estimated time"],
      rangerBondingRows
    ),
    createBulletPanel(
      "Training unlocks",
      "Bonded canines unlock additional practical abilities as they grow.",
      rangerTrainingNotes
    )
  );
  return section;
}

function createRangerCommandsPanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createSimpleTablePanel(
      "Canine commands",
      "Practical commands for feeding, handling, combat, and behavior.",
      ["Command", "Description"],
      rangerCommandRows
    )
  );
  section.append(createRangerVisibleStatsPanels());
  return section;
}

function createRangerVisibleStatsPanels(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createSimpleTablePanel(
      "Armour descriptions",
      "Observed descriptions are relative to the canine's current size and level, not absolute across all sizes.",
      ["Rank", "Description"],
      rangerVisibleStatTables.armour
    ),
    createSimpleTablePanel("Constitution descriptions", "Feeding improves Constitution over time.", ["Rank", "Description"], rangerVisibleStatTables.constitution),
    createSimpleTablePanel("Dexterity descriptions", "Fighting improves Dexterity over time.", ["Rank", "Description"], rangerVisibleStatTables.dexterity),
    createSimpleTablePanel("Intelligence descriptions", "Efficiency with canine abilities improves Intelligence over time.", ["Rank", "Description"], rangerVisibleStatTables.intelligence),
    createSimpleTablePanel("Strength descriptions", "Carry training improves Strength over time.", ["Rank", "Description"], rangerVisibleStatTables.strength)
  );
  return section;
}

function createRangerBreedingMechanicsPanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createLiveBreedingCyclePanel(),
    createBulletPanel("Breeding mechanics", "Guide-backed timing and breeding rules for ranger canines.", rangerBreedingNotes),
    createSimpleTablePanel("Heat cadence", "Heat timing changes depending on whether the last breeding opportunity was used.", ["Condition", "Effect"], rangerHeatRows),
    createBulletPanel("Compare and bloodline detection", "What compare contributes beyond raw trait estimation.", rangerCompareNotes),
    createLessaShelterPanel(),
    createLitterStattingWorkflowPanel()
  );
  section.append(
    createSimpleTablePanel(
      "Breeding trait set",
      "These are the 17 inherited breeding traits and their practical descriptions. This is core trait reference data, not a collar-history table.",
      ["Trait", "Descriptor"],
      rangerTraitDescriptorRows
    )
  );
  return section;
}

function createLessaShelterPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Lessa has a small shelter in her room. Entering it and using read list shows a public top-ten canine list.",
    "This list appears to update only at reboot or on Lessa's own schedule, so it is a public activity signal, not an exact live truth feed.",
    "The output gives owner, pet name, gender, color, and species, but does not reveal the actual trait numbers.",
    "That makes it useful for spotting which lines are still active and competitive, especially when canonical breeding data is stale.",
    "It should be treated as a source hint for curation and herd awareness, not as canonical proof of stats or exact ranking math."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Lessa shelter top-ten list"),
    createElement(
      "p",
      "plan-note",
      "As of June 7, 2026, this is still a useful public source for identifying current standout canines without exposing their raw numbers."
    ),
    list
  );

  return panel;
}

function createRangerAppearancePanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createAppearanceStrategyPanel(),
    createBulletPanel("Appearance inheritance notes", "The class guide gives practical notes for coat and color transitions after bonding.", rangerAppearanceNotes)
  );
  return section;
}

function createAppearanceStrategyPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "If your breeding program is doing many generations of stat improvement, you will often lose cosmetic traits along the way simply because you are breeding so many times.",
    "The more mathematically sound approach is often to raise the herd's core numbers first, then breed back toward the specific race, colors, or markings you want once the line is already strong.",
    "Birth-influence collars help with that cosmetic cleanup phase, but they do not remove the underlying tradeoff between stat progress and cosmetic control.",
    "Players ultimately choose what matters more: pure numerical advancement, maintaining a beloved cosmetic look, or some compromise between the two.",
    "Some retired or stashed canines may have a race or color combination worth bringing back into the program, but getting those old animals or their owners active again can be the real bottleneck."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Appearance strategy versus stat progress"),
    createElement(
      "p",
      "plan-note",
      "Cosmetic goals and breeding-program math do not always pull in the same direction. This panel is about choosing where to compromise."
    ),
    list
  );

  return panel;
}

function createRangerEyeColorPanel(): HTMLElement {
  return createSimpleTablePanel(
    "Eye color stages",
    "Eye color transitions through stages and can continue changing after coat shedding ends.",
    ["Stage 1", "Stage 2", "Stage 3", "Final eye"],
    rangerEyeRows
  );
}

function createRangerMarkingsPanel(): HTMLElement {
  return createSimpleTablePanel(
    "Secondary markings and features",
    "Canines may receive zero, one, or two secondary markings/features on top of their primary coat.",
    ["Descriptor", "Type"],
    rangerDescriptorRows
  );
}

function createRangerMiscPanel(): HTMLElement {
  const section = createElement("section", "guidance-layout");
  section.append(
    createBulletPanel("Miscellaneous ranger canine notes", "Extra guide material that does not fit neatly into the other groups but is still operationally useful.", rangerMiscNotes)
  );
  return section;
}

function createUsingAppGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Calculator: solve a canine's 17 trait values from certain compare text against a known canine.",
    "Planner: answer the immediate question, 'who can this canine breed with right now?'",
    "Multi-Step: build a multi-generation lift plan that pushes ancestry beyond the remembered relationship window.",
    "Data: search the canonical records for canines, ownership, traits, lineage, and appearance.",
    "Herd Health: inspect the breeding cadre for bloodline pressure, coverage, constrained mate options, and records curation.",
    "Algorithms: rank safe mates using compensatory, positive assortative, or OCS-style logic."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "What each tab does"),
    createElement(
      "p",
      "plan-note",
      "This pane is for the player who opens the site and immediately wonders which tab answers which breeding question."
    ),
    list
  );

  return panel;
}

function createRecommendedWorkflowPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ol", "compact-list");

  for (const line of [
    "Use Data to confirm the canine, owner, and current lineage you are working with.",
    "Use Calculator when you have compare text and need to solve real trait values.",
    "Use Planner for immediate safe mates, then Algorithms for ranked recommendations with a specific goal.",
    "Use Multi-Step when the goal is a breeding program lift rather than one litter.",
    "Use Herd Health when you need to understand what repeated lines or tight mate options are doing to the whole pool."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Suggested workflow"),
    createElement(
      "p",
      "plan-note",
      "Most players do not need every tab every day. This is the shortest path through the app for common breeding work."
    ),
    list,
    createLitterSessionWorkflowPanel()
  );

  return panel;
}

function createLiveBreedingCyclePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ol", "compact-list");

  for (const line of [
    "Bring sire and dam into the same room while the female is in heat.",
    "Use encourage to stimulate a breeding attempt. In practice this works best on the female, and it does nothing useful if a mating attempt is already underway.",
    "Once the breeding takes, wait roughly 45 minutes for the litter to be born.",
    "After birth, the puppies become real time-sensitive objects: they must be fed or they can die, and neglected puppies also reduce the dam's loyalty.",
    "If a puppy is not being kept, clean it up deliberately. Lessa, a young half-elf on the Infidian continent, can tame unwanted puppies away and removes a lot of old manual cleanup pain.",
    "Ignored puppies eventually bounce off and disappear on their own, but that takes time and is usually worse than handling the litter promptly."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Live breeding cycle"),
    createElement(
      "p",
      "plan-note",
      "This is the actual in-game sequence around one litter, separate from the longer-range herd planning work."
    ),
    list
  );

  return panel;
}

function createLitterStattingWorkflowPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ol", "compact-list");

  for (const line of [
    "Move the litter to a quiet room with little traffic so compare text and puppy handling stay clean.",
    "Cycle through known-value pets, often by swapping through alt characters, and gather compare text against the puppies one by one.",
    "Paste each compare block into Calculator and let the app solve the real trait row instead of reasoning from compare phrases by hand.",
    "Record solved rows in the litter slots, then triage. Some puppies are obviously weak and do not always need full solving if the litter already shows stronger candidates.",
    "Pick the carry-forward puppy based on the session goal: raw improvement, Procreation, cosmetic recovery, or herd-health concerns.",
    "After the keeper is chosen, use Lessa or another cleanup method to remove extra puppies so the female can return to the next cycle cleanly."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Litter statting and triage workflow"),
    createElement(
      "p",
      "plan-note",
      "This is where the tool should do the most heavy lifting: solve compare text quickly, reduce bookkeeping, and make the keeper decision easier."
    ),
    list
  );

  return panel;
}

function createLitterSessionWorkflowPanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ol", "compact-list");

  for (const line of [
    "Before the breeding, use Planner or Algorithms to choose the mating pair and note any collar setup that matters.",
    "When the litter is born, use Calculator with known canines to solve compare text as quickly as possible.",
    "Use Multi-Step if the selected keeper puppy will become the next carry-forward parent in a longer lift plan.",
    "Use Herd Health or Algorithms again if the real litter results change what the herd now needs.",
    "Use Data and Curate later to fold confirmed keepers and stale records back into the canonical pool."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Suggested workflow for a live litter session"),
    createElement(
      "p",
      "plan-note",
      "The site is most valuable when it shortens the time between puppies being born and the keeper decision being made."
    ),
    list
  );

  return panel;
}

function createPetRolesGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Disposable pets are short-term utility animals. They may be fine for basic class use, for experimenting, or for late cosmetic changes, but they are not where a serious breeding program stores value.",
    "Bonded pets are long-term working animals. They are the ones worth real growth time, careful feeding, stat checking, and breeding decisions.",
    "Wild tames take real bonding time. Ranger guide notes suggest bonding can take roughly 20 minutes by idling, or closer to 5 minutes if you are actively killing with it.",
    "Bred puppies bond instantly, so this time cost applies to wild tames, not to puppies coming out of a breeding line.",
    "Keep bonded pets fed and happy. If a bonded wolf ferals, it is gone for good.",
    "Deaths are expensive. If a bonded wolf dies after it reaches the larger trained sizes, it can come back smaller and cost meaningful growth time to recover."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Pet roles: disposable versus bonded"),
    createElement(
      "p",
      "plan-note",
      "The first big ranger-pet distinction is not breeding quality. It is whether a pet is disposable or whether it is a bonded long-term asset."
    ),
    list
  );

  return panel;
}

function createBreedingStockGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Wild-tamed stock starts from whatever the game gives you in the wild. It can be useful for getting started, for changing breed, or for chasing a cosmetic goal, but it begins with much weaker breeding potential.",
    "Bred-line stock means a puppy that has already been improved through prior generations of trait breeding. This is the livestock-style breeding-program version of a pet line.",
    "A useful mental split is wild stock versus bred-line stock, similar to the difference between a wild-caught animal and a deliberately improved working line.",
    "Forest-tamed pets and NPC pets are usually weak breeding foundations. Legacy notes strongly recommend starting with any traited pet over a forest tame when you can.",
    "Once a player is serious about advancement, the goal is usually to move from wild stock into bred-line stock and then keep lifting that line forward."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Breeding stock: wild-tamed versus bred-line"),
    createElement(
      "p",
      "plan-note",
      "Inside bonded pets, there is another important split: some animals are just bonded companions, while others are part of a deliberately improved breeding line."
    ),
    list
  );

  return panel;
}

function createWolfStatsGuidancePanel(): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");

  for (const line of [
    "Use observe to get a practical read on a wolf's current stats. The ranger guide calls out strength, dexterity, and constitution as the main confirmed stats.",
    "The guide suggests early neglect is expensive later: if you let a wolf fall behind on its stat growth, catching up can take longer.",
    "Dodge is called out as one of the most important wolf skills for real use.",
    "Carry training improves with time spent carrying something, and rescue becomes available later at larger sizes.",
    "For practical combat, the ranger guide emphasizes dexterity, constitution, dodge, and rescue over trivia skills like guard."
  ]) {
    list.append(createElement("li", undefined, line));
  }

  panel.append(
    createElement("h3", undefined, "Checking and training a wolf"),
    createElement(
      "p",
      "plan-note",
      "A new ranger may not realize that raising a good wolf is not only about waiting for size increases. You also need to check its stats with observe and build the useful skills."
    ),
    list
  );

  return panel;
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
      "Human/player, character, canine call name, gender, current availability status, and breeding role.",
      "Full 17-trait block when available; total and Procreation can be derived from complete trait rows.",
      "Lineage: sire, dam, and grandparents where known.",
      "Appearance: primary color, secondary color, and eye color.",
      "Source or observed date, especially when data came from delayed player tools."
    ]),
    createContributorPanel("Status matters", [
      "Status answers whether a canine is current, historical, or uncertain.",
      "Breeding role answers whether a current pet is actually part of the breeding cadre.",
      "Play-only pets may be current and valuable without belonging in default breeding suggestions."
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

type BreedingRoleReviewEntry = {
  canineId: string;
  displayName: string;
  characterName: string;
  humanName: string;
  genderLabel: string;
  status: string;
  currentBreedingRole: CuratedBreedingRole;
  canineType: string | null;
};

type CanineBreedingRolePatchUpdate = {
  canineId: string;
  breedingRole: CuratedBreedingRole;
};

type CanineTypeReviewEntry = {
  canineId: string;
  displayName: string;
  characterName: string;
  humanName: string;
  genderLabel: string;
  status: string;
  currentCanineType: string | null;
  breedingRole: BreedingRole;
};

type CanineTypePatchUpdate = {
  canineId: string;
  canineType: string | null;
};

type GenderReviewEntry = {
  canineId: string;
  displayName: string;
  characterName: string;
  humanName: string;
  status: string;
  breedingRole: BreedingRole;
  currentGender: CuratedGender;
};

type CanineGenderPatchUpdate = {
  canineId: string;
  gender: CuratedGender;
};

type AppearanceReviewEntry = {
  canineId: string;
  displayName: string;
  characterName: string;
  humanName: string;
  status: string;
  breedingRole: BreedingRole;
  currentAppearance: CanineAppearance | null;
};

type CanineAppearancePatchUpdate = {
  canineId: string;
  appearance: CanineAppearance | null;
};

function createCurationWorkflow(store: DataStore): HTMLElement {
  const section = createElement("section", "workflow-section guidance-layout");
  section.append(createElement("h3", undefined, "Records curation"), createCurationModeToggle());
  section.append(createCurationFilterControls(store));
  if (curationState.mode !== "status" && curationState.mode !== "ownership") {
    section.append(createCurationInactiveToggle());
  }

  if (curationState.mode === "status") {
    const conflicts = getActiveCanineConflicts(store);
    section.append(
      createCurationNotice(conflicts.length),
      createActiveCanineConflictTable(conflicts),
      createPendingStatusPatchPanel(store)
    );
  } else if (curationState.mode === "ownership") {
    const entries = getOwnershipReviewEntries(store);
    section.append(
      createOwnershipReviewNotice(entries.length),
      createOwnershipReviewTable(store, entries),
      createPendingHumanPatchPanel(store)
    );
  } else if (curationState.mode === "breeding-role") {
    const entries = getBreedingRoleReviewEntries(store);
    section.append(
      createBreedingRoleReviewNotice(entries.length),
      createBreedingRoleReviewTable(entries),
      createPendingBreedingRolePatchPanel(store)
    );
  } else if (curationState.mode === "canine-type") {
    const entries = getCanineTypeReviewEntries(store);
    section.append(
      createCanineTypeReviewNotice(entries.length),
      createCanineTypeReviewTable(entries),
      createPendingCanineTypePatchPanel(store)
    );
  } else if (curationState.mode === "gender") {
    const entries = getGenderReviewEntries(store);
    section.append(
      createGenderReviewNotice(entries.length),
      createGenderReviewTable(entries),
      createPendingGenderPatchPanel(store)
    );
  } else {
    const entries = getAppearanceReviewEntries(store);
    section.append(
      createAppearanceReviewNotice(entries.length),
      createAppearanceReviewTable(entries),
      createPendingAppearancePatchPanel(store)
    );
  }

  section.append(createCurationSelectedCanineDetail(store));

  return section;
}

function createCurationFilterControls(store: DataStore): HTMLElement {
  const controls = createElement("div", "calculator-form");
  const summaries = getCurationFilteredSourceSummaries(store);
  const characterOptions = buildCurationOptions(
    summaries.map((summary) => ({
      value: summary.character?.id ?? "unknown",
      label: summary.character?.name ?? "unknown"
    }))
  );
  const humanOptions = buildCurationOptions(
    summaries.map((summary) => ({
      value: summary.human?.id ?? "unknown",
      label: summary.human?.displayName ?? "unknown"
    }))
  );
  const statusOptions = buildCurationOptions(
    summaries.map((summary) => ({ value: summary.canine.status, label: summary.canine.status }))
  );
  const roleOptions = buildCurationOptions(
    summaries.map((summary) => ({
      value: normalizeCuratedBreedingRole(summary.canine.breedingRole),
      label: formatBreedingRole(normalizeCuratedBreedingRole(summary.canine.breedingRole))
    }))
  );
  const typeOptions = buildCurationOptions(
    summaries.map((summary) => ({
      value: formatCanineTypeLabel(summary.canine.canineType),
      label: formatCanineTypeLabel(summary.canine.canineType)
    }))
  );
  const genderOptions = buildCurationOptions(
    summaries.map((summary) => ({
      value: normalizeCuratedGender(summary.canine.gender),
      label: formatGenderLabel(normalizeCuratedGender(summary.canine.gender))
    }))
  );

  controls.append(
    createLabel("Search", createCurationTextInput()),
    createLabel("Character", createCurationSelect("characterId", characterOptions)),
    createLabel("Human", createCurationSelect("humanId", humanOptions)),
    createLabel("Status", createCurationSelect("status", statusOptions)),
    createLabel("Activity type", createCurationSelect("breedingRole", roleOptions)),
    createLabel("Race / type", createCurationSelect("canineType", typeOptions)),
    createLabel("Gender", createCurationSelect("gender", genderOptions)),
    createCurationFilterActions()
  );

  return controls;
}

function createCurationTextInput(): HTMLInputElement {
  const input = createElement("input", "field-control") as HTMLInputElement;
  input.value = curationState.filters.query;
  input.placeholder = "name, human, id...";
  input.addEventListener("input", () => {
    curationState.filters.query = input.value;
    render();
  });
  return input;
}

function createCurationSelect(
  field: keyof typeof curationState.filters,
  options: readonly { value: string; label: string }[]
): HTMLSelectElement {
  const select = createElement("select", "field-control") as HTMLSelectElement;
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

  select.value = String(curationState.filters[field]);
  select.addEventListener("change", () => {
    (curationState.filters as Record<string, string>)[field] = select.value;
    render();
  });

  return select;
}

function createCurationFilterActions(): HTMLElement {
  const actions = createElement("div", "button-row");
  const resetButton = createElement("button", "secondary-button", "Reset filters") as HTMLButtonElement;
  resetButton.type = "button";
  resetButton.addEventListener("click", () => {
    curationState.filters = {
      query: "",
      gender: "all",
      status: "all",
      breedingRole: "all",
      canineType: "all",
      humanId: "all",
      characterId: "all"
    };
    curationState.selectedCanineId = "";
    render();
  });
  actions.append(resetButton);
  return actions;
}

function buildCurationOptions(options: readonly { value: string; label: string }[]): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  return options
    .filter((option) => {
      if (!option.value || seen.has(option.value)) {
        return false;
      }
      seen.add(option.value);
      return true;
    })
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

function isInteractiveCurationTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, select, input, textarea, label, option"));
}

function createCurationInactiveToggle(): HTMLElement {
  const button = createToggleButton(
    curationState.hideInactive ? "Show inactive" : "Hide inactive",
    curationState.hideInactive,
    () => {
      curationState.hideInactive = !curationState.hideInactive;
      render();
    }
  );

  const wrap = createElement("div", "button-row");
  wrap.append(button);
  return wrap;
}

function createBulletPanel(title: string, note: string, lines: readonly string[]): HTMLElement {
  const panel = createElement("section", "plan-panel");
  const list = createElement("ul", "compact-list");
  for (const line of lines) {
    list.append(createElement("li", undefined, line));
  }
  panel.append(createElement("h3", undefined, title), createElement("p", "plan-note", note), list);
  return panel;
}

function createSimpleTablePanel(
  title: string,
  note: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): HTMLElement {
  const panel = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table herd-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const header of headers) {
    headRow.append(createElement("th", undefined, header));
  }
  head.append(headRow);

  for (const rowValues of rows) {
    const row = document.createElement("tr");
    for (const value of rowValues) {
      row.append(createElement("td", undefined, value));
    }
    body.append(row);
  }

  table.append(head, body);
  tablePane.append(table);
  panel.append(createElement("h3", undefined, title), createElement("p", "plan-note", note), tablePane);
  return panel;
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
    ["ocs", "General breeding (OCS)"],
    ["compensatory", "Fix weak traits (Compensatory)"],
    ["assortative", "Stack strong traits (Assortative)"]
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
    ["Algorithm", "Fix weak traits", "Prefers mates that are strongest where the target canine is weakest."],
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
      "Use this when a player has a clear weakness to repair. The ranking looks for safe mates whose strongest traits land where the selected canine is weakest."
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
      createElement("h3", undefined, "General breeding (OCS)"),
      createElement("p", undefined, "Choose an active male or female canine with known stats to rank safe mates.")
    );
    return section;
  }

  const summaryCards = createElement("div", "result-cards");
  for (const [label, value, tooltip] of [
    ["Target", analysis.selectedLabel, "The active canine being matched against herd-preserving mate choices."],
    ["Safe candidates", String(analysis.candidates.length), "Opposite-gender active mates that remain after relatedness and same-human filters."],
    ["Algorithm", "General breeding", "Balances estimated puppy quality against herd concentration and future flexibility penalties."],
    ["Goal", "Herd balance", "This is the default recommendation mode for general breeding because it improves pets without pouring too much progress into already dominant lines."]
  ] as const) {
    const card = createElement("div", "result-card");
    card.title = tooltip;
    card.append(createElement("span", "status-label", label), createElement("strong", undefined, value));
    summaryCards.append(card);
  }

  section.append(
    createElement("h3", undefined, "General breeding (OCS)"),
    createElement(
      "p",
      "plan-note",
      "This is the default general-breeding ranking. It treats OCS as quality minus diversity penalties: better puppies still matter, but repeated bloodlines and constrained lines are pushed downward."
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
      createElement("h3", undefined, "Stack strong traits"),
      createElement("p", undefined, "Choose an active male or female canine with known stats to rank safe mates.")
    );
    return section;
  }

  const summaryCards = createElement("div", "result-cards");
  for (const [label, value, tooltip] of [
    ["Target", analysis.selectedLabel, "The active canine whose strongest traits we are trying to intensify."],
    ["Strong traits shown", String(analysis.targetStrengthTraits.length), "Highest recorded traits used to explain the assortative ranking."],
    ["Safe candidates", String(analysis.candidates.length), "Opposite-gender active mates that remain after relatedness and same-human filters."],
    ["Algorithm", "Stack strong traits", "Prefers mates that are already strongest in the same areas as the target canine."],
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
    createElement("h3", undefined, "Stack strong traits"),
    createElement(
      "p",
      "plan-note",
      "Use this when a player wants to intensify a line's best traits. It can push a line upward quickly, but it may narrow future diversity."
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
    ["ownership", "Ownership review"],
    ["breeding-role", "Activity type"],
    ["canine-type", "Race / type"],
    ["gender", "Gender"],
    ["appearance", "Cosmetics"]
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
  const tablePane = createElement("div", "data-browser-table-section");
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
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Multiple active canines by character"), tablePane);

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
    item.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = summary.canine.id;
      render();
    });
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
  const tablePane = createElement("div", "data-browser-table-section");
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
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Unknown and unattributed ownership"), tablePane);

  return section;
}

function createOwnershipCanineListCell(canines: readonly CanineSummary[]): HTMLTableCellElement {
  const cell = createElement("td");
  const list = createElement("ul", "compact-list");

  for (const summary of canines) {
    const item = createElement(
      "li",
      undefined,
      `${summary.canine.displayName} | ${formatGenderLabel(summary.canine.gender)} | ${summary.canine.status}`
    );
    item.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = summary.canine.id;
      render();
    });
    list.append(item);
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

function createBreedingRoleReviewNotice(entryCount: number): HTMLElement {
  const notice = createElement("section", entryCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${entryCount} current-ish canine${entryCount === 1 ? "" : "s"} need activity-type review`),
    createElement(
      "p",
      undefined,
      "Use this mode to separate active breeding stock from pets people actually play, park, or have not classified yet. This stages a patch only."
    )
  );

  return notice;
}

function createBreedingRoleReviewTable(entries: readonly BreedingRoleReviewEntry[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Canine", "Owner", "Gender", "Status", "Current type", "Race / type", "Set activity type"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No active or unknown-status canines need activity-type review.");
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.className = entry.canineId === curationState.selectedCanineId ? "selected-row" : "";
    row.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = entry.canineId;
      render();
    });
    row.append(
      createElement("td", undefined, entry.displayName),
      createElement("td", undefined, `${entry.characterName} / ${entry.humanName}`),
      createElement("td", undefined, entry.genderLabel),
      createElement("td", undefined, entry.status),
      createElement("td", undefined, formatBreedingRole(entry.currentBreedingRole)),
      createElement("td", undefined, formatCanineTypeLabel(entry.canineType)),
      createBreedingRoleAssignmentCell(entry)
    );
    body.append(row);
  }

  table.append(head, body);
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Current pet versus breeding pet"), tablePane);

  return section;
}

function createBreedingRoleAssignmentCell(entry: BreedingRoleReviewEntry): HTMLTableCellElement {
  const cell = createElement("td");
  const wrap = createElement("div", "ownership-cell");
  const select = createElement("select", "field-control");
  const pendingRole = getEffectiveBreedingRole(entry.canineId, entry.currentBreedingRole);

  for (const option of getBreedingRoleOptions()) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = pendingRole;
  select.addEventListener("change", () => {
    stageCanineBreedingRole(entry.canineId, select.value as CuratedBreedingRole);
    render();
  });

  wrap.append(select);

  if (curationState.breedingRoleUpdatesByCanineId[entry.canineId] !== undefined) {
    wrap.append(
      createElement(
        "span",
        "pending-status",
        `Pending: ${formatBreedingRole(curationState.breedingRoleUpdatesByCanineId[entry.canineId])}`
      )
    );
  }

  cell.append(wrap);
  return cell;
}

function createPendingBreedingRolePatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingBreedingRoleUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset activity-type changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = {
    schemaVersion: 1,
    kind: "canine-breeding-role-patch",
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
    const cell = createElement("td", undefined, "No pending activity-type changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const canine = store.caninesById.get(update.canineId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, canine?.displayName ?? update.canineId),
      createElement("td", undefined, formatBreedingRole(canine?.breedingRole ?? "unknown")),
      createElement("td", undefined, formatBreedingRole(update.breedingRole))
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.breedingRoleUpdatesByCanineId = {};
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
    createElement("h3", undefined, "Pending activity-type patch"),
    createElement(
      "p",
      "plan-note",
      "This prepares a canine activity-type patch for repo review. It does not edit canonical data directly."
    ),
    table,
    createElement("p", "plan-note", `${updates.length} changed canine activity type${updates.length === 1 ? "" : "s"}.`),
    output,
    createButtonRow([copyButton, resetButton])
  );

  return panel;
}

function createCanineTypeReviewNotice(entryCount: number): HTMLElement {
  const notice = createElement("section", entryCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${entryCount} current-ish canine${entryCount === 1 ? "" : "s"} need race/type review`),
    createElement(
      "p",
      undefined,
      "Use this mode to fill the canine type or race for the records that still matter operationally. This also stages a patch only."
    )
  );

  return notice;
}

function createCanineTypeReviewTable(entries: readonly CanineTypeReviewEntry[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Canine", "Owner", "Gender", "Status", "Activity type", "Current race / type", "Set race / type"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No active or unknown-status canines need race/type review.");
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.className = entry.canineId === curationState.selectedCanineId ? "selected-row" : "";
    row.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = entry.canineId;
      render();
    });
    row.append(
      createElement("td", undefined, entry.displayName),
      createElement("td", undefined, `${entry.characterName} / ${entry.humanName}`),
      createElement("td", undefined, entry.genderLabel),
      createElement("td", undefined, entry.status),
      createElement("td", undefined, formatBreedingRole(entry.breedingRole)),
      createElement("td", undefined, formatCanineTypeLabel(entry.currentCanineType)),
      createCanineTypeAssignmentCell(entry)
    );
    body.append(row);
  }

  table.append(head, body);
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Canine race and type"), tablePane);

  return section;
}

function createCanineTypeAssignmentCell(entry: CanineTypeReviewEntry): HTMLTableCellElement {
  const cell = createElement("td");
  const wrap = createElement("div", "ownership-cell");
  const select = createElement("select", "field-control");
  const pendingType = getEffectiveCanineType(entry.canineId, entry.currentCanineType);

  for (const option of getCanineTypeOptions()) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }

  select.value = pendingType ?? "__NULL__";
  select.addEventListener("change", () => {
    stageCanineType(entry.canineId, select.value === "__NULL__" ? null : select.value);
    render();
  });

  wrap.append(select);

  if (Object.prototype.hasOwnProperty.call(curationState.canineTypeUpdatesByCanineId, entry.canineId)) {
    wrap.append(
      createElement(
        "span",
        "pending-status",
        `Pending: ${formatCanineTypeLabel(curationState.canineTypeUpdatesByCanineId[entry.canineId])}`
      )
    );
  }

  cell.append(wrap);
  return cell;
}

function createPendingCanineTypePatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingCanineTypeUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset race/type changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = {
    schemaVersion: 1,
    kind: "canine-type-patch",
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
    const cell = createElement("td", undefined, "No pending race/type changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const canine = store.caninesById.get(update.canineId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, canine?.displayName ?? update.canineId),
      createElement("td", undefined, formatCanineTypeLabel(canine?.canineType ?? null)),
      createElement("td", undefined, formatCanineTypeLabel(update.canineType))
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.canineTypeUpdatesByCanineId = {};
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
    createElement("h3", undefined, "Pending race/type patch"),
    createElement(
      "p",
      "plan-note",
      "This prepares a canine race/type patch for repo review. It does not edit canonical data directly."
    ),
    table,
    createElement("p", "plan-note", `${updates.length} changed canine race/type value${updates.length === 1 ? "" : "s"}.`),
    output,
    createButtonRow([copyButton, resetButton])
  );

  return panel;
}

function createGenderReviewNotice(entryCount: number): HTMLElement {
  const notice = createElement("section", entryCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${entryCount} current-ish canine${entryCount === 1 ? "" : "s"} need gender review`),
    createElement("p", undefined, "Use this mode to correct canine gender on records that still matter operationally. This stages a patch only.")
  );
  return notice;
}

function createGenderReviewTable(entries: readonly GenderReviewEntry[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Canine", "Owner", "Status", "Activity type", "Current gender", "Set gender"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No active or unknown-status canines need gender review.");
    cell.colSpan = 6;
    row.append(cell);
    body.append(row);
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.className = entry.canineId === curationState.selectedCanineId ? "selected-row" : "";
    row.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = entry.canineId;
      render();
    });
    row.append(
      createElement("td", undefined, entry.displayName),
      createElement("td", undefined, `${entry.characterName} / ${entry.humanName}`),
      createElement("td", undefined, entry.status),
      createElement("td", undefined, formatBreedingRole(entry.breedingRole)),
      createElement("td", undefined, formatGenderLabel(entry.currentGender)),
      createGenderAssignmentCell(entry)
    );
    body.append(row);
  }

  table.append(head, body);
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Canine gender"), tablePane);
  return section;
}

function createGenderAssignmentCell(entry: GenderReviewEntry): HTMLTableCellElement {
  const cell = createElement("td");
  const wrap = createElement("div", "ownership-cell");
  const select = createElement("select", "field-control");
  const pendingGender = getEffectiveGender(entry.canineId, entry.currentGender);

  for (const [value, label] of [
    ["M", "Male"],
    ["F", "Female"],
    ["U", "Unknown"],
    ["A", "Any/neutral"]
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  select.value = pendingGender;
  select.addEventListener("change", () => {
    stageCanineGender(entry.canineId, select.value as CuratedGender);
    render();
  });

  wrap.append(select);
  if (curationState.genderUpdatesByCanineId[entry.canineId] !== undefined) {
    wrap.append(createElement("span", "pending-status", `Pending: ${formatGenderLabel(curationState.genderUpdatesByCanineId[entry.canineId])}`));
  }
  cell.append(wrap);
  return cell;
}

function createPendingGenderPatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingGenderUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset gender changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = { schemaVersion: 1, kind: "canine-gender-patch", updates };

  output.readOnly = true;
  output.value = JSON.stringify(patch, null, 2);
  for (const label of ["Canine", "From", "To"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (updates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No pending gender changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const canine = store.caninesById.get(update.canineId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, canine?.displayName ?? update.canineId),
      createElement("td", undefined, formatGenderLabel((canine?.gender as CuratedGender | undefined) ?? "U")),
      createElement("td", undefined, formatGenderLabel(update.gender))
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.genderUpdatesByCanineId = {};
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
    createElement("h3", undefined, "Pending gender patch"),
    createElement("p", "plan-note", "This prepares a canine gender patch for repo review. It does not edit canonical data directly."),
    table,
    createElement("p", "plan-note", `${updates.length} changed canine gender value${updates.length === 1 ? "" : "s"}.`),
    output,
    createButtonRow([copyButton, resetButton])
  );
  return panel;
}

function createAppearanceReviewNotice(entryCount: number): HTMLElement {
  const notice = createElement("section", entryCount > 0 ? "warning-box" : "data-health data-health-ok");
  notice.append(
    createElement("h3", undefined, `${entryCount} current-ish canine${entryCount === 1 ? "" : "s"} need cosmetic review`),
    createElement("p", undefined, "Use this mode to correct primary color, secondary color, and eye color. This stages a patch only.")
  );
  return notice;
}

function createAppearanceReviewTable(entries: readonly AppearanceReviewEntry[]): HTMLElement {
  const section = createElement("section", "data-table-section compact-table-section");
  const tablePane = createElement("div", "data-browser-table-section");
  const table = createElement("table", "data-table curation-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");

  for (const label of ["Canine", "Owner", "Status", "Activity type", "Current cosmetics", "Edit cosmetics"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No active or unknown-status canines need cosmetic review.");
    cell.colSpan = 6;
    row.append(cell);
    body.append(row);
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.className = entry.canineId === curationState.selectedCanineId ? "selected-row" : "";
    row.addEventListener("click", (event) => {
      if (isInteractiveCurationTarget(event.target)) {
        return;
      }
      curationState.selectedCanineId = entry.canineId;
      render();
    });
    row.append(
      createElement("td", undefined, entry.displayName),
      createElement("td", undefined, `${entry.characterName} / ${entry.humanName}`),
      createElement("td", undefined, entry.status),
      createElement("td", undefined, formatBreedingRole(entry.breedingRole)),
      createElement("td", undefined, formatAppearanceSummary(entry.currentAppearance)),
      createAppearanceAssignmentCell(entry)
    );
    body.append(row);
  }

  table.append(head, body);
  tablePane.append(table);
  section.append(createElement("h3", undefined, "Canine cosmetics"), tablePane);
  return section;
}

function createAppearanceAssignmentCell(entry: AppearanceReviewEntry): HTMLTableCellElement {
  const cell = createElement("td");
  const wrap = createElement("div", "ownership-cell");
  const current = getEffectiveAppearance(entry.canineId, entry.currentAppearance);
  const primaryInput = createElement("input", "field-control") as HTMLInputElement;
  const secondaryInput = createElement("input", "field-control") as HTMLInputElement;
  const eyeInput = createElement("input", "field-control") as HTMLInputElement;
  const button = createElement("button", "secondary-button", "Stage cosmetics") as HTMLButtonElement;

  primaryInput.placeholder = "Primary";
  secondaryInput.placeholder = "Secondary";
  eyeInput.placeholder = "Eyes";
  primaryInput.value = current?.primaryColor ?? "";
  secondaryInput.value = current?.secondaryColor ?? "";
  eyeInput.value = current?.eyeColor ?? "";
  button.type = "button";
  button.addEventListener("click", () => {
    stageCanineAppearance(entry.canineId, {
      primaryColor: primaryInput.value.trim() || null,
      secondaryColor: secondaryInput.value.trim() || null,
      eyeColor: eyeInput.value.trim() || null
    });
    render();
  });

  wrap.append(primaryInput, secondaryInput, eyeInput, button);
  if (Object.prototype.hasOwnProperty.call(curationState.appearanceUpdatesByCanineId, entry.canineId)) {
    wrap.append(createElement("span", "pending-status", `Pending: ${formatAppearanceSummary(curationState.appearanceUpdatesByCanineId[entry.canineId])}`));
  }
  cell.append(wrap);
  return cell;
}

function createPendingAppearancePatchPanel(store: DataStore): HTMLElement {
  const panel = createElement("section", "plan-panel curation-patch-panel");
  const updates = getPendingAppearanceUpdates(store);
  const output = createElement("textarea", "field-control plan-json-output");
  const resetButton = createElement("button", "secondary-button", "Reset cosmetic changes");
  const copyButton = createElement("button", "primary-button", curationState.copiedPatch ? "Copied" : "Copy patch JSON");
  const table = createElement("table", "data-table pending-change-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const body = document.createElement("tbody");
  const patch = { schemaVersion: 1, kind: "canine-appearance-patch", updates };

  output.readOnly = true;
  output.value = JSON.stringify(patch, null, 2);
  for (const label of ["Canine", "From", "To"]) {
    headRow.append(createElement("th", undefined, label));
  }
  head.append(headRow);

  if (updates.length === 0) {
    const row = document.createElement("tr");
    const cell = createElement("td", undefined, "No pending cosmetic changes.");
    cell.colSpan = 3;
    row.append(cell);
    body.append(row);
  }

  for (const update of updates) {
    const canine = store.caninesById.get(update.canineId);
    const row = document.createElement("tr");
    row.append(
      createElement("td", undefined, canine?.displayName ?? update.canineId),
      createElement("td", undefined, formatAppearanceSummary(canine?.appearance ?? null)),
      createElement("td", undefined, formatAppearanceSummary(update.appearance))
    );
    body.append(row);
  }

  resetButton.type = "button";
  resetButton.disabled = updates.length === 0;
  resetButton.addEventListener("click", () => {
    curationState.appearanceUpdatesByCanineId = {};
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
    createElement("h3", undefined, "Pending cosmetic patch"),
    createElement("p", "plan-note", "This prepares a canine appearance patch for repo review. It does not edit canonical data directly."),
    table,
    createElement("p", "plan-note", `${updates.length} changed canine cosmetic value${updates.length === 1 ? "" : "s"}.`),
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
    .map(([, summaries]) => {
      const filtered = summaries
        .filter(matchesCurationFilters)
        .sort((left, right) => left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" }));
      return {
        characterName: summaries[0]?.character?.name ?? "unknown",
        humanName: summaries[0]?.human?.displayName ?? "unknown",
        activeCanines: filtered
      };
    })
    .filter((entry) => entry.activeCanines.length > 0)
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
        .filter(matchesCurationFilters)
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

function getBreedingRoleReviewEntries(store: DataStore): BreedingRoleReviewEntry[] {
  return getCurrentishCanineSummaries(store)
    .map((summary) => ({
      canineId: summary.canine.id,
      displayName: summary.canine.displayName,
      characterName: summary.character?.name ?? "unknown",
      humanName: summary.human?.displayName ?? "unknown",
      genderLabel: formatGenderLabel(summary.canine.gender),
      status: summary.canine.status,
      currentBreedingRole: normalizeCuratedBreedingRole(summary.canine.breedingRole),
      canineType: summary.canine.canineType
    }))
    .sort((left, right) => {
      const leftNeedsReview = left.currentBreedingRole === "unknown" ? 0 : 1;
      const rightNeedsReview = right.currentBreedingRole === "unknown" ? 0 : 1;
      return (
        leftNeedsReview - rightNeedsReview ||
        left.characterName.localeCompare(right.characterName, undefined, { sensitivity: "base" }) ||
        left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" })
      );
    });
}

function getBreedingRoleOptions(): Array<{ value: CuratedBreedingRole; label: string }> {
  return [
    { value: "breeding", label: "Breeding" },
    { value: "play-only", label: "Play only" },
    { value: "retired", label: "Retired" },
    { value: "unknown", label: "Unknown" }
  ];
}

function getEffectiveBreedingRole(canineId: string, originalRole: CuratedBreedingRole): CuratedBreedingRole {
  return curationState.breedingRoleUpdatesByCanineId[canineId] ?? originalRole;
}

function stageCanineBreedingRole(canineId: string, breedingRole: CuratedBreedingRole): void {
  const canine = dataStore.caninesById.get(canineId);

  if (!canine) {
    return;
  }

  curationState.copiedPatch = false;

  if (normalizeCuratedBreedingRole(canine.breedingRole) === breedingRole) {
    delete curationState.breedingRoleUpdatesByCanineId[canineId];
    return;
  }

  curationState.breedingRoleUpdatesByCanineId[canineId] = breedingRole;
}

function getPendingBreedingRoleUpdates(store: DataStore): CanineBreedingRolePatchUpdate[] {
  return Object.entries(curationState.breedingRoleUpdatesByCanineId)
    .filter(([canineId, breedingRole]) => normalizeCuratedBreedingRole(store.caninesById.get(canineId)?.breedingRole) !== breedingRole)
    .map(([canineId, breedingRole]) => ({ canineId, breedingRole }))
    .sort((left, right) => {
      const leftName = store.caninesById.get(left.canineId)?.displayName ?? left.canineId;
      const rightName = store.caninesById.get(right.canineId)?.displayName ?? right.canineId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function getCanineTypeReviewEntries(store: DataStore): CanineTypeReviewEntry[] {
  return getCurrentishCanineSummaries(store)
    .map((summary) => ({
      canineId: summary.canine.id,
      displayName: summary.canine.displayName,
      characterName: summary.character?.name ?? "unknown",
      humanName: summary.human?.displayName ?? "unknown",
      genderLabel: formatGenderLabel(summary.canine.gender),
      status: summary.canine.status,
      currentCanineType: summary.canine.canineType,
      breedingRole: normalizeCuratedBreedingRole(summary.canine.breedingRole)
    }))
    .sort((left, right) => {
      const leftNeedsReview = left.currentCanineType?.trim() ? 1 : 0;
      const rightNeedsReview = right.currentCanineType?.trim() ? 1 : 0;
      return (
        leftNeedsReview - rightNeedsReview ||
        left.characterName.localeCompare(right.characterName, undefined, { sensitivity: "base" }) ||
        left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" })
      );
    });
}

function getCanineTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: "__NULL__", label: "Unknown" },
    { value: "wolf", label: "Wolf" },
    { value: "fox", label: "Fox" },
    { value: "coyote", label: "Coyote" },
    { value: "jackal", label: "Jackal" },
    { value: "dog", label: "Dog" }
  ];
}

function getEffectiveCanineType(canineId: string, originalCanineType: string | null): string | null {
  return Object.prototype.hasOwnProperty.call(curationState.canineTypeUpdatesByCanineId, canineId)
    ? curationState.canineTypeUpdatesByCanineId[canineId]
    : originalCanineType;
}

function stageCanineType(canineId: string, canineType: string | null): void {
  const canine = dataStore.caninesById.get(canineId);

  if (!canine) {
    return;
  }

  curationState.copiedPatch = false;

  if ((canine.canineType ?? null) === canineType) {
    delete curationState.canineTypeUpdatesByCanineId[canineId];
    return;
  }

  curationState.canineTypeUpdatesByCanineId[canineId] = canineType;
}

function getPendingCanineTypeUpdates(store: DataStore): CanineTypePatchUpdate[] {
  return Object.entries(curationState.canineTypeUpdatesByCanineId)
    .filter(([canineId, canineType]) => (store.caninesById.get(canineId)?.canineType ?? null) !== canineType)
    .map(([canineId, canineType]) => ({ canineId, canineType }))
    .sort((left, right) => {
      const leftName = store.caninesById.get(left.canineId)?.displayName ?? left.canineId;
      const rightName = store.caninesById.get(right.canineId)?.displayName ?? right.canineId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function getCurrentishCanineSummaries(store: DataStore): CanineSummary[] {
  return store.data.canonical.canines
    .filter((canine) => !curationState.hideInactive || canine.status !== "inactive")
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary))
    .filter(matchesCurationFilters)
    .sort(
      (left, right) =>
        left.character!.name.localeCompare(right.character!.name, undefined, { sensitivity: "base" }) ||
        left.canine.displayName.localeCompare(right.canine.displayName, undefined, { sensitivity: "base" })
    );
}

function getCurationFilteredSourceSummaries(store: DataStore): CanineSummary[] {
  return store.data.canonical.canines
    .map((canine) => store.getCanineSummary(canine.id))
    .filter((summary): summary is CanineSummary => Boolean(summary))
    .filter((summary) => !curationState.hideInactive || summary.canine.status !== "inactive");
}

function matchesCurationFilters(summary: CanineSummary): boolean {
  const query = curationState.filters.query.trim().toLowerCase();
  const searchText = [
    summary.canine.displayName,
    summary.canine.callName,
    summary.canine.id,
    summary.character?.name,
    summary.human?.displayName,
    summary.canine.status,
    summary.canine.canineType,
    summary.canine.gender,
    summary.canine.breedingRole
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (query) {
    const queryTokens = query.split(/\s+/).filter(Boolean);
    if (queryTokens.some((token) => !searchText.includes(token))) {
      return false;
    }
  }

  if (curationState.filters.characterId !== "all" && summary.character?.id !== curationState.filters.characterId) {
    return false;
  }
  if (curationState.filters.humanId !== "all" && (summary.human?.id ?? "unknown") !== curationState.filters.humanId) {
    return false;
  }
  if (curationState.filters.status !== "all" && summary.canine.status !== curationState.filters.status) {
    return false;
  }
  if (
    curationState.filters.breedingRole !== "all" &&
    normalizeCuratedBreedingRole(summary.canine.breedingRole) !== curationState.filters.breedingRole
  ) {
    return false;
  }
  if (
    curationState.filters.canineType !== "all" &&
    formatCanineTypeLabel(summary.canine.canineType) !== curationState.filters.canineType
  ) {
    return false;
  }
  if (curationState.filters.gender !== "all" && normalizeCuratedGender(summary.canine.gender) !== curationState.filters.gender) {
    return false;
  }

  return true;
}

function getGenderReviewEntries(store: DataStore): GenderReviewEntry[] {
  return getCurrentishCanineSummaries(store).map((summary) => ({
    canineId: summary.canine.id,
    displayName: summary.canine.displayName,
    characterName: summary.character?.name ?? "unknown",
    humanName: summary.human?.displayName ?? "unknown",
    status: summary.canine.status,
    breedingRole: summary.canine.breedingRole ?? "unknown",
    currentGender: normalizeCuratedGender(summary.canine.gender)
  }));
}

function normalizeCuratedGender(value: string | null | undefined): CuratedGender {
  return value === "M" || value === "F" || value === "A" ? value : "U";
}

function getEffectiveGender(canineId: string, originalGender: CuratedGender): CuratedGender {
  return curationState.genderUpdatesByCanineId[canineId] ?? originalGender;
}

function stageCanineGender(canineId: string, gender: CuratedGender): void {
  const canine = dataStore.caninesById.get(canineId);
  if (!canine) return;
  curationState.copiedPatch = false;
  if (normalizeCuratedGender(canine.gender) === gender) {
    delete curationState.genderUpdatesByCanineId[canineId];
    return;
  }
  curationState.genderUpdatesByCanineId[canineId] = gender;
}

function getPendingGenderUpdates(store: DataStore): CanineGenderPatchUpdate[] {
  return Object.entries(curationState.genderUpdatesByCanineId)
    .filter(([canineId, gender]) => normalizeCuratedGender(store.caninesById.get(canineId)?.gender) !== gender)
    .map(([canineId, gender]) => ({ canineId, gender }))
    .sort((left, right) => {
      const leftName = store.caninesById.get(left.canineId)?.displayName ?? left.canineId;
      const rightName = store.caninesById.get(right.canineId)?.displayName ?? right.canineId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function getAppearanceReviewEntries(store: DataStore): AppearanceReviewEntry[] {
  return getCurrentishCanineSummaries(store).map((summary) => ({
    canineId: summary.canine.id,
    displayName: summary.canine.displayName,
    characterName: summary.character?.name ?? "unknown",
    humanName: summary.human?.displayName ?? "unknown",
    status: summary.canine.status,
    breedingRole: summary.canine.breedingRole ?? "unknown",
    currentAppearance: summary.canine.appearance ?? null
  }));
}

function normalizeAppearance(appearance: CanineAppearance | null): CanineAppearance | null {
  if (!appearance) {
    return null;
  }
  return {
    primaryColor: appearance.primaryColor?.trim() || null,
    secondaryColor: appearance.secondaryColor?.trim() || null,
    eyeColor: appearance.eyeColor?.trim() || null
  };
}

function appearancesEqual(left: CanineAppearance | null, right: CanineAppearance | null): boolean {
  const normalizedLeft = normalizeAppearance(left);
  const normalizedRight = normalizeAppearance(right);
  return (
    (normalizedLeft?.primaryColor ?? null) === (normalizedRight?.primaryColor ?? null) &&
    (normalizedLeft?.secondaryColor ?? null) === (normalizedRight?.secondaryColor ?? null) &&
    (normalizedLeft?.eyeColor ?? null) === (normalizedRight?.eyeColor ?? null)
  );
}

function getEffectiveAppearance(canineId: string, originalAppearance: CanineAppearance | null): CanineAppearance | null {
  return Object.prototype.hasOwnProperty.call(curationState.appearanceUpdatesByCanineId, canineId)
    ? curationState.appearanceUpdatesByCanineId[canineId]
    : originalAppearance;
}

function stageCanineAppearance(canineId: string, appearance: CanineAppearance): void {
  const canine = dataStore.caninesById.get(canineId);
  if (!canine) return;
  curationState.copiedPatch = false;
  const normalized = normalizeAppearance(appearance);
  if (appearancesEqual(canine.appearance ?? null, normalized)) {
    delete curationState.appearanceUpdatesByCanineId[canineId];
    return;
  }
  curationState.appearanceUpdatesByCanineId[canineId] = normalized ?? { primaryColor: null, secondaryColor: null, eyeColor: null };
}

function getPendingAppearanceUpdates(store: DataStore): CanineAppearancePatchUpdate[] {
  return Object.entries(curationState.appearanceUpdatesByCanineId)
    .filter(([canineId, appearance]) => !appearancesEqual(store.caninesById.get(canineId)?.appearance ?? null, appearance))
    .map(([canineId, appearance]) => ({ canineId, appearance: normalizeAppearance(appearance) }))
    .sort((left, right) => {
      const leftName = store.caninesById.get(left.canineId)?.displayName ?? left.canineId;
      const rightName = store.caninesById.get(right.canineId)?.displayName ?? right.canineId;
      return leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    });
}

function createHerdHealthWorkflow(store: DataStore): HTMLElement {
  const report = createHerdHealthReport(store);
  const section = createElement("section", "workflow-section guidance-layout");

  section.append(
    createElement("h3", undefined, "Breeding cadre health"),
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
        ? "There is not enough breeding-cadre lineage coverage to calculate herd relatedness pressure yet."
        : `${formatPercent(relatedness)} of comparable breeding-cadre pairs share tracked ancestry. This is a first-pass pressure signal, not a complete genetics model.`
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
      "Breeding cadre",
      String(overview.breedingCadreCanines),
      "Active canines currently treated as part of the breeding pool. Play-only pets are excluded."
    ],
    [
      "Gender split",
      `${overview.activeMales} M / ${overview.activeFemales} F`,
      "Breeding-cadre canines grouped by recorded gender. Unknown gender is not included in this split."
    ],
    [
      "Trait coverage",
      `${overview.activeWithTraitProfiles}/${overview.breedingCadreCanines}`,
      "How many breeding-cadre canines have a trait profile available for solving, planning, and comparison."
    ],
    [
      "Lineage coverage",
      `${overview.activeWithLineageProfiles}/${overview.breedingCadreCanines}`,
      "How many breeding-cadre canines have tracked parent and grandparent lineage data."
    ],
    [
      "Avg total",
      formatNullableNumber(overview.averageTotal),
      "Average TOTAL score across breeding-cadre canines with known trait profiles."
    ],
    [
      "Avg Procreation",
      formatNullableNumber(overview.averageProcreation),
      "Average Procreation value across breeding-cadre canines with known trait profiles."
    ],
    [
      "Related pairs",
      `${relatedness.relatedPairs}/${relatedness.comparablePairs}`,
      "Comparable breeding-cadre mating pairs that are blocked by tracked parent or grandparent relatedness."
    ],
    [
      "Active outside cadre",
      String(overview.activeOutsideBreedingCadre),
      "Current pets that are active in records but not part of the breeding pool."
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
    createElement("p", "plan-note", "Ancestors appearing in multiple breeding-cadre lineages can indicate bloodlines that are becoming hard to avoid."),
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
  heading.title = "Breeding-cadre canines with the fewest genetically safe opposite-gender mates in the current breeding pool.";
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
    createElement("p", "plan-note", "These records have the fewest genetically safe opposite-gender breeding-cadre mates within the tracked parent/grandparent window."),
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
    createLabel("Breeding role", createDataBrowserSelect("breedingRole", result.breedingRoleOptions, output, store)),
    createLabel("Canine type", createDataBrowserSelect("canineType", result.canineTypeOptions, output, store)),
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
  field: "gender" | "status" | "breedingRole" | "canineType" | "humanId" | "primaryColor" | "secondaryColor" | "eyeColor",
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
    createElement("p", undefined, "Search includes canine name, call name, character, human, status, breeding role, gender, type, and appearance.")
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

  for (const label of ["Canine", "Owner", "Gender", "Status", "Breeding", "Type", "Total", "Procreation"]) {
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
      createElement("td", undefined, formatBreedingRole(row.canine.breedingRole ?? "unknown")),
      createElement("td", undefined, row.canine.canineType ?? "unknown"),
      createElement("td", "numeric-cell", row.totalLabel),
      createElement("td", "numeric-cell", row.procreationLabel)
    );
    body.append(tr);
  }

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const cell = createElement("td", undefined, "No canines match the current filters.");
    cell.colSpan = 8;
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
    ["Breeding role", formatBreedingRole(row.canine.breedingRole ?? "unknown")],
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
        .replace("active", "breeding-cadre")
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
      `${formatGenderLabel(candidate.canine.gender)} | ${candidate.canine.canineType ?? "unknown"} | ${candidate.characterName} / ${candidate.humanName}`
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

function formatCanineTypeLabel(canineType: string | null): string {
  return canineType?.trim() || "unknown";
}

function formatAppearanceSummary(appearance: CanineAppearance | null): string {
  const normalized = normalizeAppearance(appearance);
  return [
    `primary ${normalized?.primaryColor ?? "unknown"}`,
    `secondary ${normalized?.secondaryColor ?? "unknown"}`,
    `eyes ${normalized?.eyeColor ?? "unknown"}`
  ].join(", ");
}

function normalizeCuratedBreedingRole(value: string | null | undefined): CuratedBreedingRole {
  if (value === "breeding" || value === "play-only" || value === "retired" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function createCalculatorCanonicalDraft(row: Record<string, string>): {
  payload: Record<string, unknown>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const exactTraits = parseExactTraitValuesFromRow(row);
  const total = Number.parseInt(row.TOTAL, 10);
  const humanName = calculatorState.humanName.trim();
  const characterName = calculatorState.characterName.trim();
  const callName = calculatorState.callName.trim();
  const observedDescription = calculatorState.observedDescription.trim();
  const inferred = inferCanineDetailsFromDescription(observedDescription);
  const humanId = humanName ? `human-${slugifyIdentifier(humanName)}` : null;
  const characterId = characterName ? `character-${slugifyIdentifier(characterName)}` : null;
  const canineId =
    characterName && callName && Number.isFinite(total)
      ? `canine-${slugifyIdentifier(characterName)}-${slugifyIdentifier(callName)}-${total}`
      : null;

  if (!humanName) warnings.push("Add the human name to generate a stable human record.");
  if (!characterName) warnings.push("Add the character/player name to generate a stable character record.");
  if (!callName) warnings.push("Add the pet call name to generate a stable canine record.");
  if (!exactTraits) warnings.push("The solved profile is not exact yet, so the trait profile draft is incomplete.");
  if (!Number.isFinite(total)) warnings.push("TOTAL is not exact yet, so the canine id/display name draft is incomplete.");
  if (!observedDescription) warnings.push("Paste the observed long description to infer gender, type, and visible appearance.");

  const canine = {
    id: canineId ?? "canine-missing-id",
    externalIds: {},
    callName: callName || "UNKNOWN",
    displayName:
      characterName && callName && Number.isFinite(total)
        ? `${characterName} ${callName} ${total}`
        : row.Name || "Solved canine",
    characterId: characterId ?? "character-missing-id",
    gender: inferred.gender,
    canineType: inferred.canineType,
    appearance: inferred.appearance,
    status: calculatorState.exportStatus,
    breedingRole: calculatorState.exportBreedingRole
  };

  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    kind: "canonical-canine-draft",
    human: humanId
      ? {
          id: humanId,
          displayName: humanName,
          contact: null,
          status: "active"
        }
      : null,
    character: characterId
      ? {
          id: characterId,
          name: characterName,
          humanId,
          status: "active"
        }
      : null,
    canine,
    traitProfile:
      canineId && exactTraits
        ? {
            canineId,
            status: "known",
            total,
            traits: exactTraits
          }
        : null,
    sourceObservation: canineId
      ? {
          id: `source-manual-calculator-${canineId}`,
          entityType: "canine",
          entityId: canineId,
          source: "manual/calculator",
          sourceObservedAt: "2026-06-07",
          sourceLag: null,
          externalId: null,
          notes: buildCalculatorSourceNotes(observedDescription, inferred.notes)
        }
      : null
  };

  return { payload, warnings };
}

function parseExactTraitValuesFromRow(row: Record<string, string>): Record<string, number> | null {
  const traits: Record<string, number> = {};
  for (const trait of traitNames) {
    const value = Number.parseInt(row[trait], 10);
    if (!Number.isFinite(value)) {
      return null;
    }
    traits[trait] = value;
  }
  return traits;
}

function slugifyIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCanineDetailsFromDescription(description: string): {
  gender: CuratedGender;
  canineType: string | null;
  appearance: CanineAppearance | null;
  notes: string[];
} {
  const notes: string[] = [];
  const normalized = description.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const canineTypeMatch = lower.match(/\b(wolf|fox|coyote|jackal|dog)\b/);
  const canineType = canineTypeMatch?.[1] ?? null;
  if (!canineType) {
    notes.push("Could not infer canine type from description.");
  }

  const gender: CuratedGender = /\bher\b/.test(lower) ? "F" : /\bhis\b/.test(lower) ? "M" : "U";
  if (gender === "U") {
    notes.push("Could not infer gender pronoun from description.");
  }

  const primaryColorMatch = normalized.match(/\bhas a ([A-Za-z]+(?: [A-Za-z]+)?) coat\b/i);
  const eyeColorMatch = normalized.match(/\b([A-Za-z]+(?: [A-Za-z]+)?) eyes\b/i);
  const secondaryColorMatch = normalized.match(/\bwith ([A-Za-z]+(?: [A-Za-z]+)?) (?:stripes|spots|markings|ear|ears)\b/i);

  const appearance = normalizeAppearance({
    primaryColor: primaryColorMatch?.[1] ?? null,
    secondaryColor: secondaryColorMatch?.[1] ?? null,
    eyeColor: eyeColorMatch?.[1] ?? null
  });

  if (!appearance?.primaryColor) notes.push("Could not infer primary coat color from description.");
  if (!appearance?.secondaryColor) notes.push("Could not infer a simplified secondary color from description.");
  if (!appearance?.eyeColor) notes.push("Could not infer eye color from description.");

  return { gender, canineType, appearance, notes };
}

function buildCalculatorSourceNotes(description: string, notes: readonly string[]): string {
  const parts: string[] = ["Solved from calculator workflow."];
  if (description) {
    parts.push(`Observed description: ${description.replace(/\s+/g, " ").trim()}`);
  }
  if (notes.length > 0) {
    parts.push(`Inference notes: ${notes.join(" ")}`);
  }
  return parts.join(" ");
}

function createCurationSelectedCanineDetail(store: DataStore): HTMLElement {
  const summary = curationState.selectedCanineId ? store.getCanineSummary(curationState.selectedCanineId) : undefined;
  if (!summary) {
    const detail = createElement("section", "candidate-detail");
    detail.append(createElement("h3", undefined, "Selected pet detail"), createElement("p", undefined, "No pet selected."));
    return detail;
  }
  const row = createDataBrowserRow(summary);
  const detail = createDataBrowserDetail(row, store);
  const heading = detail.querySelector("h3");
  if (heading) {
    heading.textContent = `Selected pet detail: ${summary.canine.displayName}`;
  }
  return detail;
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
      ? `${store.stats.humans} humans, ${store.stats.characters} characters, ${store.stats.activeCanines} active canines, ${store.stats.breedingCanines} breeding-cadre canines, ${store.stats.knownTraitProfiles} known trait profiles, ${store.stats.lineageProfiles} lineage profiles, ${store.stats.collarReferences} collar references.`
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
    createLabel("Known human", createKnownHumanSelect()),
    createKnownRetiredToggle(),
    createLabel("Known canine", createKnownCanineSelect()),
    createLabel("Comparison direction", createDirectionSelect()),
    createLabel("Result name", createResultNameInput()),
    createCalculatorRecordFields(),
    createLabel("Comparison text", createComparisonTextArea()),
    createCalculatorActions()
  );

  output.append(
    createDirectionHint(draftResult.directionSuggestion, draftResult.direction),
    createWarnings([...calculatorState.draftWarnings, ...result.warnings]),
    createComparisonHistory(calculatorState.history)
  );

  if (result.resultRow) {
    output.append(
      createResultCards(result.resultRow),
      createTraitResultTable(result.resultRow),
      createExportBlock(result.resultRow, result.exportText)
    );
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

function createKnownHumanSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control") as HTMLSelectElement;
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All humans";
  select.append(allOption);

  const seen = new Set<string>();
  const options = knownCanineOptions
    .filter((option) => Boolean(option.humanId) && !seen.has(option.humanId as string))
    .sort((left, right) => (left.humanLabel ?? "").localeCompare(right.humanLabel ?? "", undefined, { sensitivity: "base" }));

  for (const option of options) {
    const humanId = option.humanId ?? null;
    if (!humanId || seen.has(humanId)) {
      continue;
    }
    seen.add(humanId);
    const element = document.createElement("option");
    element.value = humanId;
    element.textContent = option.humanLabel ?? humanId;
    select.append(element);
  }

  select.value = calculatorState.knownHumanId;
  select.addEventListener("change", () => {
    calculatorState.knownHumanId = select.value;
    const knownSelect = document.querySelector<HTMLSelectElement>(`#${knownCanineSelectId}`);
    if (knownSelect) {
      updateKnownCanineSelectOptions(knownSelect);
    }
    render();
  });

  return select;
}

function createKnownRetiredToggle(): HTMLElement {
  const wrap = createElement("div", "button-row");
  wrap.append(
    createToggleButton(
      calculatorState.hideRetiredKnowns ? "Show retired knowns" : "Hide retired knowns",
      calculatorState.hideRetiredKnowns,
      () => {
        calculatorState.hideRetiredKnowns = !calculatorState.hideRetiredKnowns;
        const knownSelect = document.querySelector<HTMLSelectElement>(`#${knownCanineSelectId}`);
        if (knownSelect) {
          updateKnownCanineSelectOptions(knownSelect);
        }
        render();
      }
    )
  );
  return wrap;
}

function getFilteredKnownCanineOptions(): KnownCanineOption[] {
  return filterKnownCanineOptions(
    knownCanineOptions.filter((option) => {
      if (calculatorState.knownHumanId !== "all" && option.humanId !== calculatorState.knownHumanId) {
        return false;
      }
      if (calculatorState.hideRetiredKnowns && option.breedingRole === "retired") {
        return false;
      }
      return true;
    }),
    calculatorState.knownFilter
  );
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

function createCalculatorRecordFields(): HTMLElement {
  const group = createElement("div", "field-grid");
  group.append(
    createLabel("Human", createCalculatorMetadataInput("humanName", "Bob")),
    createLabel("Character / player", createCalculatorMetadataInput("characterName", "Blurgy")),
    createLabel("Pet call name", createCalculatorMetadataInput("callName", "Lucy")),
    createLabel("Record status", createCalculatorStatusSelect()),
    createLabel("Activity type", createCalculatorBreedingRoleSelect()),
    createLabel("Observed long description", createCalculatorDescriptionTextArea())
  );
  return group;
}

function createCalculatorMetadataInput(
  field: "humanName" | "characterName" | "callName",
  placeholder: string
): HTMLInputElement {
  const input = createElement("input", "field-control") as HTMLInputElement;
  input.value = calculatorState[field];
  input.placeholder = placeholder;
  input.addEventListener("input", () => {
    calculatorState[field] = input.value;
    render();
  });
  return input;
}

function createCalculatorStatusSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control") as HTMLSelectElement;
  for (const [value, label] of [
    ["active", "Active"],
    ["unknown", "Unknown"],
    ["inactive", "Inactive"]
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = calculatorState.exportStatus;
  select.addEventListener("change", () => {
    calculatorState.exportStatus = select.value as CuratedCanineStatus;
    render();
  });
  return select;
}

function createCalculatorBreedingRoleSelect(): HTMLSelectElement {
  const select = createElement("select", "field-control") as HTMLSelectElement;
  for (const option of getBreedingRoleOptions()) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
  select.value = calculatorState.exportBreedingRole;
  select.addEventListener("change", () => {
    calculatorState.exportBreedingRole = select.value as CuratedBreedingRole;
    render();
  });
  return select;
}

function createCalculatorDescriptionTextArea(): HTMLTextAreaElement {
  const textarea = createElement("textarea", "field-control comparison-input") as HTMLTextAreaElement;
  textarea.value = calculatorState.observedDescription;
  textarea.placeholder = "Paste the pet's observed long description here.";
  textarea.spellcheck = false;
  textarea.addEventListener("input", () => {
    calculatorState.observedDescription = textarea.value;
    render();
  });
  return textarea;
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
    calculatorState.resultName = "";
    calculatorState.humanName = "";
    calculatorState.characterName = "";
    calculatorState.callName = "";
    calculatorState.observedDescription = "";
    calculatorState.exportStatus = "active";
    calculatorState.exportBreedingRole = "breeding";
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

function createExportBlock(row: Record<string, string>, exportText: string): HTMLElement {
  const block = createElement("div", "export-block");
  const draft = createCalculatorCanonicalDraft(row);
  const jsonOutput = createElement("textarea", "field-control export-output") as HTMLTextAreaElement;
  const copyJsonButton = createElement("button", "primary-button", "Copy JSON draft") as HTMLButtonElement;
  const legacyOutput = createElement("textarea", "field-control export-output") as HTMLTextAreaElement;
  const copyLegacyButton = createElement("button", "secondary-button", "Copy legacy row") as HTMLButtonElement;

  jsonOutput.readOnly = true;
  jsonOutput.value = JSON.stringify(draft.payload, null, 2);
  copyJsonButton.type = "button";
  copyJsonButton.addEventListener("click", () => {
    void navigator.clipboard?.writeText(jsonOutput.value);
  });

  legacyOutput.readOnly = true;
  legacyOutput.value = exportText;
  copyLegacyButton.type = "button";
  copyLegacyButton.addEventListener("click", () => {
    void navigator.clipboard?.writeText(exportText);
  });

  block.append(createElement("h3", undefined, "Import-ready JSON draft"));
  if (draft.warnings.length > 0) {
    const warningList = createElement("ul", "error-list");
    for (const warning of draft.warnings) {
      warningList.append(createElement("li", undefined, warning));
    }
    block.append(warningList);
  }
  block.append(jsonOutput, copyJsonButton, createElement("h3", undefined, "Legacy spreadsheet row"), legacyOutput, copyLegacyButton);
  return block;
}

render();
