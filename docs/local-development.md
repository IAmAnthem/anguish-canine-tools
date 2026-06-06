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

## Manual UI Checks

Before publishing a visible build:

- Open Calculator, Planner, Multi-Step, Data, and Guidance tabs.
- Check desktop width and a narrow mobile-like width.
- Confirm table headers, buttons, select controls, and result cards do not overlap.
- Confirm Data Browser filters remain usable while the result table scrolls.
- Confirm Multi-Step plan export/import still preserves entered puppy labels and stats.

## Production Build

```powershell
npm run build
```

The static site is written to `dist/`.
