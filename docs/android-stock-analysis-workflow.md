# Android-connected stock and chart analysis workflow

This document is the operating instruction set for using an Android phone as an evidence source for this investment-research repository. Android Studio may provide the ADB connection, while the repository remains the durable research and reporting system.

The objective is to evaluate a stock across four distinct horizons:

1. long-term ownership;
2. monthly/position view;
3. daily/swing view;
4. intraday execution.

Futures, options, mutual funds and portfolio suitability are added only when their required inputs are available. No chart or course rule guarantees a future outcome.

## Non-negotiable operating boundary

The connected phone is read-only by default.

Allowed without additional action authorization:

- confirm that an explicitly connected device is visible;
- inspect device metadata needed to identify it;
- capture the currently displayed screen when the user asks for chart analysis;
- pull a user-specified file or a clearly scoped exported chart/data file;
- read collected evidence and write generated analysis under `reports/`.

Never do any of the following merely because the phone is connected:

- tap Buy, Sell, Exit, Square off, Confirm or Submit;
- create, modify or cancel an order, SIP, alert or watchlist;
- transfer funds or interact with banking, UPI, broker authentication or OTP screens;
- expose passwords, PINs, tokens, account numbers, personal notifications or unrelated photos/files;
- install/uninstall applications, alter permissions, clear data, reboot the device or change settings;
- recursively copy broad phone storage or browse unrelated personal folders;
- enable wireless debugging or connect to a new device without the user's participation.

Any state-changing phone or brokerage action requires separate, explicit authorization describing the exact target and action. Analysis and a recommendation never constitute authorization to trade.

## Connection prerequisites

The user controls the phone and Android Studio setup:

1. Enable Developer options and USB debugging on the intended Android device.
2. Connect by USB and approve the computer's debugging fingerprint on the phone.
3. Keep the desired chart or evidence visible, or export it to a known folder.
4. Close or hide notifications and sensitive information that should not be captured.

Confirm one intended device is connected:

```bash
adb devices -l
```

If more than one device is listed, select the exact serial and include `-s <SERIAL>` in every command. Do not guess which device is in scope.

## Safe evidence collection

Create a ticker-specific evidence directory inside the repository. User-owned evidence belongs under `input/`; generated interpretation belongs under `reports/`.

Recommended structure:

```text
input/<TICKER>/
├── company.json
├── financials.csv
├── evidence.json
├── business.json
├── management.json
├── investment.json
├── predictions.json
├── contradictions.json
├── timeline.json
├── claims.json
├── peers.csv
├── promises.csv
├── scenarios.json
├── research.md
└── documents/
    ├── charts/
    │   ├── manifest.json
    │   └── <timestamp>-<ticker>-<timeframe>.png
    ├── annual-reports/
    ├── exchange-filings/
    └── option-chain/
```

Create the stock case first when needed:

```bash
npm run thesis -- new <TICKER>
```

Capture the currently visible screen without writing to phone storage:

```bash
adb exec-out screencap -p > input/<TICKER>/documents/charts/<TIMESTAMP>-<TICKER>-<TIMEFRAME>.png
```

Pull only an explicit exported file:

```bash
adb pull '<EXACT_PHONE_PATH>' 'input/<TICKER>/documents/charts/'
```

Do not use broad recursive pulls such as `/sdcard/`, `/storage/emulated/0/`, `DCIM/` or the phone root. If the chart requires scrolling, changing timeframe or opening indicators, ask the user to navigate, then capture the resulting screen. Automated UI control is outside the default read-only workflow.

## Required chart manifest

Every chart must be accompanied by the following metadata, supplied by the user or visibly confirmed from the screenshot:

```json
{
  "ticker": "RELIANCE",
  "exchange": "NSE",
  "instrument": "cash",
  "capturedAt": "2026-08-13T15:20:00+05:30",
  "timezone": "Asia/Kolkata",
  "timeframe": "15m",
  "visibleRange": "2026-08-11 to 2026-08-13",
  "priceAdjustment": "split-and-dividend-adjusted-or-unknown",
  "session": "regular",
  "chartType": "candlestick",
  "indicators": ["volume", "20 EMA", "VWAP"],
  "sourceApp": "broker-or-chart-app-name",
  "lastPriceStatus": "live-or-delayed-or-unknown",
  "notes": "event, position, or user question"
}
```

