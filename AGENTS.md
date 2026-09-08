# Investment research workflow

This repository is a terminal-first personal investment research system. The web application is an optional viewer.

When an Android phone, Android Studio, ADB, a phone screenshot, or a live chart is involved, read and follow `docs/android-stock-analysis-workflow.md` before collecting or analyzing evidence. Treat the phone as read-only by default. Analysis never authorizes tapping Buy/Sell, placing/modifying/cancelling orders, transferring funds, handling credentials/OTP, or changing phone state.

When the user asks to analyze a stock:

1. Identify the stock folder under `input/<TICKER>/`.
2. Read `company.json`, `financials.csv`, `evidence.json`, `business.json`, `management.json`, `investment.json`, `predictions.json`, `contradictions.json`, `timeline.json`, `claims.json`, `peers.csv`, `promises.csv`, `scenarios.json`, and `research.md` when present.
3. Inspect relevant files under `documents/`. Use page citations for PDFs.
4. Run `npm run thesis -- validate <TICKER>` and report missing or inconsistent inputs.
5. Run `npm run thesis -- report <TICKER>` for deterministic calculations.
6. Evaluate the evidence against `src/data/seed.js` and the user’s adopted philosophy.
7. Write the complete analyst report to `reports/<TICKER>/analysis.md`.
8. Separate audited facts, regulatory/external facts, management claims, analyst inferences, projections, and unresolved questions. Attach evidence confidence to material conclusions.
9. Never present compatibility as a buy/sell recommendation.
10. Do not silently change rule statuses, thresholds, or weights. Recommend changes for user approval.
11. Explain why trends changed and whether causes appear temporary or structural.
12. Evaluate business quality, moat replicability, industry drivers, competitive position, management capital allocation, and governance—not ratios alone.
13. Test material management claims against independent evidence. Add dated guidance to the promise tracker.
14. Present bull/base/bear cases without invented probabilities. Define observable thesis breakers and rank risks.
15. Preserve prior reports and predictions as research memory; append new evidence instead of rewriting history invisibly.
16. Start with the economic system: customer, payer, user, purchase influencer, channel, switching behavior, revenue mechanism, cost structure, and reinvestment needs. Financial statements validate the business analysis; they do not replace it.
17. For each claimed moat, state its economic mechanism, beneficiary, counter-evidence, replication requirements, time, cost, reasons replication may fail, observed durability, and confidence. Leave time/cost unknown when unsupported.
18. Trace material drivers through direct, competitor, customer, channel, capital-allocation, and long-term-equilibrium effects.
19. Write an adversarial investment debate: strongest ownership case, strongest rejection case, and neutral assessment. Do not make the bear case a superficial inversion of the bull case.
20. Generate both a comprehensive evidence report and a one-page investment memo with decision readiness, unknowns, monitoring items, valuation requirement, and final view.
21. Every generated terminal report creates an immutable dated snapshot. Compare new evidence with prior snapshots; never silently rewrite historical theses or predictions.
22. Score predictions only after their target dates using correct = 1, partial = 0.5, and incorrect = 0. Keep unresolved outcomes visible and do not exclude failed predictions.
23. Detect contradictions from explicit competing evidence, contradicted claims, and failed predictions. Absence of a detected contradiction is not proof of consistency when competing evidence is missing.
24. Research-confidence percentages must be derived from structured coverage and evidence quality. They measure confidence in the research, not confidence in the investment.
25. Keep long-term, monthly, daily/swing, and intraday conclusions separate. Do not let a lower-horizon signal silently override a higher-horizon thesis.
26. For charts, require ticker, exchange, timestamp, timezone, timeframe, price scale, visible range, adjustment status, and indicator settings. Missing identity/time metadata means `insufficient input`, not a guessed live setup.
27. Futures analysis requires the exact live contract, multiplier, expiry, price, margin, basis, liquidity, position and loss limit. Options analysis additionally requires the complete proposed-leg bid/ask/depth, IV/Greeks or calculation inputs, settlement/exercise rules and scenario horizon. The underlying chart alone is insufficient.
28. Every actionable plan must define trigger, invalidation, stop method, position-size input, profit-booking/exit method, event/liquidity risk and no-trade conditions. A screenshot is a dated observation, not a live feed.
29. Never infer risk capacity or permission to trade from balances, holdings, open positions or brokerage controls visible on the phone.

Treat files in `input/` as user-owned evidence. Do not overwrite them during analysis unless explicitly asked. Generated artifacts belong in `reports/`.
