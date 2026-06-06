# Publishing

## GitHub Pages

This repo is configured for GitHub Pages through GitHub Actions.

Initial setup in GitHub:

1. Push `main`.
2. Open repository settings.
3. Go to `Pages`.
4. Set source to `GitHub Actions`.
5. Open the `Deploy GitHub Pages` workflow run.
6. Confirm it publishes successfully.
7. Open `https://iamanthem.github.io/anguish-canine-tools/`.

The build uses:

```powershell
npm ci
npm test
npm run build
```

The static output directory is `dist/`.
