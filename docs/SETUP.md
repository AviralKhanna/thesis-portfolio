# Setup and deployment

[Live demo](https://thesis-portfolio-rouge.vercel.app) · [Project README](../README.md)

## Serve the public demo

From the repository root:

```sh
python3 -m http.server 4010 --bind 127.0.0.1 --directory frontend
```

This serves the same static frontend as Vercel. It needs no credentials, database, or package installation.

## Research commands

Use Node.js 20.11+ (22+ recommended):

```sh
npm run check
npm run thesis -- new DEMO
npm run thesis -- validate DEMO
npm run thesis -- report DEMO
```

The research commands read `input/` and write `reports/`. The sample ITC case is included as an example of structured research. Add your own evidence and inspect validation results before drawing conclusions.

## Local API modules

`PORT=4010 npm start` starts the separate local Node backend, but the public frontend intentionally remains a fictional-data demo. It does not connect its upload or settings UI to the local APIs.

The backend's portfolio listing expects a private default snapshot at `reports/PORTFOLIO/evaluation-2026-08-14-complete.json`. That personal snapshot is not distributed. A full private portfolio setup requires supplying an appropriate snapshot and restoring a private frontend integration. The public demo and terminal research commands do not depend on that file.

Broker connection credentials belong only in your private local environment. The public Vercel site does not deploy these API modules.

## Vercel

1. Import `AviralKhanna/thesis-portfolio`, or your fork.
2. Set the root directory to the repository root and framework to **Other**.
3. Leave the build command empty and use `frontend` as the output directory, as configured in `vercel.json`.
4. Deploy without environment variables.

Only the demo frontend is served. Input documents, reports, credentials, and backend runtime storage must not be used as a public output directory.

## Contributing

Use an issue or pull request for proposed improvements. Run `npm run check` for research changes. Keep sample data clearly fictional and distinguish missing evidence from a negative business conclusion. Follow [AGENTS.md](../AGENTS.md) when using coding or research agents.
