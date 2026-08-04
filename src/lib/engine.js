export const RESULT_SCORES = { pass: 1, investigate: 0.5, fail: 0 };

export function evaluateTest(test, value) {
  if (!test || test.type === "qualitative") return "missing";
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "missing";
  const number = Number(value);
  if (test.direction === "higher") {
    if (number >= test.good) return "pass";
    if (number >= test.investigate) return "investigate";
    return "fail";
  }
  if (test.direction === "lower") {
    if (number <= test.good) return "pass";
    if (number <= test.investigate) return "investigate";
    return "fail";
  }
  if (test.direction === "positive") return number > 0 ? "pass" : "fail";
  return "missing";
}

export function scoreResults(rules, values = {}, judgements = {}) {
  const adopted = rules.filter((rule) => rule.status === "adopted");
  const totalWeight = adopted.reduce((sum, rule) => sum + Number(rule.weight || 0), 0);
  let evaluatedWeight = 0;
  let earned = 0;
  const results = adopted.map((rule) => {
    const result = rule.test?.type === "qualitative"
      ? (judgements[rule.id] || "missing")
      : evaluateTest(rule.test, values[rule.test?.metric]);
    const weight = Number(rule.weight || 0);
    if (Object.hasOwn(RESULT_SCORES, result)) {
      evaluatedWeight += weight;
      earned += weight * RESULT_SCORES[result];
    }
    return { ruleId: rule.id, result, weight };
  });
  return {
    results,
    compatibility: evaluatedWeight ? Math.round((earned / evaluatedWeight) * 100) : null,
    completeness: totalWeight ? Math.round((evaluatedWeight / totalWeight) * 100) : 0,
    evaluated: results.filter((result) => Object.hasOwn(RESULT_SCORES, result.result)).length,
    total: adopted.length
  };
}

export function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
