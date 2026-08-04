# Stock input inbox

Place each company in its own ticker-named folder:

```text
input/
└── TICKER/
    ├── company.json
    ├── financials.csv
    ├── evidence.json
    ├── business.json
    ├── claims.json
    ├── peers.csv
    ├── promises.csv
    ├── scenarios.json
    ├── research.md
    └── documents/
        ├── annual-report-2026.pdf
        ├── investor-presentation.pdf
        └── concall-transcript.pdf
```

Create a complete starter folder with:

```bash
npm run thesis -- new TICKER
```

Then fill in what you know and add source documents. Empty fields are acceptable; the report will show them as missing evidence.

The extra research files are designed to prevent the analysis from remaining purely financial:

- `business.json` captures segments, industry drivers, market position, and moat evidence.
- `claims.json` separates management claims from independent verification.
- `peers.csv` supplies relative performance and valuation evidence.
- `promises.csv` tracks dated guidance against actual delivery.
- `scenarios.json` stores bull/base/bear cases, thesis breakers, and ranked risks.

Do not place multiple companies in one folder. Use a stable exchange ticker such as `TCS`, `INFY`, or `RELIANCE`.
