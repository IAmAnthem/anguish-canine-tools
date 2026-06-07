# Plan Of Attack

This project should move from legacy PowerShell tools to a public, static web app with repository-managed data.

## Guiding Decisions

- The app should be browser-based and hostable for zero cost.
- Canonical public data should live in Git, not in an open writable database.
- Data changes should be reviewable through commits or pull requests.
- The app should distinguish genetic relationship safety from practical breeding availability.
- The app should distinguish a current pet from a breeding-pool pet; not every active pet is part of the breeding cadre.
- The app should distinguish relationship penalties from mixed-type breeding penalties.
- The app should treat Procreation as a first-class breeding priority, not just another trait in a total score.
- The app should support breeding decisions, not become a general canine time-tracking system.
- Trait-solving and breeding-planning logic should be separate domain modules.
- The initial build should preserve the known behavior of the PowerShell tools before adding new behavior.

## Phase 1: Foundation

### Phase 1A: Data Layout And Imports

- [x] Define the normalized data model.
- [x] Create canonical data tables.
- [x] Create reference data tables.
- [x] Create data schema documentation.
- [x] Create repeatable legacy data importer.
- [x] Import reviewed legacy trait data.
- [x] Import reviewed legacy lineage data.
- [x] Import optional appearance data from reviewed sources.
- [x] Import collar/gem reference data.
- [x] Ignore private planning workbooks and local-only source material.
- [x] Validate canonical data references manually.
- [ ] Add canonical `canineType` (wolf, fox, coyote, jackal, dog, etc.) to canine records.
- [ ] Add canonical breeding-pool participation field for canines, separate from `status`.
- [ ] Define breeding-role values such as `breeding`, `play-only`, `retired`, and `unknown`.
- [ ] Decide importer defaults for records that are active but not yet known to be in or out of the breeding cadre.

### Phase 1B: Trait Calculator Rules

- [x] Port comparison phrase ranges.
- [x] Parse pasted comparison text.
- [x] Detect comparison confidence such as `certain`, `think`, and `feel`.
- [x] Reject or warn on non-certain comparison text.
- [x] Support `Unknown to Known` direction.
- [x] Support `Known to Unknown` direction.
- [x] Merge multiple comparisons into narrower trait ranges.
- [x] Skip unsolved known-pet traits.
- [x] Calculate total/subtotal ranges.
- [x] Apply overall comparison ranges.
- [x] Produce a result row suitable for display/export.
- [x] Verify TypeScript parser coverage with `Validation-UnknownToKnown.txt`.
- [x] Verify TypeScript parser coverage with `Validation-KnownToUnknown.txt`.
- [x] Verify expected output against `Validation-RESULTS.txt`.

### Phase 1C: Lineage And Relationship Rules

- [x] Build a relationship set from self, parents, and grandparents.
- [x] Ignore null, unknown, and NPC ancestry.
- [x] Compare two canines for shared ancestry.
- [x] Return shared ancestor details, not only safe/unsafe.
- [x] Generate a hypothetical puppy lineage from sire and dam.
- [x] Confirm parent/grandparent shifting matches the legacy breeding scripts.
- [x] Add fixtures for unrelated parents.
- [x] Add fixtures for related parents.
- [x] Add fixtures proving NPC/null ancestors do not match.

### Phase 1D: Breeding Candidate Rules

- [x] Filter candidate mates by required/opposite gender.
- [x] Distinguish genetic relationship safety from practical availability.
- [x] Exclude same-human alternate characters from practical direct breeding candidates.
- [x] Warn on mixed canine type separately from relationship safety.
- [x] Surface total trait score in candidate ranking.
- [x] Surface Procreation independently from total score.
- [x] Preserve estimated puppy values as estimates, not predictions.
- [x] Keep planned puppies separate from actual statted canines.
- [ ] Default breeding candidate pools to canines marked as part of the breeding cadre, not every merely active pet.
- [ ] Decide whether Planner can optionally include `play-only` pets as an override instead of by default.

