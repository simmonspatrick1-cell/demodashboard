# NetSuite Demo Dashboard

A single React application (located in [`netsuite-dashboard/`](netsuite-dashboard)) that showcases a fully wired NetSuite demo experience: prospect intake, AI prompt generation, mock NetSuite sync, clipboard utilities, and export tooling — all in one place.

This repository now treats that app as the **primary** source of truth. A lightweight Express API (optional) lives at the repo root under `backend-server.js` when you need to hit a real NetSuite endpoint or mock server.

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

If you want the mock/real NetSuite API locally:

```bash
npm install          # from the repo root (installs Express backend deps)
npm run dev          # starts backend-server.js on http://localhost:3004
```

## Production Build

```bash
cd netsuite-dashboard
npm run build        # outputs to netsuite-dashboard/build
```

The repo already contains a `vercel.json` that tells Vercel to build from `netsuite-dashboard` and serve `build/` as a SPA, so running `vercel --prod` from the repo root will deploy the consolidated app.

## NetSuite RESTlet "Hello World"

Need to confirm that your NetSuite account, integration record, and TBA token are wired up before deploying the full project sync RESTlet? Upload [`netsuite-restlet-hello-world.js`](netsuite-restlet-hello-world.js) to NetSuite (SuiteScript 2.1 → RESTlet) and create a deployment in **Released** status. The script simply logs the incoming payload and responds with a JSON message so you can test both GET and POST requests with `curl` or the `test-netsuite-connection.sh` flow:

```bash
# After setting NETSUITE_REST_URL + OAuth env vars
curl "$NETSUITE_REST_URL" \
  -H "Authorization: OAuth ..." \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "success": true,
  "message": "Hello from NetSuite RESTlet (GET)",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "input": {}
}
```

Once your auth is confirmed, swap the deployment to the full [`netsuite-restlet.js`](netsuite-restlet.js) script.

## Contributing / Customizing

- All UI/state lives in `netsuite-dashboard/src/DemoDashboard.tsx`. Adjust UX, hooks, or data mocks there.
- `ScenarioGenerator.tsx`, `DataExport.tsx`, and `storage-service.ts` contain the reusable helpers for prompt generation, exports, and local persistence.
- The optional Express API is defined in `backend-server.js` with routes under `/api`. `netsuite-dashboard/src/config.ts` points to `http://localhost:3004/api` for local development.
- If you hook the dashboard to a real NetSuite backend, wire it through that API layer (or replace the mock implementation) and document any additional environment variables here.

## Questions?

Open an issue or leave a note in this README. The guiding principle is “single source of truth”, so any new feature should live under `netsuite-dashboard/` (and this file should describe how to use it).
