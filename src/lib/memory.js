const CONFIDENCE_VALUES = { insufficient: 0, low: 0.35, medium: 0.65, high: 1 };
const CLOSED_PREDICTIONS = new Set(["correct", "incorrect", "partial"]);

function present(value) {
  if (Array.isArray(value)) return value.some((item) => typeof item === "string" ? item.trim() : item && Object.values(item).some(present));
  if (value && typeof value === "object") return Object.values(value).some(present);
  return value !== null && value !== undefined && String(value).trim() !== "" && !["missing", "unknown", "insufficient", "insufficient evidence"].includes(String(value).trim().toLowerCase());
}

function confidenceScore(value) { return CONFIDENCE_VALUES[String(value || "insufficient").toLowerCase()] ?? 0; }
function coverage(checks) { return checks.length ? Math.round(checks.filter(Boolean).length / checks.length * 100) : 0; }
function evidenceQuality(items) {
  const scores = items.map((item) => confidenceScore(item?.confidence)).filter((item) => item > 0);
  return scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length * 100) : 0;
}

export function assessResearchConfidence(data = {}) {
  const rows = data.financials || [];
  const latest = rows.at(-1) || {};
  const customers = (data.business?.customers || []).filter((item) => present(item?.group));
  const moats = Object.values(data.business?.moat || {}).filter((item) => present(item?.assessment));
  const management = Object.values(data.management || {}).filter((item) => present(item?.assessment));
  const valuation = data.investment?.valuation || {};
  const areas = {
    financials: {
      checks: [rows.length >= 2, present(latest.revenue), present(latest.pat), present(latest.cfo), present(latest.debt), present(latest.equity), present(latest.ebit), present(latest.interest), present(latest.roce)],
      qualityItems: (data.claims || []).filter((item) => ["audited_fact", "regulatory_fact"].includes(item.type))
    },
    governance: {
      checks: [present(data.management?.disclosureQuality?.assessment), present(data.management?.compensationAlignment?.assessment), present(data.management?.minorityShareholderTreatment?.assessment), present(data.management?.succession?.assessment), present(data.management?.responseToMistakes?.assessment), (data.claims || []).some((item) => item.topic === "governance")],
      qualityItems: management
    },
    capitalStructure: {
      checks: [present(latest.debt), present(latest.equity), present(data.investment?.capitalStructure), (data.timeline?.events || []).some((item) => item.category === "capital_structure"), (data.claims || []).some((item) => item.topic === "capital_structure")],
      qualityItems: (data.claims || []).filter((item) => item.topic === "capital_structure")
    },
    businessQuality: {
      checks: [present(data.business?.businessModel?.revenueMechanism), customers.length > 0, moats.length > 0, present(data.business?.industryDrivers), present(data.business?.competitors), present(data.business?.marketPosition?.assessment)],
      qualityItems: [...customers, ...moats, data.business?.marketPosition].filter(Boolean)
    },
    valuation: {
      checks: [present(valuation.price), present(valuation.date), present(valuation.method), present(valuation.assumptions), present(valuation.range), present(valuation.marginOfSafety)],
      qualityItems: []
    }
  };
  return Object.fromEntries(Object.entries(areas).map(([name, area]) => [name, {
    coverage: coverage(area.checks),
    evidenceQuality: evidenceQuality(area.qualityItems),
    confidence: Math.round(coverage(area.checks) * 0.7 + evidenceQuality(area.qualityItems) * 0.3),
    satisfied: area.checks.filter(Boolean).length,
    required: area.checks.length
  }]));
}

export function summarizePredictions(predictions = []) {
  const populated = predictions.filter((item) => present(item?.claim));
  const closed = populated.filter((item) => CLOSED_PREDICTIONS.has(item.status));
  const accuracyPoints = closed.reduce((sum, item) => sum + (item.status === "correct" ? 1 : item.status === "partial" ? 0.5 : 0), 0);
  const due = populated.filter((item) => item.status === "open" && item.targetDate && new Date(item.targetDate) <= new Date());
  return {
    total: populated.length,
    open: populated.filter((item) => item.status === "open").length,
    correct: populated.filter((item) => item.status === "correct").length,
    incorrect: populated.filter((item) => item.status === "incorrect").length,
    partial: populated.filter((item) => item.status === "partial").length,
    unresolved: populated.filter((item) => item.status === "unresolved").length,
    due: due.map((item) => item.id),
    scored: closed.length,
    accuracy: closed.length ? Math.round(accuracyPoints / closed.length * 100) : null
  };
}

