import test from "node:test";
import assert from "node:assert/strict";
import { applyAdjustments, parsePortfolioText, runPool, summarizePortfolio } from "../src/lib/portfolio-batch.js";

test("portfolio parser reads broker tab exports", () => {
  const rows = parsePortfolioText("Stock Symbol\tCompany Name\tQty\tAverage Cost Price\tCurrent Market Price\tValue At Market Price\tUnrealized Profit/Loss\tUnrealized Profit/Loss %\nAAA\tAlpha\t10\t20\t30\t300\t100\t50");
  assert.deepEqual(rows[0], { ticker: "AAA", company: "Alpha", isin: "", quantity: 10, averageCost: 20, currentPrice: 30, marketValue: 300, unrealizedPnL: 100, unrealizedPnLPct: 50 });
});

test("entitlement and cost exception produce an auditable known-cost return", () => {
  const holdings = [{ ticker: "PARENT", quantity: 10, averageCost: 100, marketValue: 500 }, { ticker: "BONUS", quantity: 5, averageCost: 0, marketValue: 200 }];
  const config = { adjustments: [{ type: "entitlement", parentTicker: "PARENT", childTicker: "CHILD", quantity: 10, price: 20, status: "expected" }], costBasisExceptions: [{ ticker: "BONUS" }] };
  const summary = summarizePortfolio(applyAdjustments(holdings, config), config);
  assert.equal(summary.marketValue, 900);
  assert.equal(summary.knownCost, 1000);
  assert.equal(summary.knownValue, 700);
  assert.equal(summary.knownReturnPct, -30);
});

test("bounded worker pool preserves item order and isolates failures", async () => {
  let active = 0;
  let peak = 0;
  const results = await runPool([1, 2, 3, 4], 2, async (item) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    if (item === 3) throw new Error("boom");
    return item * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual(results.slice(0, 2), [2, 4]);
  assert.equal(results[2].status, "failed");
  assert.equal(results[3], 8);
});