### Phase 1E: Reference Data Guidance

- [x] Validate collar/gem reference data loads.
- [x] Confirm collar categories: trait, breeding, birth.
- [x] Surface breeding-time collar suggestions.
- [x] Surface birth-time collar suggestions.
- [x] Confirm Opal/unique pet collar is guidance only and does not mutate trait data.
- [x] Confirm birth collars are guidance only and do not mutate inherited trait data.

### Phase 1F: Automated Data Integrity Checks

- [x] Check for duplicate IDs.
- [x] Check every character references an existing human.
- [x] Check every canine references an existing character.
- [x] Check every trait profile references an existing canine.
- [x] Check every lineage profile references an existing canine.
- [x] Check every lineage parent/grandparent reference points to an existing canine or is null.
- [x] Check reference data parses cleanly.
- [x] Make the checks easy to run before every commit.
- [ ] Check every canine has a valid `canineType`.
- [ ] Check every canine has a valid breeding-role value.
- [ ] Check there is no impossible combination such as `inactive` plus `breeding` unless explicitly allowed by policy.

Initial repository data layout:

- `data/canonical/`: JSON tables used by the static app
- `data/schema.md`: working schema examples
- `data/README.md`: data stewardship and identity rules

Verification commands:

- `npm run check`: typecheck and run all tests
- `npm run check:data`: run only data integrity checks

## Phase 2: Static App

### Phase 2A: App Scaffold

- [x] Add Vite app scaffold.
- [x] Keep existing domain modules under `src/domain`.
- [x] Add app entry point, root layout, and basic navigation.
- [x] Add tabs or equivalent views for calculator, breeding planner, data browser, and reference guidance.
- [x] Add production build command.
- [x] Confirm the app can run locally with `npm run dev`.
- [x] Confirm the app can build as static files.

### Phase 2B: Data Loading

- [x] Load canonical JSON data into the app bundle.
- [x] Load reference JSON data into the app bundle.
- [x] Create lookup helpers for humans, characters, canines, trait profiles, and lineage profiles.
- [x] Show a visible data-load failure state.
- [x] Run integrity checks during development or app startup.
- [x] Keep private workbook/source material out of the app bundle.
- [ ] Load and expose canonical `canineType` and breeding-role fields through app store helpers.

### Phase 2C: Trait Calculator UI

- [x] Add known canine selector.
- [x] Add comparison direction selector with auto-suggestion.
- [x] Add pasted comparison text input.
- [x] Parse pasted comparison blocks in the browser.
- [x] Warn on non-certain or unrecognized comparison text.
- [x] Solve and merge comparison blocks using selected known canine data.
- [x] Show solved trait row with total and Procreation visible.
- [x] Add copy/export helper for the solved result row.
- [x] Preserve legacy validation behavior in app-level tests.

### Phase 2D: Breeding Planner UI

- [x] Add selected canine/breeding target selector.
- [x] Add candidate mate list filtered by required/opposite gender.
- [x] Show genetic relationship safety separately from practical availability.
- [x] Show same-human alternate-character warning.
- [x] Show mixed canine type warning separately from relationship safety.
- [x] Rank candidates by total score and Procreation.
- [x] Show estimated puppy total/Procreation as an estimate, not a prediction.
- [x] Generate hypothetical puppy lineage preview.
- [x] Keep planned puppies visually separate from canonical canines.
- [ ] Show canine type/race prominently in planner target and candidate summaries.
- [ ] Exclude `play-only` and other non-breeding-role pets from planner selectors by default.
- [ ] Add a clear override if maintainers want to inspect non-breeding-role pets without making them default breeding candidates.

### Phase 2E: Multi-Step Plan Mode

This is a separate workflow from the Phase 2D one-breeding Planner. The Planner answers "who should this canine breed with right now?" Multi-Step Plan Mode supports repeated population-lift work: building, saving, reloading, and updating a multi-generation breeding chain as real litters are produced. The goal is not only to breed one good puppy; it is to move the starting parents and their visible known ancestry beyond the game's remembered parent/grandparent relationship window. The default workflow is a gender-run lift: choose puppies of the current target gender that beat the parent average, then breed that line through opposite-gender mature pets because heat, pregnancy, litter birth, and puppy statting are the scarce time-gated work.

