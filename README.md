# Personal Investment Intelligence System

A terminal-first workspace for turning investing sources into a traceable personal philosophy, applying that philosophy to one stock folder at a time, and discussing evidence-backed reports with an analyst.

This is deliberately **not** a stock-tip generator. Its primary output is compatibility with your own approved rules, alongside evidence completeness and unresolved questions.

## Start here

Create an input folder for a stock:

```bash
npm run thesis -- new TCS
```

Fill `input/TCS/`, add PDFs and other source documents under `input/TCS/documents/`, then run:

```bash
npm run thesis -- validate TCS
npm run thesis -- report TCS
```

The deterministic report appears at `reports/TCS/analysis.md`. Then ask:

> Analyze the stock in `input/TCS`. Inspect its documents, validate the calculations, apply my knowledge base, update the report, and discuss unresolved questions with me.

See [docs/terminal-workflow.md](docs/terminal-workflow.md) for the complete workflow.

## What works now

- Knowledge library seeded from `Finance Notes/Level-1 Fundamental Analysis.pdf`
- Source/page provenance on every seeded principle
- Review states: adopted, proposed, undecided, rejected
- Editable rule weights and philosophy decisions
- Folder-based stock evidence inbox
- Terminal commands to create, list, validate, and report a stock case
- Automatic CAGR, cash conversion, leverage, coverage, and ROCE derivation
- Markdown and JSON reports for continued analyst conversation
- Structured business/moat, management-claim, peer, promise, and scenario memory
- Evidence confidence that distinguishes audited facts, external facts, management claims, inferences, and projections
- Manual company evidence workspace in the optional web viewer
- Deterministic rule evaluation with pass/fail/investigate/not-applicable states
- Compatibility and evidence-completeness scores kept separate
- Company reports saved locally in the browser
- Decision journal with thesis, risks, expectations, and review date
- JSON export/import for portability

## Optional web viewer

```bash
npm start
```

Open [http://localhost:4000](http://localhost:4000).

No install step is required. The terminal system uses Node.js only. The optional viewer uses browser-native JavaScript and persists its UI data in `localStorage`.

## Verify

```bash
npm run check
```

## Repository map

```text
Finance Notes/              Original user-provided source PDFs
input/<TICKER>/             User-owned stock evidence and documents
reports/<TICKER>/           Generated analysis outputs
templates/company/          Starter stock-case structure
docs/                       Product decisions and schemas
scripts/thesis.mjs          Terminal research CLI
scripts/dev.mjs             Dependency-free local web server
src/data/seed.js            Source registry and reviewed seed knowledge
src/lib/engine.js           Deterministic evaluation/scoring logic
src/lib/evidence.js         Evidence-type and confidence logic
src/app.js                  Application state and interactions
knowledge/reviews/          Durable feedback and system-learning memory
tests/                      Rule-engine tests
index.html                  Application shell
styles.css                  Responsive visual system
```

## Data ownership

Files under `input/` are the primary, user-owned evidence. Analysis never overwrites them. Generated work belongs under `reports/`. The optional browser viewer has separate local storage and JSON export/import.

## Current boundary

The Fundamental Analysis PDF is the only source used for seeded philosophy. The other supplied PDFs are registered as available sources but not mixed into this long-term investing framework. Numeric thresholds in proposed rules are starting hypotheses and require user approval.

See [docs/product-spec.md](docs/product-spec.md), [docs/data-model.md](docs/data-model.md), and [docs/research-roadmap.md](docs/research-roadmap.md).
