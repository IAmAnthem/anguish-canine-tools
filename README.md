# Ancient Anguish Canine Tools

Browser-based tools for Ancient Anguish canine breeding, curation, and Ranger reference work.

Live app: https://iamanthem.github.io/anguish-canine-tools/

This project is intended to replace and expand the older PowerShell tools:

- `CanineCalculations`: trait comparison and stat solving
- `CanineBreeding`: lineage checks and breeding planning

The goal is a public, zero-cost web app that helps players evaluate canines, avoid inbreeding penalties, and plan useful breeding paths without requiring anyone to install or trust a local PowerShell script.

## Current Tools

### Trait Calculator

The trait calculator solves canine trait values from in-game comparison text and can now emit an import-ready canonical draft.

Current workflow:

1. Filter to the known compare pets you want to use.
2. Select the comparison direction explicitly.
3. Select a known canine.
4. Paste certain in-game comparison output and add each compare to history.
5. Narrow or solve the unknown canine's 17 traits.
6. Fill in solved pet identity fields and observed long description.
7. Copy the generated `canonical-canine-draft` JSON.
8. Apply that draft into canonical repo data with the import script.

The calculator also preserves structured compare-session evidence such as:

- `related`, `partially related`, or `unrelated`
- visible compared descriptors such as `a very large pearl trained fox`

### Breeding Planner

The breeding planner helps players evaluate parentage and find viable mates.

Planned workflow:

1. Load or import breeder/lineage data.
2. Select a sire and dam.
3. Detect shared ancestry.
4. Generate a hypothetical puppy lineage row.
5. Find unrelated future mates.
6. Rank or filter possible breeding paths by trait potential, Procreation, and practical owner availability.

### Additional Live Surfaces

The app also includes:

- `Multi-Step`: three-step ancestry flushing and carry-forward planning
- `Data`: canonical browser for canines, traits, lineage, ownership, and appearance
- `Herd Health`: population health plus curation tools
- `Algorithms`: OCS, compensatory, and assortative mate ranking
- `Ranger Class`: class reference, breeding notes, appearance tables, and collar guidance
- `App Directions`: onboarding for how to move through the site

## Data Stewardship Model

The first version should treat the repository as the source of truth for public canine data.

Canonical data should live in the repo, be reviewed through Git history, and deploy with the static app. This keeps public data durable, reviewable, and easy to roll back without creating an open writable database.

Initial goals:

- Public data is stored as versioned files in the repository.
- Data changes are made through commits or pull requests.
- Git history acts as the audit log and rollback path.
- The hosted app reads bundled data at build/runtime.
- No anonymous browser user can directly modify canonical data.
- Legacy canine data is included only after explicit maintainer review and approval.

This keeps hosting free and avoids creating a shared writable target that can be poisoned or vandalized.

## Community Data Intake

The current public data is useful but stale. Active players may have better current records in Google Sheets or other spreadsheets, so large data refreshes should start from spreadsheet exports rather than one-off issue comments.

Preferred intake:

- Spreadsheet exports from active players, with labeled columns.
- Raw 17-trait values whenever available.
- Total and Procreation values are optional convenience fields when full trait data is missing; they can be derived from complete trait rows.
- Character, human/player, canine call name, gender, and current availability status (`active`, `inactive`, or `unknown`).
- Source or observed date, especially when data came from delayed player tools.
- Lineage fields for sire, dam, and grandparents where known.
- Appearance fields for primary color, secondary color, and eye color.

Status matters:

- `active` canines should surface in breeding/planning tools.
- `inactive` canines remain useful history but should not be treated as current breeding candidates.
- `unknown` is acceptable for old records that are not confirmed gone.

Derived ranger metrics should be calculated from fixed formulas over the 17 traits once the active ranger community confirms them. Useful requests include tanking score, bashing score, and any other summarized subtotals players already rely on. The canonical data should keep raw traits; the app can derive preferred summary scores.

GitHub Issues are still useful for small corrections, bad records, or missing details.

## Calculator Draft Import

When the calculator has enough certain compare data to solve a pet exactly, it can generate a `canonical-canine-draft` JSON package.

That package may include:

- human
- character
- canine
- trait profile
- source observation
- comparison observations

Apply it locally with:

```powershell
npm run apply:canine-draft -- path\to\draft.json
```

The importer upserts the solved pet into canonical data and creates a null lineage stub when lineage is still unknown.

## Data Model Direction

The old tools use separate CSVs for traits and lineage. The web app should treat them as related views of the same canine rather than forcing everything into one flat table.

For the new app, repo-managed structured data is preferred over user-maintained CSV as the primary source. CSV import/export may still be useful as a compatibility feature, but it should not define the app's internal model.

Current domain model direction:

- `Human`: real player/community contact identity
- `Character`: in-game persona owned by a human
- `Canine`: individual pet owned by a character
- `TraitProfile`: 17 trait values plus total
- `LineageProfile`: parents and grandparents used for relationship checks
- `ComparisonObservation`: compare-based relationship evidence when lineage is unknown or private

Canine names are not stable identity. Some players rename each new pet; other players reuse the same name across generations because the game uses that name for commands and aliases. The app should use stable internal IDs for individual canine objects and treat names as display/command labels.

Legacy canine labels may include a quick summary such as `Mulapin Ringo 733/54`, meaning character `Mulapin`, canine call name `Ringo`, total trait score `733`, and Procreation `54`. The web app should store character, call name, total, and the 17 traits explicitly, then derive display labels from data rather than treating the display label as the canonical source.

Important breeding rule:

- A human may own unlimited characters.
- A human cannot log in multiple characters at the same time.
- Therefore, canines owned by alternate characters of the same human are not practical direct breeding partners, even if they are genetically unrelated.

The app should distinguish relationship safety from player availability:

- `Genetically unrelated`: no shared tracked parent/grandparent lineage
- `Practical breeding candidate`: genetically unrelated and owned by a different human

This keeps trait-solving, lineage checks, and real-world coordination separate while still allowing the app to combine them when useful.

## Source Projects

Legacy source repositories:

- https://github.com/IAmAnthem/CanineCalculations
- https://github.com/IAmAnthem/CanineBreeding

## Status

Current browser workflows include:

- Trait calculator
- One-breeding planner
- Multi-step population-lift planner
- Canonical data browser
- Herd-health curation
- Mate-ranking algorithms
- Ranger class and breeding guidance

Local commands are documented in `docs/local-development.md`. Publishing notes are in `docs/publishing.md`.
