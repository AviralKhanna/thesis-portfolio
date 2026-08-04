export const EVIDENCE_TYPES = ["audited_fact", "regulatory_fact", "external_fact", "management_claim", "analyst_inference", "projection"];
export const CONFIDENCE_LEVELS = ["high", "medium", "low", "insufficient"];

const baseConfidence = {
  audited_fact: 3,
  regulatory_fact: 3,
  external_fact: 2,
  management_claim: 1,
  analyst_inference: 1,
  projection: 0
};

export function assessConfidence(evidence = {}) {
  if (!EVIDENCE_TYPES.includes(evidence.type)) return "insufficient";
  let score = baseConfidence[evidence.type];
  if (evidence.source?.trim()) score += 1;
  if (evidence.independentCorroboration === true) score += 1;
  if (evidence.contradicted === true) score -= 2;
  if (evidence.stale === true) score -= 1;
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  if (score >= 1) return "low";
  return "insufficient";
}

export function summarizeClaims(claims = []) {
  return claims.reduce((summary, claim) => {
    const status = claim.status || "unverified";
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});
}
