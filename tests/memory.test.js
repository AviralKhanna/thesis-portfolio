import test from "node:test";
import assert from "node:assert/strict";
import { analyzePeers, assessResearchConfidence, compareSnapshots, detectContradictions, summarizePredictions } from "../src/lib/memory.js";

test("research confidence is derived from coverage and evidence quality", () => {
  const result = assessResearchConfidence({
    financials: [{ year: 2025 }, { year: 2026, revenue: 10, pat: 1, cfo: 2, debt: 0, equity: 5, ebit: 2, interest: 0.2, roce: 20 }],
    claims: [{ type: "audited_fact", confidence: "high" }], business: {}, management: {}, investment: {}
  });
  assert.equal(result.financials.coverage, 100);
  assert.equal(result.financials.evidenceQuality, 100);
  assert.equal(result.financials.confidence, 100);
  assert.equal(result.valuation.confidence, 0);
});

test("prediction scoring gives partial outcomes half credit", () => {
  const result = summarizePredictions([
    { id: "a", claim: "A", status: "correct" },
    { id: "b", claim: "B", status: "incorrect" },
    { id: "c", claim: "C", status: "partial" },
    { id: "d", claim: "D", status: "open", targetDate: "2000-01-01" }
  ]);
  assert.equal(result.accuracy, 50);
  assert.deepEqual(result.due, ["d"]);
});

test("explicit, flagged, and failed-prediction contradictions are preserved", () => {
  const result = detectContradictions({
    contradictions: { contradictions: [{ id: "x", topic: "margin", claimA: { text: "up" }, claimB: { text: "down" } }] },
    claims: [{ id: "y", claim: "Demand strong", topic: "demand", type: "management_claim", contradicted: true }],
    predictions: [{ id: "z", claim: "Launch by FY26", status: "incorrect", outcome: "Delayed" }]
  });
  assert.equal(result.length, 3);
  assert.equal(result.at(-1).assessment, "contradicted_by_outcome");
});

test("snapshot comparison reports metric, status, and risk changes", () => {
  const result = compareSnapshots(
    { snapshot: { id: "old" }, metrics: { revenueCagr: 10 }, investmentMemo: { investmentStatus: "WATCH" }, risks: [{ risk: "Debt" }] },
    { snapshot: { id: "new" }, metrics: { revenueCagr: 12 }, investmentMemo: { investmentStatus: "READY" }, risks: [{ risk: "Dilution" }], predictionSummary: { accuracy: 75 }, contradictions: [{}] }
  );
  assert.equal(result.metrics.revenueCagr.absolute, 2);
  assert.equal(result.statusChanged, true);
  assert.deepEqual(result.newRisks, ["Dilution"]);
  assert.deepEqual(result.resolvedRisks, ["Debt"]);
  assert.equal(result.predictionAccuracy, 75);
});

test("peer intelligence ranks operating evidence but treats valuation as context", () => {
  const result = analyzePeers([
    { ticker: "AAA", roce: "20", pe: "30", source: "AR p.1" },
    { ticker: "BBB", roce: "15", pe: "10", source: "AR p.2" }
  ], "AAA");
  assert.equal(result.rankings.roce.targetRank, 1);
  assert.equal(result.rankings.pe.direction, "context");
  assert.equal(result.sourced, 2);
});