- [x] Define a local-only breeding plan data structure.
- [x] Support multiple breeding steps such as Step 1, Step 2, and Step 3.
- [x] Allow each step to choose canonical canines or prior planned puppies as parents.
- [x] Generate hypothetical genetics/lineage for planned puppies per step.
- [x] Keep planned puppy IDs visibly separate from canonical canine IDs.
- [x] Add parent pickers for Step 1 starting sire and dam.
- [x] Add opposite-gender mate pickers for Step 2 and Step 3.
- [x] Filter Step 2 and Step 3 mate pickers against related candidates.
- [x] Persist parent picker choices in local JSON export/import.
- [x] Warn when Step 1 selected parents are same-human alt-blocked.
- [x] Preserve the human-entered puppy label when a selected litter slot becomes a later step parent.
- [x] Distinguish incoming carry-forward parent from the current step's next selected puppy.
- [x] Flip Step 2 and Step 3 mate role based on the selected carry-forward puppy's actual gender.
- [x] Track the original breeding-pool ancestor set that the plan is trying to flush out.
- [x] Track starting parents plus their known visible ancestry as the flush target.
- [x] Capture gender-run carry-forward as the default multi-step planning assumption.
- [x] Capture mature female breeding availability as the time-gated planning constraint.
- [x] Show which original pool canines remain in each planned puppy's tracked relationship window.
- [x] Show which original pool canines have been flushed out by each step.
- [x] Explain visually that the three-step lift moves original pool pets beyond the parent/grandparent relationship window.
- [x] Preview whether the final planned puppy is clean against the current breeding pool.
- [x] Add a distinct Multi-Step Plan UI surface separate from the one-breeding Planner output.
- [x] Add plan tabs or step navigation for Step 1, Step 2, and Step 3.
- [x] Show each step as a repeatable pet-farming work area, not only a static plan summary.
- [x] Show parents, selected carry-forward puppy, candidate mate, estimates, actual litter slots, and step notes together.
- [x] Label the final Step 3 selected puppy as the cycle output rather than another carry-forward.
- [x] Add a visual history-flush panel for each step.
- [x] Add a final-plan summary showing the expected end pet's remaining ancestry risk and stat-lift path.
- [x] Add litter slots for entering actual solved puppy stats after a breeding produces puppies.
- [x] Accept MUD-style pasted puppy stat blocks for actual litter entries.
- [x] Parse Procreation from the 17-trait block instead of storing it as a separate entered value.
- [x] Support up to six puppy slots per litter.
- [x] Allow a puppy slot from one step to be selected as a parent for a later step.
- [x] Show total-score gain metrics for actual puppies against parent average and best parent.
- [x] Keep Procreation visible as parsed trait data without making it a keeper-jump metric.
- [x] Keep estimated/planned values separate from actual statted puppy values.
- [x] Add export for the full breeding plan as local JSON.
- [x] Add import for a previously exported breeding plan.
- [x] Add validation/warnings for plans that reference missing canonical canines.
- [x] Add app-level tests for plan import/export.
- [x] Add domain tests for multi-step parent chaining.

### Phase 2F: Data Browser

- [x] Add searchable canine table.
- [x] Show character and human ownership context.
- [x] Show trait totals and Procreation prominently.
- [x] Show lineage summary for selected canine.
- [x] Show appearance fields when available.
- [x] Add filters for gender, owner/human, status, total score, and Procreation.
- [x] Add filters for primary color, secondary color, eye color, and known appearance.
- [x] Display appearance as fixed primary/secondary/eye fields with unknowns shown explicitly.
- [x] Keep browser detail blank until the user selects a canine.
- [x] Limit the browser table to a scrollable result pane with sticky column headers.
- [x] Keep canonical data read-only in the public app.
- [x] Show source observations for selected canine records when available.
- [x] Add app-level tests for data browser search, filters, sorting, and appearance display.
- [ ] Show canine type/race in browser table and detail.
- [ ] Show breeding-role in browser table and detail.
- [ ] Add browser filters for canine type and breeding-role.

