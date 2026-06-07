# Local Development

## Run The App

```powershell
npm install
npm run dev
```

Vite prints the local URL. If an older dev server is still running, Vite may choose the next open port.

## Verify The App

```powershell
npm run typecheck
npm test
npm run build
```

Shorter focused checks:

```powershell
npm run check:data
npm test -- tests/dataBrowser.test.ts
npm test -- tests/collarGuidance.test.ts
npm test -- tests/multiStepPlan.test.ts
```

## Import Solved Canine Drafts

When the calculator produces a `canonical-canine-draft` JSON package, apply it with:

```powershell
npm run apply:canine-draft -- path\to\draft.json
```

Use `--dry-run` first if you want a non-writing preview:

```powershell
npm run apply:canine-draft -- path\to\draft.json --dry-run
```

The importer upserts:

- `humans.json`
- `characters.json`
- `canines.json`
- `trait-profiles.json`
- `lineage-profiles.json`
- `source-observations.json`
- `comparison-observations.json`

## Manual UI Checks

Before publishing a visible build:

- Open Calculator, Planner, Multi-Step, Data, and Guidance tabs.
- Check desktop width and a narrow mobile-like width.
- Confirm table headers, buttons, select controls, and result cards do not overlap.
- Confirm Data Browser filters remain usable while the result table scrolls.
- Confirm Multi-Step plan export/import still preserves entered puppy labels and stats.
- Confirm Calculator can still produce a complete JSON draft for a solved unknown canine.
- Confirm imported solved canines show up in Data Browser and compare observations appear in the source/detail panel.

## Production Build

```powershell
npm run build
```

The static site is written to `dist/`.