If ticker, exchange, capture time or timeframe is missing, do not infer a live setup. Return `insufficient input` and list what is missing.

For any actionable execution assessment, also require:

- visible price scale, time axis and complete latest candle;
- volume and relevant indicators with settings;
- current bid/ask and market depth when execution quality matters;
- existing position, average price, quantity and intended holding period;
- maximum acceptable loss in rupees and as a percentage of risk capital;
- relevant corporate/event calendar and whether the market is open;
- current costs, taxes, circuit limits and settlement constraints where material.

## Four-horizon analysis

Never collapse the four horizons into one generic Buy/Sell label.

### 1. Long-term ownership

Read the full `input/<TICKER>/` case and relevant documents. Start with the economic system: customer, payer, user, purchase influencer, channel, switching behavior, revenue mechanism, cost structure and reinvestment needs.

Evaluate:

- business quality and industry structure;
- moat mechanism, replicability, counter-evidence and durability;
- competitive position and customer/channel power;
- management credibility, governance and capital allocation;
- revenue, margins, cash conversion, leverage, returns on capital and dilution;
- valuation range and assumptions;
- management claims against independent evidence;
- bull/base/bear cases, ranked risks and observable thesis breakers.

The chart may assist entry timing but cannot establish business quality. Compatibility with approved rules is not a buy recommendation.

### 2. Monthly/position view

Use monthly candles, preferably with enough history to show multiple cycles. Evaluate primary trend, major support/resistance, regime, drawdowns, volume participation, momentum divergence and relationship with the long-term thesis/valuation.

Output whether the evidence supports accumulation review, holding/monitoring, reducing risk or waiting. Any allocation change still requires portfolio context and user-approved risk limits.

### 3. Daily/swing view

Use daily candles plus a higher timeframe for context. Evaluate trend structure, support/resistance, gaps, volume, volatility/ATR, moving averages, momentum, chart/candlestick patterns and confirmation/failure conditions.

Define before entry:

- setup and trigger;
- invalidation level;
- structural or volatility-adjusted stop;
- position size from allowed risk;
- initial target and reward-to-risk after costs;
- partial-profit and trailing rules;
- time stop and event-risk exit;
- conditions producing `no trade`.

Patterns and indicators are conditional evidence, not predictions. Never invent a target or stop from an incomplete screenshot.

### 4. Intraday view

Require a timestamped intraday chart and current market state. Use a higher timeframe for bias and a lower timeframe for execution. Evaluate session structure, overnight gap, opening range, VWAP, support/resistance, volume, volatility, liquidity, spread/depth and scheduled events.

An intraday plan must state trigger, invalidation, stop type, target/scale-out, maximum holding time, maximum trade loss and daily-loss gate. A stale screenshot cannot support a live entry. If current bid/ask, depth or risk limit is unavailable, analysis may describe structure but must say `no executable trade`.

## Futures requirements

Do not analyze or recommend a futures trade from the underlying chart alone. Require:

- exact underlying, exchange and contract month;
- futures price and timestamp;
- lot size/multiplier and tick size;
- expiry and settlement method;
- current initial/maintenance or broker margin;
- open interest, volume, spread and market depth;
- spot price, basis and relevant carry/dividend inputs;
- position quantity, available capital and maximum loss;
- rollover/expiry plan and event calendar.

Report notional exposure, leverage, basis, mark-to-market sensitivity, margin-call/liquidation scenarios, gap risk, stop mechanics and exit plan. Current exchange and broker rules override historical course examples.

## Options requirements

Never select an option using only a candlestick chart or expiry payoff diagram. Require:

- underlying chart and timestamp;
- exact expiry and all proposed strikes;
- executable bid/ask, depth, volume and open interest for every leg;
- lot size/multiplier and settlement/exercise style;
- implied volatility, IV history/skew and Greeks, or inputs to calculate them;
- interest/dividend/event inputs where material;
- margin, assignment/exercise and pin risk;
- expected direction, magnitude, timing and volatility path;
- user loss limit and planned exit time.

For every strategy, report construction, net debit/credit after costs, breakevens, maximum and stress loss, margin, delta/gamma/theta/vega, scenario P&L across spot/time/IV, liquidity/legging risk and exit/adjustment rules. If these cannot be calculated, return `insufficient input/no trade`.

## Mutual funds and ETFs

Do not recommend a fund solely from trailing return or star rating. Require goal, horizon, cash-flow plan, risk capacity, existing holdings, tax residency, liquidity needs and current scheme/portfolio data.

Evaluate mandate, benchmark TRI, underlying exposure, rolling returns, drawdowns, costs, manager/process, concentration, overlap, style/factor risk and—for debt funds—duration, credit, liquidity and yield quality. For ETFs, add spread, premium/discount, tracking, underlying liquidity and market-maker conditions.

## Mandatory report format

Write the complete output to `reports/<TICKER>/analysis.md`. Preserve deterministic snapshots and previous predictions.

Every report should contain:

1. **One-page decision memo** — decision readiness, current view by horizon, valuation requirement, major unknowns and monitoring items.
2. **Input audit** — files/charts received, timestamp, missing/stale data and validation errors.
3. **Evidence ledger** — audited facts, regulatory/external facts, management claims, analyst inferences, projections and unresolved questions.
4. **Long-term assessment** — economics, quality, moat, competition, management, governance, financials and valuation.
5. **Monthly view** — regime, levels, evidence and invalidation.
6. **Daily/swing plan** — setup, trigger, stop, size, targets, profit booking and no-trade conditions.
7. **Intraday plan** — only when live-enough inputs exist; otherwise explicitly unavailable.
8. **Derivatives analysis** — only with complete current contract/chain inputs.
9. **Adversarial debate** — strongest ownership case, strongest rejection case and neutral assessment.
10. **Bull/base/bear cases** — no invented probabilities.
11. **Risks and thesis breakers** — ranked, observable and dated where possible.
12. **Action matrix** — what evidence would justify acting, waiting, reducing risk or abandoning the thesis.
13. **Confidence** — confidence in research coverage/evidence, never “confidence that the stock will rise.”

For each horizon use this compact decision block:

```text
Horizon:
Evidence timestamp:
State: actionable | watch | insufficient input | no trade
Directional interpretation:
Supporting evidence:
Contradicting evidence:
Trigger:
Invalidation:
Stop method:
Target/profit-booking method:
Position-size input required:
Event/liquidity risks:
Research confidence and why:
```

Use conditional language: “If X occurs while Y remains valid, the setup is confirmed.” Do not say a trend or price outcome is certain.

## Terminal research sequence

After evidence collection:

```bash
npm run thesis -- validate <TICKER>
npm run thesis -- report <TICKER>
npm run thesis -- history <TICKER>
npm run thesis -- compare <TICKER>
```

Then perform the analyst review required by `AGENTS.md`, inspect source documents with page citations, and write the complete report. Never overwrite user-owned evidence in `input/` unless explicitly asked.

## Live-data and freshness rules

- Treat the phone screenshot as a dated observation, not a live feed.
- State the age of the newest price and fundamental evidence.
- Refresh current exchange, broker, tax, regulatory and product rules from authoritative sources when the decision depends on them.
- Adjust historical charts for relevant splits, bonuses, rights and dividends, or state that adjustment is unknown.
- Do not combine delayed prices with a real-time execution recommendation.
- Do not infer option IV, Greeks, OI intent, futures margin or market depth when absent.
- Do not infer the user's risk capacity from account balance or holdings visible on screen.

## Final safety and decision rule

The analyzer provides research and decision support. The user remains responsible for investment decisions and order execution.

Return `insufficient input/no trade` whenever missing data prevents calculation of downside, invalidation, executable price, position size or instrument-specific risk. A disciplined no-trade conclusion is a valid result.