### Phase 2G: Reference Guidance UI

- [x] Surface breeding-time collar guidance near breeding actions.
- [x] Surface birth-time collar guidance near planned birth/appearance goals.
- [x] Keep passive trait collar references separate from timed breeding actions.
- [x] Make clear collar guidance does not mutate trait data.
- [x] Show wearer/timing context for collar setup.
- [x] Split guidance into beginner-friendly panes instead of one dense reference block.
- [x] Add a newcomer-oriented "how advancing pets works" guidance panel.
- [x] Add beginner-oriented bonded-wolf and wolf-training guidance panels.
- [x] Distinguish pet role guidance such as disposable versus bonded pets.
- [x] Distinguish breeding-origin guidance such as wild-tamed stock versus bred-line stock.
- [x] Distinguish wild-tame bonding time from bred-puppy instant bonding.
- [x] Keep collar timing/setup as its own dedicated guidance pane.
- [x] Add an app-orientation pane that explains what each tab is for and a recommended workflow through the site.
- [x] Use first-mention expansion for newcomer-facing abbreviations such as Very Large, Stage 2 (`VL2`).
- [x] Split ranger-specific reference material into a dedicated Ranger Class surface and keep app-orientation material in App Directions.
- [x] Add live breeding-cycle guidance including `encourage`, birth timing, puppy feeding risk, and Lessa cleanup.
- [x] Add litter statting and triage workflow guidance that reflects real compare-driven breeding sessions.
- [x] Add an app-directions workflow for live litter sessions rather than only static tab descriptions.
- [x] Replace the breeding-trait note dump with a proper Trait/Descriptor reference table that stands on its own from collar history.
- [x] Restore the full eye-color transition table, including outcomes such as `crimson`, `coppery`, `dark blue`, and `light grey`.
- [x] Add explicit guidance for the common player question of how to improve a fully maxed pet.

Follow-on opportunities from the real breeding workflow:

- [ ] Add a dedicated litter-session helper that accepts multiple compare blocks and groups them by puppy slot.
- [ ] Add a fast triage mode for marking puppies as keeper, discard, or unsolved during a live litter.
- [ ] Add a session checklist view for mating setup, collar timing, birth wait, statting, keeper selection, and cleanup.
- [ ] Explore whether Multi-Step can promote a chosen live-litter puppy into the next step with fewer clicks.
- [ ] Evaluate a lightweight public-source intake for Lessa's top-ten shelter list so stale canonical data can be cross-checked against currently visible competitive lines.

### Phase 2H: App Quality Checks

- [x] Add component or workflow tests for calculator behavior.
- [x] Add component or workflow tests for breeding planner behavior.
- [x] Add component or workflow tests for multi-step plan mode.
- [x] Complete desktop layout review.
- [x] Confirm desktop text does not overlap or overflow key controls.
- [x] Complete tablet layout review.
- [x] Complete phone layout review.
- [x] Decide whether mobile usability matters for initial launch.
- [x] Confirm all Phase 1 domain tests still pass.
- [x] Document local run/build/test commands.

Initial launch stance: desktop and tablet are supported; phone loads but is not optimized because the workflows are data-dense.

## Phase 3: Publishing

### Phase 3A: GitHub Pages First Publish

- [x] Confirm repository default branch is `main`.
- [x] Confirm `npm run build` produces the static site in `dist/`.
- [x] Configure Vite base path for GitHub Pages repository hosting.
- [x] Add GitHub Actions workflow to install dependencies, build, and upload `dist`.
- [x] Enable GitHub Pages from GitHub Actions in repository settings.
- [x] Push the workflow and verify the first Pages deployment succeeds.
- [x] Open the published Pages URL and check asset loading.
- [x] Click through Calculator, Planner, Multi-Step, Data, and Guidance on the live site.
- [x] Document GitHub Pages setup steps.

