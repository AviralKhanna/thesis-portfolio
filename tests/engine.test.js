import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTest, scoreResults } from "../src/lib/engine.js";

test("higher-is-better thresholds produce transparent states", () => {
  const testRule = { direction: "higher", good: 15, investigate: 8 };
  assert.equal(evaluateTest(testRule, 16), "pass");
  assert.equal(evaluateTest(testRule, 10), "investigate");
  assert.equal(evaluateTest(testRule, 4), "fail");
  assert.equal(evaluateTest(testRule, ""), "missing");
});

test("lower-is-better thresholds produce transparent states", () => {
  const testRule = { direction: "lower", good: 0.5, investigate: 1 };
  assert.equal(evaluateTest(testRule, 0.3), "pass");
  assert.equal(evaluateTest(testRule, 0.8), "investigate");
  assert.equal(evaluateTest(testRule, 1.2), "fail");
});

test("compatibility excludes missing evidence while completeness exposes it", () => {
  const rules = [
    { id: "a", status: "adopted", weight: 10, test: { type: "number", metric: "a", direction: "positive" } },
    { id: "b", status: "adopted", weight: 10, test: { type: "qualitative" } },
    { id: "c", status: "proposed", weight: 100, test: { type: "qualitative" } }
  ];
  const scored = scoreResults(rules, { a: 4 }, {});
  assert.equal(scored.compatibility, 100);
  assert.equal(scored.completeness, 50);
  assert.equal(scored.evaluated, 1);
  assert.equal(scored.total, 2);
});

test("investigate earns half weight", () => {
  const rules = [{ id: "a", status: "adopted", weight: 8, test: { type: "qualitative" } }];
  assert.equal(scoreResults(rules, {}, { a: "investigate" }).compatibility, 50);
});
