# NetSuite Demo Dashboard

A single React application (located in [`netsuite-dashboard/`](netsuite-dashboard)) that showcases a fully wired NetSuite demo experience: prospect intake, AI prompt generation, mock NetSuite sync, clipboard utilities, and export tooling — all in one place.

This repository now treats that app as the **only** source of truth. All earlier duplicate files, sample backends, and scattered docs have been removed so you only need to work inside the CRA project.

## Features

- Prospect workspace with search, filters, and contextual quick actions
- AI prompt + scenario builder (website analyzer, template bundles)
- Mock NetSuite field sync with status tracking
- Clipboard history, favorites, and guided checklists
- Export panel with JSON/CSV helpers

## Project Structure

```
repo/
├── README.md                # (this file)
├── vercel.json              # deploys the CRA build output
└── netsuite-dashboard/      # CRA app (all code lives here)
    ├── package.json
    ├── src/
    │   ├── DemoDashboard.tsx
    │   ├── ScenarioGenerator.tsx
    │   ├── DataExport.tsx
    │   └── ...other components/services
    └── public/
```

## Getting Started

```bash
cd netsuite-dashboard
npm install          # installs CRA dependencies
npm start            # http://localhost:3000 in development
```

## Production Build

```bash
cd netsuite-dashboard
npm run build        # outputs to netsuite-dashboard/build
```

The repo already contains a `vercel.json` that tells Vercel to build from `netsuite-dashboard` and serve `build/` as a SPA, so running `vercel --prod` from the repo root will deploy the consolidated app.

## Contributing / Customizing

- All UI/state lives in `netsuite-dashboard/src/DemoDashboard.tsx`. Adjust UX, hooks, or data mocks there.
- `ScenarioGenerator.tsx`, `DataExport.tsx`, and `storage-service.ts` contain the reusable helpers for prompt generation, exports, and local persistence.
- If you hook the dashboard to a real NetSuite backend, add the integration code directly inside the CRA app (or introduce a new directory and document it here). Avoid creating duplicate entry points in the repo so we keep things centralized.

## Questions?

Open an issue or leave a note in this README. The guiding principle is “single source of truth”, so any new feature should live under `netsuite-dashboard/` (and this file should describe how to use it).