### Phase 3B: Initial Public Readiness

- [x] Update README with the live GitHub Pages URL.
- [x] Document the repo-based data update process.
- [x] Add contribution guidance for data corrections or new canine submissions.

## Phase 4: Optimization For Herd Management

### Phase 4A: Status Curation

Goal: build a safe maintainer workflow for fast data curation without creating a public writable database. The first editor should focus on status curation, because old historical pets currently pollute active breeding suggestions.

Domain rule:

- [x] Document that a character can have only one active pet at a time.
- [x] Add diagnostic validation that each character has no more than one `active` canine.
- [x] Promote active-canine ownership validation into required data integrity after stale records are curated.
- [x] Decide how to treat old records with no current confirmation: `inactive` versus `unknown`.

Current data note: initial status curation cleared all multiple-active-canine ownership conflicts. Historical pets confirmed gone should be `inactive`; old records with no current confirmation may remain `unknown`.

Breeding-cadre rule:

- [ ] Distinguish `active` from `in breeding cadre`; a player may actively use a pet without offering it to the herd breeding pool.
- [ ] Decide whether breeding-role curation belongs in the same maintainer workflow as status curation or in a later adjacent mode.

Status Curation UI:

- [x] Add a maintainer/status-curation view separate from public breeding tools.
- [x] Show records-management warnings for characters with multiple active canines.
- [x] Allow fast status changes among `active`, `inactive`, and `unknown`.
- [x] Provide a one-click "make this character's active pet" action.
- [x] When one canine is marked active for a character, mark that character's other active canines inactive in the pending edit set.
- [x] Show pending changes before export.
- [x] Make clear that the browser is preparing a patch, not directly editing the live repository.

Patch Export:

- [x] Export a compact status patch JSON instead of rewriting full canonical files.
- [x] Include only changed canine IDs and new statuses.
- [x] Make patch output easy to paste back into the repo workflow.

Patch Apply Script:

- [x] Add a local script that reads a status patch JSON.
- [x] Validate every patched canine ID exists.
- [x] Validate every patched status is allowed.
- [x] Apply updates to `data/canonical/canines.json`.
- [x] Preserve existing record order and minimize formatting churn.
- [x] Print a concise summary of changed active/inactive/unknown counts.

Safety And Audit:

- [x] Run data integrity checks after applying a patch.
- [x] Show `git diff` before commit so the maintainer can review exactly what changed.
- [x] Keep all applied changes auditable through Git history.
- [x] Keep public users from writing directly to canonical data.

Later Expansion:

- [ ] Add issue templates for data correction and app bug reports.
- [ ] Add broader data-editor filters by human, character, status, and search text.
- [ ] Show all canines owned by a selected character together.
- [ ] Include optional notes/source date in status patch export.
- [ ] Support bulk spreadsheet import or update review.
- [ ] Support trait, appearance, lineage, and ownership edits after status curation is proven safe.
- [ ] Add breeding-role curation so maintainers can mark active pets as `breeding` versus `play-only` without changing historical status.
- [ ] Add canine-type curation for records missing race/species.

Ownership Review:

- [x] Add a subordinate ownership-review mode for assigning `unknown` or unattributed characters to recognized humans.
- [x] Show affected characters with their associated canines for recognition.
- [x] Export a compact ownership patch for repo review rather than direct mutation.
- [ ] Add a local script that applies character-to-human ownership patches.

### Phase 4B: Herd Genetic Health Tab

- [x] Add a dedicated Herd Health tab separate from Data and Curate.
- [x] Define population-level health indicators for the active canine pool.
- [x] Surface relatedness pressure across the herd, not only pairwise parent checks.
- [x] Identify overused bloodlines and underrepresented clean lines.
- [x] Show stale, inactive, or unknown-status records separately from current breeding stock.
- [x] Add warnings when a proposed breeding path narrows future mate options.
- [ ] Distinguish full active ownership from the smaller breeding cadre in herd summaries.
- [ ] Let Herd Health default to the breeding cadre while still showing how many active pets are intentionally outside it.

