# Terminal-first workflow

## 1. Create a stock case

```bash
npm run thesis -- new TCS
```

This creates `input/TCS/` from the repository template.

## 2. Add evidence

- Complete `company.json`.
- Add 5–10 years to `financials.csv`.
- Record qualitative rule outcomes in `evidence.json`.
- Write research context and questions in `research.md`.
- Capture the business model and moat evidence in `business.json`.
- Map the payer, user, purchase influencer, switching behavior, and channel power in `business.json`.
- Trace second-order effects in `business.json`; do not stop at the direct financial effect.
- Record management quality and incremental capital-allocation evidence in `management.json`.
- Write the adversarial debate and one-page decision summary in `investment.json`.
- Turn important management statements into testable entries in `claims.json`.
- Add comparable company evidence to `peers.csv`.
- Record dated guidance in `promises.csv`.
- Define scenarios and thesis breakers in `scenarios.json`; leave probabilities blank until consciously approved.
- Register falsifiable forecasts in `predictions.json`; later outcomes append status and evidence instead of deleting the original prediction.
- Store competing claims in `contradictions.json` and dated business/capital/governance events in `timeline.json`.
- Put annual reports, presentations, and transcripts in `documents/`.

Valid evidence results are `pass`, `investigate`, `fail`, `not_applicable`, and `missing`.

## 3. Validate

```bash
npm run thesis -- validate TCS
```

Validation catches malformed JSON, missing columns, invalid results, and incomplete identity fields without modifying the case.

## 4. Generate the deterministic report

```bash
npm run thesis -- report TCS
```

The command derives CAGR, leverage, interest coverage, cash conversion, and latest ROCE where sufficient data exists. It also generates evidence-derived research confidence, prediction calibration, contradictions, peer intelligence, a timeline, and prioritized risks. Every run archives an immutable snapshot under `reports/<TICKER>/history/` before updating the latest `analysis.md` and `analysis.json`.

## 5. Compare research over time

```bash
npm run thesis -- history TCS
npm run thesis -- compare TCS
```

`history` lists immutable snapshots. `compare` evaluates the latest two snapshots for metric changes, thesis-status changes, new and disappeared risks, prediction accuracy, and contradictions. A disappeared risk is not automatically considered resolved.

## 6. Ask for analyst review

Use a prompt such as:

> Analyze the stock in `input/TCS`. Inspect its documents, validate calculations, apply my knowledge base, write the complete report, and then discuss the unresolved questions with me.

The analyst will write to `reports/TCS/analysis.md`. Subsequent conversation can revise the report while preserving the input evidence.

## Commands

```text
npm run thesis -- new <TICKER>
npm run thesis -- list
npm run thesis -- validate <TICKER>
npm run thesis -- report <TICKER>
npm run thesis -- history <TICKER>
npm run thesis -- compare <TICKER>
```
