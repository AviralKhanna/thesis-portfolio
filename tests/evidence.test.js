import test from "node:test";
import assert from "node:assert/strict";
import { assessConfidence, summarizeClaims } from "../src/lib/evidence.js";

test("audited sourced evidence receives high confidence", () => {
  assert.equal(assessConfidence({ type: "audited_fact", source: "Annual report p. 42" }), "high");
});

test("unsupported management guidance remains low confidence", () => {
  assert.equal(assessConfidence({ type: "management_claim", source: "MD&A" }), "medium");
  assert.equal(assessConfidence({ type: "projection", source: "MD&A" }), "low");
});

test("contradiction reduces confidence", () => {
  assert.equal(assessConfidence({ type: "external_fact", source: "Regulator", contradicted: true }), "low");
});

test("claim memory summarizes verification states", () => {
  assert.deepEqual(summarizeClaims([{ status: "supported" }, { status: "supported" }, { status: "unverified" }]), { supported: 2, unverified: 1 });
});