### Phase 4C: Mating Algorithms

Goal: add a dedicated recommendation surface for mate-finding strategies that go beyond simple total/Procreation sorting. This should become the "why this pairing" tab for active breeders.

Mating Algorithms Tab:

- [x] Add a dedicated Algorithms tab separate from Herd Health and Planner.
- [x] Add an algorithm selector so different recommendation styles can share one workflow surface.
- [x] Add a target-canine picker for ranking mates against a specific active canine.
- [x] Make algorithm intent explicit in the UI so users understand what the selected mode is optimizing for.
- [ ] Default algorithm target/candidate pickers to breeding-cadre pets, not every active pet.
- [ ] Surface canine type/race in algorithm target and candidate summaries where mixed-type tradeoffs matter.

Compensatory Pairing:

- [x] Add compensatory mating suggestions for pairing strengths against weaknesses.
- [x] Surface the target canine's weakest traits so the ranking has visible context.
- [x] Show ranked safe mates with a short explanation of which traits each candidate is offsetting.
- [ ] Compare compensatory results against simple total/Procreation ranking.

Positive Assortative Mating:

- [x] Add positive assortative mating suggestions for intensifying already-strong lines.
- [x] Explain the diversity tradeoff when users choose this mode.

Algorithm Controls And Transparency:

- [x] Let users optionally prioritize a specific trait in algorithm ranking.
- [x] Let users tune the priority weight instead of hard-coding one fixed multiplier.
- [x] Reflect weighted-priority effects in the visible result columns, not only in hidden score math.
- [ ] Compare compensatory and assortative results against simple total/Procreation ranking.

Optimum Contribution Selection:

- [x] Define a simple herd-level objective that balances canine quality against overused bloodlines.
- [x] Choose first-pass diversity penalties: shared ancestors, low safe-mate counts, and repeated line concentration.
- [x] Produce an OCS-style ranking that favors improvement without collapsing the herd into a few dominant lines.
- [x] Surface visible OCS penalty columns and tooltips so the herd-level math is inspectable instead of hidden.
- [x] Decide how to explain herd-level math in player terms users can trust.
- [ ] Show why an OCS-ranked mate differs from compensatory or assortative rankings.

## Phase 5: AutoPlan Mode

Goal: move from one-target planning into a higher-order breeding coordinator that can produce a practical roadmap for multiple cooperating players and multiple advancing alts at once.

### Phase 5A: AutoPlan Domain Model

- [ ] Define an AutoPlan request model separate from one-line Multi-Step plans.
- [ ] Model cooperating players as a planning unit such as `John + Jeanie`.
- [ ] Model the advancing player explicitly, separate from helper/breeding-support players.
- [ ] Model the requested number of parallel advancing alts or bloodlines.
- [ ] Model the requested number of cycles per advancing line.
- [ ] Decide which assumptions are fixed defaults versus explicit user inputs.
- [ ] Keep AutoPlan IDs visibly separate from canonical canine IDs and from existing Multi-Step local plan IDs.
- [ ] Decide how AutoPlan request data references breeding-cadre pets versus active play-only pets.

### Phase 5B: Candidate Pool And Constraints

- [ ] Build an AutoPlan candidate pool from active canonical data.
- [ ] Reuse existing practical filters: same-human alt blocking, genetic relationship safety, and actual canine gender.
- [ ] Reuse herd-health data where helpful so AutoPlan avoids collapsing into the same overused lines.
- [ ] Decide how AutoPlan treats stale, inactive, or unknown-status records.
- [ ] Detect when the requested player pair does not have enough safe opposite-gender support to satisfy the requested roadmap.
- [ ] Build AutoPlan from breeding-cadre records by default, while allowing explicit inclusion of active play-only pets only when the planner requests it.
- [ ] Use canonical canine type/race in support-line selection where mixed-type penalties or goals matter.