export function detectContradictions(data = {}) {
  const explicit = (data.contradictions?.contradictions || []).filter((item) => present(item?.topic));
  const claimFlags = (data.claims || []).filter((item) => item.contradicted === true).map((item) => ({
    id: `claim-${item.id || "unnamed"}`,
    topic: item.topic || "unspecified",
    assessment: "contradicted",
    materiality: item.materiality || "unknown",
    claimA: { text: item.claim, type: item.type, source: item.source, date: item.date },
    claimB: { text: item.note || "Contradicting evidence recorded", type: "external_fact", source: item.contradictionSource || "See claim note", date: item.reviewedAt || "" },
    note: item.note || "",
    monitor: item.monitor || ""
  }));
  const failedPredictions = (data.predictions || []).filter((item) => item.status === "incorrect").map((item) => ({
    id: `prediction-${item.id}`,
    topic: item.metric || "prediction",
    assessment: "contradicted_by_outcome",
    materiality: item.materiality || "unknown",
    claimA: { text: item.claim, type: "projection", source: "prediction register", date: item.createdAt },
    claimB: { text: item.outcome || "Prediction marked incorrect", type: "external_fact", source: (item.evidence || []).join("; ") || "prediction review", date: item.reviewedAt },
    note: "Prediction outcome contradicted the prior expectation.",
    monitor: item.monitor || ""
  }));
  return [...explicit, ...claimFlags, ...failedPredictions];
}

function delta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return { previous, current, absolute: current - previous, percent: previous === 0 ? null : (current / previous - 1) * 100 };
}

export function compareSnapshots(previous = {}, current = {}) {
  const metricKeys = new Set([...Object.keys(previous.metrics || {}), ...Object.keys(current.metrics || {})]);
  const metrics = Object.fromEntries([...metricKeys].map((key) => [key, delta(current.metrics?.[key], previous.metrics?.[key])]).filter(([, value]) => value));
  const previousRisks = new Set((previous.risks || []).map((item) => item.risk || item));
  const currentRisks = new Set((current.risks || []).map((item) => item.risk || item));
  return {
    previousSnapshot: previous.snapshot?.id || previous.company?.analysisDate || "previous",
    currentSnapshot: current.snapshot?.id || current.company?.analysisDate || "current",
    metrics,
    statusChanged: previous.investmentMemo?.investmentStatus !== current.investmentMemo?.investmentStatus,
    previousStatus: previous.investmentMemo?.investmentStatus || "unknown",
    currentStatus: current.investmentMemo?.investmentStatus || "unknown",
    newRisks: [...currentRisks].filter((item) => !previousRisks.has(item)),
    resolvedRisks: [...previousRisks].filter((item) => !currentRisks.has(item)),
    predictionAccuracy: current.predictionSummary?.accuracy ?? null,
    contradictions: current.contradictions?.length || 0
  };
}

export function analyzePeers(rows = [], targetTicker = "") {
  const populated = rows.filter((row) => row.ticker || row.company);
  const metrics = {
    revenueGrowth: "higher", ebitdaMargin: "higher", roce: "higher", debtEquity: "lower", cfoPat: "higher",
    pe: "context", pb: "context", marketShare: "higher"
  };
  const rankings = {};
  for (const [metric, direction] of Object.entries(metrics)) {
    const comparable = populated.map((row) => ({ ticker: row.ticker || row.company, value: Number(row[metric]) })).filter((item) => Number.isFinite(item.value));
    if (!comparable.length) continue;
    const ordered = [...comparable].sort((a, b) => direction === "lower" ? a.value - b.value : b.value - a.value);
    const targetIndex = ordered.findIndex((item) => item.ticker.toUpperCase() === targetTicker.toUpperCase());
    rankings[metric] = { direction, available: comparable.length, targetRank: targetIndex < 0 ? null : targetIndex + 1, targetValue: targetIndex < 0 ? null : ordered[targetIndex].value, leader: ordered[0] };
  }
  return {
    rows: populated,
    rankings,
    sourced: populated.filter((row) => row.source?.trim()).length,
    unsourced: populated.filter((row) => !row.source?.trim()).map((row) => row.ticker || row.company)
  };
}
