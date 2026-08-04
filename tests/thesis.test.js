import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, cagr, deriveMetrics, normalizeTicker, parseCsv, validateCase } from "../scripts/thesis.mjs";

test("ticker normalization is safe for folder names", () => {
  assert.equal(normalizeTicker(" tcs "), "TCS");
  assert.throws(() => normalizeTicker("../TCS"));
});

test("financial CSV produces derived investment metrics", () => {
  const csv = `year,revenue,pat,cfo,debt,equity,ebit,interest,roce
2021,100,10,12,30,100,20,5,15
2025,200,20,25,20,160,32,4,20`;
  const { rows } = parseCsv(csv);
  const metrics = deriveMetrics(rows);
  assert.equal(Math.round(metrics.revenueCagr * 10) / 10, 18.9);
  assert.equal(metrics.cfoPat, 37 / 30);
  assert.equal(metrics.debtEquity, 0.125);
  assert.equal(metrics.interestCoverage, 8);
  assert.equal(metrics.roce, 20);
});

test("financial CSV ignores template years with no populated evidence", () => {
  const { rows } = parseCsv("year,revenue,pat,cfo,debt,equity,ebit,interest,roce\n2025,,,,,,,,\n2026,100,10,11,0,50,15,1,20");
  assert.deepEqual(rows.map((row) => row.year), [2026]);
});

test("CAGR refuses invalid bases", () => {
  assert.equal(cagr(0, 100, 5), null);
  assert.equal(cagr(100, 200, 0), null);
});

test("validation detects identity and schema errors", () => {
  const result = validateCase({
    ticker: "TCS", company: { name: "", ticker: "INFY" }, headers: ["year"], financials: [], evidence: {}, research: ""
  });
  assert.ok(result.errors.some((item) => item.includes("name is required")));
  assert.ok(result.errors.some((item) => item.includes("ticker must match")));
  assert.ok(result.errors.some((item) => item.includes("missing column")));
});

test("business-intuition gaps remain visible instead of being guessed", () => {
  const result = validateCase({
    ticker: "TCS", company: { name: "TCS", ticker: "TCS" }, headers: ["year", "revenue", "pat", "cfo", "debt", "equity", "ebit", "interest", "roce"],
    financials: [], evidence: {}, research: "", business: {}, management: {}, investment: {}, claims: [], peers: [], promises: [], scenarios: {}
  });
  assert.ok(result.warnings.some((item) => item.includes("customer or purchase-decision")));
  assert.ok(result.warnings.some((item) => item.includes("moat replicability")));
  assert.ok(result.warnings.some((item) => item.includes("second-order")));
  assert.ok(result.warnings.some((item) => item.includes("adversarial investment debate")));
});

test("report puts investment memo and customer economics before financial metrics", () => {
  const data = {
    ticker: "TEST", company: { name: "Test Co", ticker: "TEST" },
    headers: ["year", "revenue", "pat", "cfo", "debt", "equity", "ebit", "interest", "roce"],
    financials: [{ year: 2025, revenue: 100, pat: 10, cfo: 11, debt: 0, equity: 50, ebit: 14, interest: 1, roce: 20 }, { year: 2026, revenue: 110, pat: 12, cfo: 13, debt: 0, equity: 55, ebit: 16, interest: 1, roce: 22 }],
    evidence: {}, research: "None", claims: [], peers: [], promises: [], scenarios: {}, management: {},
    business: { customers: [{ group: "Buyer", payer: "Buyer", user: "User", purchaseInfluencer: "Dealer", reasonToBuy: "Reliability", switchingTrigger: "Failure", confidence: "medium" }], moat: {}, secondOrderEffects: [] },
    investment: { investmentCase: ["Repeat demand"], rejectionCase: ["No valuation"], neutralAssessment: "Investigate" }
  };
  const report = buildReport(data).markdown;
  assert.ok(report.indexOf("## One-page investment memo") < report.indexOf("## Derived financial metrics"));
  assert.match(report, /Who pays/);
  assert.match(report, /Strongest reasons not to own/i);
});