### Phase 5C: Roadmap Generation Logic

- [ ] Generate an AutoPlan roadmap instead of a single pairing recommendation.
- [ ] Support a request such as: player pair `John + Jeanie`, advancing player `John`, alts to advance `3`.
- [ ] Produce a roadmap showing three advancing characters/pet lines being lifted through three breeding cycles each.
- [ ] Decide how AutoPlan selects the initial advancing stock for each requested alt line.
- [ ] Decide how AutoPlan chooses support mates from the cooperating herd without overusing one narrow line.
- [ ] Show which player is expected to provide the time-gated female-cycle work versus which player is receiving the advancing bloodline benefit.
- [ ] Keep the roadmap grounded in actual safe mate options from the current canonical pool.
- [ ] Indicate where the roadmap is trying to flush ancestry out of the remembered parent/grandparent window.

### Phase 5D: Roadmap Presentation

- [ ] Add a dedicated AutoPlan UI surface separate from Planner, Multi-Step, and Algorithms.
- [ ] Add selectors for player pair, advancing player, number of advancing alts, and cycles.
- [ ] Group the generated roadmap by advancing character or pet line so parallel tracks are readable.
- [ ] Show each cycle as a concrete breeding step, not abstract math.
- [ ] Explain the plan in human terms: who breeds what, who keeps what, and what the next cycle depends on.
- [ ] Surface warnings when the requested number of advancing alts is unrealistic for the available safe mate pool.
- [ ] Make clear which steps are estimates and which later become confirmed by real litter outcomes.

### Phase 5E: Shareable Plan Exchange

- [ ] Define an exportable AutoPlan package format that a human can download and share with another player.
- [ ] Keep the package local/file-based so the static app does not require a writable backend.
- [ ] Include enough context in the package for another player to import and review the roadmap without guessing what herd assumptions were used.
- [ ] Include canonical source date or export timestamp so recipients know how stale the plan might be.
- [ ] Distinguish planner-owned estimated puppies from later real evaluated puppies inside the package.
- [ ] Make the package safe to pass between players such as a herdmaster sending a proposed roadmap to John and Jeanie.

### Phase 5F: Execution And Feedback Loop

- [ ] Allow a recipient player to import a shared AutoPlan package and review the roadmap locally.
- [ ] Let players record actual litter outcomes against the roadmap after real breeding sessions.
- [ ] Reuse the existing compare-solving and puppy-slot workflows so real puppy evaluations can be attached to the shared plan.
- [ ] Allow players to export updated puppy results back out for another coordinator or herdmaster to review.
- [ ] Support a loop where Dave builds the initial roadmap, John and Jeanie execute/evaluate litters, then Dave reimports the updated results and revises the next cycle.
- [ ] Preserve the distinction between estimated roadmap state and confirmed executed state at every handoff.

### Phase 5G: Handoff To Existing Planning Tools

- [ ] Let an AutoPlan roadmap hand off into existing Multi-Step workflows when one line needs detailed manual management.
- [ ] Let AutoPlan consume existing Multi-Step results when a user has already partially executed a line.
- [ ] Reuse Planner and Algorithms output where that improves specific cycle-level recommendations inside the roadmap.
- [ ] Decide whether AutoPlan should call existing recommendation engines directly or materialize its own intermediate planning layer first.

## Phase 6: Custom Domain Later

- [ ] Decide whether to use GitHub Pages custom domain or wait for Cloudflare Pages.
- [ ] Pick final hostname or subdomain.
- [ ] Configure DNS.
- [ ] Verify HTTPS.

## Phase 7: Later Ideas

- Optional local private data import.
- Optional submission generator for players to send curated data updates.
- Ranking weights for total score versus Procreation.
- Cosmetic/appearance goal filtering.
- Collar/birth-influence planning notes.
- Breeding readiness/heat availability notes.
- Data quality/confidence flags.
- Admin tooling that edits repo data through Git rather than directly mutating a live database.
