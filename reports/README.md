# Generated reports

Terminal and analyst outputs are stored under `reports/<TICKER>/`.

- `analysis.md` — readable research report
- `analysis.json` — calculated data and rule results
- `history/<SNAPSHOT>.md|json` — immutable research snapshots
- `comparison.md|json` — deterministic comparison of the latest two snapshots

Input evidence is never written here and should remain under `input/<TICKER>/`.
