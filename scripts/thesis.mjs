#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { rules } from "../src/data/seed.js";
import { evaluateTest, scoreResults } from "../src/lib/engine.js";
import { assessConfidence, EVIDENCE_TYPES, summarizeClaims } from "../src/lib/evidence.js";
import { analyzePeers, assessResearchConfidence, compareSnapshots, detectContradictions, summarizePredictions } from "../src/lib/memory.js";

const root = resolve(import.meta.dirname, "..");
const inputRoot = join(root, "input");
const reportRoot = join(root, "reports");
const templateRoot = join(root, "templates", "company");
const validResults = new Set(["pass", "investigate", "fail", "not_applicable", "missing"]);
const requiredColumns = ["year", "revenue", "pat", "cfo", "debt", "equity", "ebit", "interest", "roce"];

export function normalizeTicker(value = "") {
  const ticker = value.trim().toUpperCase();
  if (!/^[A-Z0-9&.-]{1,24}$/.test(ticker)) throw new Error("Ticker must contain only letters, numbers, &, dot, or hyphen.");
  return ticker;
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((item) => item.trim());
  const rows = lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => {
    const raw = line.split(",")[index]?.trim() ?? "";
    return [header, raw === "" ? null : Number(raw)];
  }))).filter((row) => row.year !== null && Object.entries(row).some(([key, value]) => key !== "year" && value !== null)).sort((a, b) => a.year - b.year);
  return { headers, rows };
}

export function parseRawCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim());
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index]?.trim() || ""]))).filter((row) => Object.values(row).some(Boolean));
}

export function cagr(first, last, years) {
  if (![first, last, years].every(Number.isFinite) || first <= 0 || last < 0 || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

export function deriveMetrics(rows) {
  if (!rows.length) return {};
  const first = rows[0];
  const latest = rows.at(-1);
  const elapsed = latest.year - first.year;
  const sum = (key) => rows.every((row) => Number.isFinite(row[key])) ? rows.reduce((total, row) => total + row[key], 0) : null;
  const totalPat = sum("pat");
  const totalCfo = sum("cfo");
  return {
    revenueCagr: cagr(first.revenue, latest.revenue, elapsed),
    profitCagr: cagr(first.pat, latest.pat, elapsed),
    cfo: latest.cfo,
    cfoPat: totalPat && totalCfo !== null ? totalCfo / totalPat : null,
    debtEquity: latest.equity ? latest.debt / latest.equity : null,
    interestCoverage: latest.interest ? latest.ebit / latest.interest : null,
    roce: latest.roce,
    years: rows.length,
    firstYear: first.year,
    latestYear: latest.year
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function optionalJson(file, fallback) { return existsSync(file) ? readJson(file) : fallback; }
async function optionalText(file, fallback = "") { return existsSync(file) ? readFile(file, "utf8") : fallback; }

export async function loadCase(tickerValue) {
  const ticker = normalizeTicker(tickerValue);
  const folder = join(inputRoot, ticker);
  if (!existsSync(folder)) throw new Error(`No case found at input/${ticker}. Create it with: npm run thesis -- new ${ticker}`);
  const [company, evidence, csv, research, business, claimData, peerCsv, promiseCsv, scenarios, management, investment, predictionData, contradictions, timeline] = await Promise.all([
    readJson(join(folder, "company.json")),
    readJson(join(folder, "evidence.json")),
    readFile(join(folder, "financials.csv"), "utf8"),
    readFile(join(folder, "research.md"), "utf8"),
    optionalJson(join(folder, "business.json"), {}),
    optionalJson(join(folder, "claims.json"), { claims: [] }),
    optionalText(join(folder, "peers.csv")),
    optionalText(join(folder, "promises.csv")),
    optionalJson(join(folder, "scenarios.json"), {}),
    optionalJson(join(folder, "management.json"), {}),
    optionalJson(join(folder, "investment.json"), {}),
    optionalJson(join(folder, "predictions.json"), { predictions: [] }),
    optionalJson(join(folder, "contradictions.json"), { contradictions: [] }),
    optionalJson(join(folder, "timeline.json"), { events: [] })
  ]);
  const parsed = parseCsv(csv);
  return { ticker, folder, company, evidence, financials: parsed.rows, headers: parsed.headers, research, business, claims: claimData.claims || [], peers: parseRawCsv(peerCsv), promises: parseRawCsv(promiseCsv), scenarios, management, investment, predictions: predictionData.predictions || [], contradictions, timeline };
}

export function validateCase(data) {
  const errors = [];
  const warnings = [];
  if (!data.company.name?.trim()) errors.push("company.json: name is required");
  if (normalizeTicker(data.company.ticker || data.ticker) !== data.ticker) errors.push(`company.json: ticker must match folder name ${data.ticker}`);
  for (const column of requiredColumns) if (!data.headers.includes(column)) errors.push(`financials.csv: missing column '${column}'`);
  if (data.financials.length < 2) warnings.push("financials.csv: fewer than two populated years; growth cannot be calculated");
  if (data.financials.some((row) => !Number.isInteger(row.year))) errors.push("financials.csv: every populated row needs an integer year");
  if (new Set(data.financials.map((row) => row.year)).size !== data.financials.length) errors.push("financials.csv: duplicate years found");
  for (const [ruleId, item] of Object.entries(data.evidence)) {
    if (!rules.some((rule) => rule.id === ruleId)) warnings.push(`evidence.json: unknown rule '${ruleId}'`);
    if (!validResults.has(item.result)) errors.push(`evidence.json: invalid result '${item.result}' for ${ruleId}`);
    if (["pass", "investigate", "fail"].includes(item.result) && !item.note?.trim()) warnings.push(`evidence.json: ${ruleId} has a result but no explanatory note`);
  }
  for (const rule of rules.filter((item) => item.status === "adopted" && item.test?.type === "qualitative")) {
    if (!data.evidence[rule.id]) warnings.push(`evidence.json: adopted qualitative rule '${rule.id}' is absent`);
  }
  for (const claim of data.claims || []) {
    if (!claim.claim?.trim()) warnings.push(`claims.json: ${claim.id || "unnamed claim"} has no claim text`);
    if (!EVIDENCE_TYPES.includes(claim.type)) errors.push(`claims.json: invalid evidence type '${claim.type}' for ${claim.id || "claim"}`);
    if (!claim.source?.trim()) warnings.push(`claims.json: ${claim.id || "claim"} has no source`);
  }
  if (!(data.peers || []).length) warnings.push("peers.csv: no peer evidence supplied");
  if (!(data.promises || []).length) warnings.push("promises.csv: no historical management promises supplied");
  const customerEvidence = (data.business?.customers || []).filter((item) => item.group?.trim());
  if (!customerEvidence.length) warnings.push("business.json: no customer or purchase-decision evidence supplied");
  const moatEvidence = Object.values(data.business?.moat || {}).filter((item) => item.assessment && item.assessment !== "missing");
  if (!moatEvidence.length) warnings.push("business.json: no moat replicability assessment supplied");
  if (!(data.business?.secondOrderEffects || []).some((item) => item.trigger?.trim())) warnings.push("business.json: no second-order causal chain supplied");
  if (!Object.values(data.management || {}).some((item) => item.assessment && item.assessment !== "missing")) warnings.push("management.json: no structured management assessment supplied");
  if (!(data.investment?.investmentCase || []).length || !(data.investment?.rejectionCase || []).length) warnings.push("investment.json: adversarial investment debate is incomplete");
  const predictionIds = (data.predictions || []).filter((item) => item.claim?.trim()).map((item) => item.id);
  if (new Set(predictionIds).size !== predictionIds.length) errors.push("predictions.json: prediction IDs must be unique");
  for (const prediction of (data.predictions || []).filter((item) => item.claim?.trim())) {
    if (!prediction.id?.trim()) errors.push("predictions.json: every populated prediction requires an ID");
    if (!["open", "correct", "incorrect", "partial", "unresolved"].includes(prediction.status)) errors.push(`predictions.json: invalid status '${prediction.status}' for ${prediction.id || "prediction"}`);
    if (prediction.probability !== null && prediction.probability !== undefined && (!Number.isFinite(prediction.probability) || prediction.probability < 0 || prediction.probability > 100)) errors.push(`predictions.json: probability for ${prediction.id} must be between 0 and 100 or null`);
    if (["correct", "incorrect", "partial"].includes(prediction.status) && !prediction.reviewedAt?.trim()) warnings.push(`predictions.json: closed prediction ${prediction.id} has no review date`);
  }
  const probabilities = [data.scenarios?.bull?.probability, data.scenarios?.base?.probability, data.scenarios?.bear?.probability].filter(Number.isFinite);
  if (probabilities.length && probabilities.length !== 3) errors.push("scenarios.json: set all three probabilities or leave all blank");
  if (probabilities.length === 3 && Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 100) > 0.01) errors.push("scenarios.json: bull/base/bear probabilities must total 100");
  return { errors, warnings };
}

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? value.toLocaleString("en-IN", { maximumFractionDigits: digits }) : "Missing";
}
function label(result) { return result === "not_applicable" ? "Not applicable" : result[0].toUpperCase() + result.slice(1); }
function tableRow(cells) { return `| ${cells.map((cell) => String(cell).replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`; }
function meaningful(items = [], key) { return items.filter((item) => key ? item?.[key]?.trim() : String(item || "").trim()); }
function bulletItems(items = [], empty = "Insufficient evidence supplied.") { return meaningful(items).length ? meaningful(items).map((item) => `- ${item}`) : [`- ${empty}`]; }

export function buildReport(data) {
  const validation = validateCase(data);
  const metrics = deriveMetrics(data.financials);
  const judgements = Object.fromEntries(Object.entries(data.evidence).map(([id, item]) => [id, item.result]));
  const score = scoreResults(rules, metrics, judgements);
  const ruleById = Object.fromEntries(rules.map((rule) => [rule.id, rule]));
  const proposed = rules.filter((rule) => rule.status === "proposed" && rule.test?.type === "number").map((rule) => ({ rule, result: evaluateTest(rule.test, metrics[rule.test.metric]) }));
  const missing = score.results.filter((item) => item.result === "missing").map((item) => ruleById[item.ruleId]);
  const concerns = [
    ...score.results.filter((item) => ["fail", "investigate"].includes(item.result)).map((item) => ({ rule: ruleById[item.ruleId], result: item.result })),
    ...proposed.filter((item) => ["fail", "investigate"].includes(item.result))
  ];
  const claimSummary = summarizeClaims(data.claims || []);
  const confidenceRows = (data.claims || []).filter((claim) => claim.claim?.trim()).map((claim) => [claim.claim, claim.type, assessConfidence(claim), claim.status || "unverified", claim.source || "Missing"]);
  const customers = meaningful(data.business?.customers, "group");
  const moatRows = Object.entries(data.business?.moat || {}).filter(([, item]) => item.assessment && item.assessment !== "missing").map(([name, item]) => [name, item.assessment, item.economicMechanism || "Missing", item.replicationTime || "unknown", item.replicationCost || "unknown", item.confidence || "insufficient"]);
  const secondOrder = meaningful(data.business?.secondOrderEffects, "trigger");
  const managementRows = Object.entries(data.management || {}).filter(([, item]) => item.assessment && item.assessment !== "missing").map(([dimension, item]) => [dimension, item.assessment, item.confidence || "insufficient", (item.evidence || []).join("; ") || "Missing"]);
  const risks = meaningful(data.scenarios?.rankedRisks, "risk");
  const researchConfidence = assessResearchConfidence(data);
  const predictionSummary = summarizePredictions(data.predictions || []);
  const contradictions = detectContradictions(data);
  const timelineEvents = meaningful(data.timeline?.events, "event").sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const peerIntelligence = analyzePeers(data.peers || [], data.ticker);
  const metricRows = [
    ["Financial history", `${metrics.years || 0} years (${metrics.firstYear || "—"}–${metrics.latestYear || "—"})`, "Input coverage"],
    ["Revenue CAGR", `${fmt(metrics.revenueCagr)}%`, "Derived from first and latest populated year"],
    ["PAT CAGR", `${fmt(metrics.profitCagr)}%`, "Derived from first and latest populated year"],
    ["Latest operating cash flow", `${fmt(metrics.cfo)} ${data.company.currency || "INR"} ${data.company.units || "crore"}`, "Latest populated year"],
    ["Cumulative CFO / PAT", `${fmt(metrics.cfoPat)}x`, "All populated years"],
    ["Debt / equity", `${fmt(metrics.debtEquity)}x`, "Latest populated year"],
    ["Interest coverage", `${fmt(metrics.interestCoverage)}x`, "Latest EBIT / interest"],
    ["ROCE", `${fmt(metrics.roce)}%`, "Latest populated year"]
  ];
  const lines = [
    `# ${data.company.name || data.ticker} (${data.ticker}) — Fundamental analysis`,
    "",
    `**Analysis date:** ${data.company.analysisDate || new Date().toISOString().slice(0, 10)}  `,
    `**Sector:** ${data.company.sector || "Missing"}  `,
    `**Industry:** ${data.company.industry || "Missing"}  `,
    "**Purpose:** Compatibility with the adopted personal philosophy; not a buy/sell recommendation.",
    "",
    "## Executive result",
    "",
    `- **Investment status:** ${data.investment?.investmentStatus || "NOT READY"}`,
    `- **Primary concern:** ${data.investment?.primaryConcern || "Insufficient evidence"}`,
    `- **Highest-priority action:** ${data.investment?.highestPriority || "Collect the highest-decision-impact missing evidence"}`,
    `- **Philosophy compatibility:** ${score.compatibility === null ? "Not enough evidence" : `${score.compatibility}%`}`,
    `- **Evidence completeness:** ${score.completeness}%`,
    `- **Adopted rules evaluated:** ${score.evaluated}/${score.total}`,
    `- **Validation:** ${validation.errors.length} errors, ${validation.warnings.length} warnings`,
    "",
    "> Compatibility excludes missing evidence. Read it together with completeness; it is not an investment recommendation.",
    "",
    "### Critical unknowns",
    "",
    ...bulletItems(data.investment?.criticalUnknowns, "No critical unknowns were structured; this is a research-process gap, not evidence that none exist."),
    "",
    "### Research confidence - derived, not subjective",
    "",
    "The percentage combines structured evidence coverage (70%) and recorded evidence quality (30%). It measures confidence in the research coverage, not confidence that the company is good.",
    "",
    tableRow(["Area", "Research confidence", "Coverage", "Evidence quality", "Requirements met"]),
    tableRow(["---", "---:", "---:", "---:", "---:"]),
    ...Object.entries(researchConfidence).map(([area, item]) => tableRow([area, `${item.confidence}%`, `${item.coverage}%`, `${item.evidenceQuality}%`, `${item.satisfied}/${item.required}`])),
    "",
    "## One-page investment memo",
    "",
    `- **Business quality:** ${data.investment?.businessQuality || "Insufficient evidence"}`,
    `- **Customer economics:** ${data.investment?.customerEconomics || "Insufficient evidence"}`,
    `- **Moat and replicability:** ${data.investment?.moatAndReplicability || "Insufficient evidence"}`,
    `- **Industry position:** ${data.investment?.industryPosition || "Insufficient evidence"}`,
    `- **Management quality:** ${data.investment?.managementQuality || "Insufficient evidence"}`,
    `- **Valuation requirement:** ${data.investment?.valuationRequirement || "Missing"}`,
    `- **Decision readiness:** ${data.investment?.decisionReadiness || "Insufficient"}`,
    `- **Final view:** ${data.investment?.finalView || "Research incomplete; not a recommendation."}`,
    "",
    "### Investment debate — strongest case for ownership",
    "",
    ...bulletItems(data.investment?.investmentCase),
    "",
    "### Rejection case — strongest reasons not to own",
    "",
    ...bulletItems(data.investment?.rejectionCase),
    "",
    "### Neutral assessment",
    "",
    data.investment?.neutralAssessment || "Insufficient evidence supplied.",
    "",
    "### Unknowns and monitoring",
    "",
    ...bulletItems(data.investment?.unknowns),
    ...bulletItems(data.investment?.monitoringItems, "No monitoring items supplied."),
    "",
    "## Customer and purchase-decision map",
    "",
    ...(customers.length ? [tableRow(["Customer group", "Who pays", "Who uses", "Who influences", "Reason to buy", "Switching trigger", "Price sensitivity", "Repeat demand", "Confidence"]), tableRow(["---", "---", "---", "---", "---", "---", "---", "---", "---"]), ...customers.map((item) => tableRow([item.group, item.payer || "Missing", item.user || "Missing", item.purchaseInfluencer || "Missing", item.reasonToBuy || "Missing", item.switchingTrigger || "Missing", item.priceSensitivity || "unknown", item.repeatDemand || "unknown", item.confidence || "insufficient"]))] : ["No structured customer evidence supplied. Do not infer pricing power without identifying who pays, uses, influences, and can switch."]),
    "",
    "## Moat replicability",
    "",
    ...(moatRows.length ? [tableRow(["Advantage", "Assessment", "Economic mechanism", "Replication time", "Replication cost", "Confidence"]), tableRow(["---", "---", "---", "---", "---", "---"]), ...moatRows.map(tableRow)] : ["No moat dimension has enough evidence for assessment. Replication time and cost must remain unknown rather than invented."]),
    "",
    "## Second-order effects",
    "",
    ...(secondOrder.length ? secondOrder.flatMap((item) => [`### Trigger: ${item.trigger}`, "", `1. Direct effect: ${item.directEffect || "Unknown"}`, `2. Competitor response: ${item.competitorResponse || "Unknown"}`, `3. Customer response: ${item.customerResponse || "Unknown"}`, `4. Channel response: ${item.channelResponse || "Unknown"}`, `5. Capital-allocation response: ${item.capitalAllocationResponse || "Unknown"}`, `6. Long-term equilibrium: ${item.longTermEquilibrium || "Unknown"}`, `7. Confidence: ${item.confidence || "insufficient"}`, ""]) : ["No second-order causal chain supplied."]),
    "## Management quality",
    "",
    ...(managementRows.length ? [tableRow(["Dimension", "Assessment", "Confidence", "Evidence"]), tableRow(["---", "---", "---", "---"]), ...managementRows.map(tableRow)] : ["No structured evidence on execution, capital allocation, guidance accuracy, acquisitions, innovation, culture, alignment, succession, disclosure, or response to mistakes."]),
    "",
    "## Cross-company intelligence",
    "",
    ...(peerIntelligence.rows.length ? [
      tableRow(["Ticker", "Period", "Revenue growth", "EBITDA margin", "ROCE", "Debt/equity", "CFO/PAT", "P/E", "Market share", "Source"]),
      tableRow(["---", "---", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---"]),
      ...peerIntelligence.rows.map((row) => tableRow([row.ticker || row.company, row.period || "Missing", row.revenueGrowth || "Missing", row.ebitdaMargin || "Missing", row.roce || "Missing", row.debtEquity || "Missing", row.cfoPat || "Missing", row.pe || "Missing", row.marketShare || "Missing", row.source || "UNSOURCED"])),
      "",
      ...Object.entries(peerIntelligence.rankings).map(([metric, item]) => `- **${metric}:** ${item.targetRank === null ? "Target company absent" : `rank ${item.targetRank}/${item.available}`} (${item.direction === "context" ? "context only; not mechanically good/bad" : `${item.direction} is mechanically favorable`}); leader ${item.leader.ticker} at ${item.leader.value}.`),
      ...(peerIntelligence.unsourced.length ? ["", `> Unsourced peer rows: ${peerIntelligence.unsourced.join(", ")}. Do not use them for conclusions until dated primary sources are added.`] : [])
    ] : ["No peer evidence supplied. Company-only performance cannot establish competitive strength."]),
    "",
    "## Prioritized risk register",
    "",
    ...(risks.length ? [tableRow(["Risk", "Probability", "Impact", "Urgency", "Evidence confidence", "Monitor", "Frequency"]), tableRow(["---", "---", "---", "---", "---", "---", "---"]), ...risks.map((item) => tableRow([item.risk, Number.isFinite(item.probability) ? `${item.probability}%` : (item.probabilityLabel || "uncalibrated"), item.impact || "unknown", item.urgency || "unknown", item.confidence || "insufficient", item.monitor || "Missing", item.monitorFrequency || "Missing"]))] : ["No prioritized risks supplied."]),
    "",
    "## Research timeline",
    "",
    ...(timelineEvents.length ? [tableRow(["Date", "Category", "Event", "Significance", "Confidence", "Source"]), tableRow(["---", "---", "---", "---", "---", "---"]), ...timelineEvents.map((item) => tableRow([item.date || "Undated", item.category || "other", item.event, item.significance || "Missing", item.confidence || "insufficient", item.source || "Missing"]))] : ["No dated research timeline supplied."]),
    "",
    "## Contradiction register",
    "",
    ...(contradictions.length ? [tableRow(["Topic", "First claim", "Contradicting evidence", "Assessment", "Materiality", "Monitor"]), tableRow(["---", "---", "---", "---", "---", "---"]), ...contradictions.map((item) => tableRow([item.topic, item.claimA?.text || "Missing", item.claimB?.text || "Missing", item.assessment || "unresolved", item.materiality || "unknown", item.monitor || "Missing"]))] : ["No explicit or automatically flagged contradictions were recorded. This does not establish narrative consistency unless competing evidence was actually collected."]),
    "",
    "## Prediction tracker",
    "",
    `- Predictions: ${predictionSummary.total}; open: ${predictionSummary.open}; due: ${predictionSummary.due.length}; scored: ${predictionSummary.scored}`,
    `- Calibration score: ${predictionSummary.accuracy === null ? "Not yet measurable" : `${predictionSummary.accuracy}%`}`,
    "",
    ...((data.predictions || []).filter((item) => item.claim?.trim()).length ? [tableRow(["ID", "Prediction", "Target date", "Probability", "Confidence", "Status", "Outcome"]), tableRow(["---", "---", "---", "---:", "---", "---", "---"]), ...(data.predictions || []).filter((item) => item.claim?.trim()).map((item) => tableRow([item.id, item.claim, item.targetDate || "Missing", Number.isFinite(item.probability) ? `${item.probability}%` : "Uncalibrated", item.confidence || "insufficient", item.status || "open", item.outcome || "Pending"]))] : ["No predictions have been registered."]),
    "",
    "## Derived financial metrics",
    "",
    tableRow(["Metric", "Value", "Basis"]), tableRow(["---", "---:", "---"]), ...metricRows.map(tableRow),
    "",
    "## Adopted philosophy evaluation",
    "",
    tableRow(["Result", "Rule", "Weight", "Evidence / note", "Knowledge source"]), tableRow(["---", "---", "---:", "---", "---"]),
    ...score.results.map((item) => {
      const rule = ruleById[item.ruleId]; const evidence = data.evidence[item.ruleId];
      const note = rule.test?.type === "number" ? `${rule.test.label}: ${fmt(metrics[rule.test.metric])}${rule.test.unit}` : (evidence?.note || "No evidence supplied");
      const source = evidence?.source || `${ruleById[item.ruleId].pages}`;
      return tableRow([label(item.result), rule.title, item.weight, note, source]);
    }),
    "",
    "## Proposed threshold observations",
    "",
    "These rules are not part of the compatibility score until you explicitly adopt them.",
    "",
    tableRow(["Observation", "Proposed rule", "Measured value", "Starting threshold"]), tableRow(["---", "---", "---:", "---"]),
    ...proposed.map(({ rule, result }) => tableRow([label(result), rule.title, `${fmt(metrics[rule.test.metric])}${rule.test.unit}`, `${rule.test.direction === "higher" ? "Good ≥" : "Good ≤"} ${rule.test.good}${rule.test.unit}`])),
    "",
    "## Concerns and investigation queue",
    "",
    ...(concerns.length ? concerns.map(({ rule, result }) => `- **${label(result)} — ${rule.title}:** ${rule.statement} _(${rule.pages})_`) : ["- No concerns were mechanically detected from the supplied evidence. This does not imply that none exist."]),
    ...(missing.length ? ["", "### Missing adopted-rule evidence", "", ...missing.map((rule) => `- ${rule.title} — ${rule.statement}`)] : []),
    "",
    "## Evidence confidence and claim verification",
    "",
    `Claim register: ${Object.entries(claimSummary).map(([key, value]) => `${key} ${value}`).join(", ") || "empty"}.`,
    "",
    ...(confidenceRows.length ? [tableRow(["Claim", "Evidence type", "Confidence", "Verification", "Source"]), tableRow(["---", "---", "---", "---", "---"]), ...confidenceRows.map(tableRow)] : ["No structured claims were supplied. Material management statements should be added to `claims.json` and independently tested."]),
    "",
    "## Business, competition, and scenarios",
    "",
    `- Business model evidence: ${Object.keys(data.business || {}).length ? "supplied" : "missing"}`,
    `- Peer records: ${(data.peers || []).length}`,
    `- Historical management promises: ${(data.promises || []).length}`,
    `- Thesis breakers: ${(data.scenarios?.thesisBreakers || []).length}`,
    `- Ranked risks: ${risks.length}`,
    `- Customer groups mapped: ${customers.length}`,
    `- Moat dimensions evidenced: ${moatRows.length}`,
    `- Second-order chains: ${secondOrder.length}`,
    "",
    "These dimensions remain outside the adopted compatibility score until their proposed rules are reviewed and explicitly adopted.",
    "",
    "## Validation notes",
    "",
    ...(validation.errors.length ? validation.errors.map((item) => `- **Error:** ${item}`) : ["- No structural errors."]),
    ...validation.warnings.map((item) => `- **Warning:** ${item}`),
    "",
    "## Research notes supplied by the user",
    "",
    data.research.trim(),
    "",
    "## Decision-linked research questions",
    "",
    ...(meaningful(data.investment?.decisionQuestions).length ? meaningful(data.investment.decisionQuestions).map((item, index) => `${index + 1}. ${item}`) : ["1. Which missing evidence would most change the conclusion?", "2. Who pays, who influences the purchase, and why can or cannot they switch?", "3. What would a capable competitor need to replicate the advantage?", "4. What is the strongest evidence against the thesis?", "5. What would falsify the investment thesis?"]),
    "",
    "---",
    `Generated deterministically from \`input/${data.ticker}/\`. A document-level analyst review should add citations, causal reasoning, moat/industry analysis, management verification, and scenarios.`
  ];
  return { markdown: lines.join("\n"), json: { company: data.company, ticker: data.ticker, validation, investmentMemo: data.investment, researchConfidence, predictionSummary, predictions: data.predictions, contradictions, timeline: timelineEvents, peerIntelligence, customerMap: customers, moatReplicability: data.business?.moat || {}, secondOrderEffects: secondOrder, management: data.management, risks, metrics, score, proposed: proposed.map(({ rule, result }) => ({ ruleId: rule.id, result })), claimSummary, evidenceConfidence: confidenceRows, researchMemory: { peers: data.peers?.length || 0, promises: data.promises?.length || 0, thesisBreakers: data.scenarios?.thesisBreakers?.length || 0, rankedRisks: risks.length } } };
}

async function createCase(tickerValue) {
  const ticker = normalizeTicker(tickerValue);
  const target = join(inputRoot, ticker);
  if (existsSync(target)) throw new Error(`input/${ticker} already exists; nothing was overwritten.`);
  await mkdir(join(target, "documents"), { recursive: true });
  for (const name of ["company.json", "financials.csv", "evidence.json", "business.json", "claims.json", "peers.csv", "promises.csv", "scenarios.json", "management.json", "investment.json", "predictions.json", "contradictions.json", "timeline.json", "research.md"]) {
    let content = await readFile(join(templateRoot, name), "utf8");
    if (name === "company.json") content = content.replace('"ticker": "TICKER"', `"ticker": "${ticker}"`).replace('"analysisDate": ""', `"analysisDate": "${new Date().toISOString().slice(0, 10)}"`);
    await writeFile(join(target, name), content);
  }
  await writeFile(join(target, "documents", ".gitkeep"), "");
  console.log(`Created input/${ticker}/\nNext: fill the templates, add source documents, then run npm run thesis -- validate ${ticker}`);
}

async function listCases() {
  const entries = await readdir(inputRoot, { withFileTypes: true });
  const cases = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  console.log(cases.length ? cases.join("\n") : "No stock cases yet. Run: npm run thesis -- new TICKER");
}

async function validateCommand(ticker) {
  const data = await loadCase(ticker); const result = validateCase(data);
  console.log(`Validated input/${data.ticker}: ${result.errors.length} errors, ${result.warnings.length} warnings`);
  result.errors.forEach((item) => console.log(`ERROR: ${item}`));
  result.warnings.forEach((item) => console.log(`WARN: ${item}`));
  if (result.errors.length) process.exitCode = 1;
}

async function reportCommand(ticker) {
  const data = await loadCase(ticker); const output = buildReport(data);
  if (output.json.validation.errors.length) throw new Error(`Cannot generate report: fix ${output.json.validation.errors.length} validation error(s) first.`);
  const target = join(reportRoot, data.ticker); const history = join(target, "history"); await mkdir(history, { recursive: true });
  const createdAt = new Date().toISOString();
  const snapshotId = createdAt.replaceAll(":", "").replaceAll("-", "").replace(".", "-");
  output.json.snapshot = { id: snapshotId, createdAt, sourceFolder: `input/${data.ticker}` };
  const snapshotMarkdown = `${output.markdown}\n\n---\nSnapshot: ${snapshotId}. This historical artifact is immutable; append a new snapshot for later evidence.\n`;
  await writeFile(join(history, `${snapshotId}.md`), snapshotMarkdown, { flag: "wx" });
  await writeFile(join(history, `${snapshotId}.json`), `${JSON.stringify(output.json, null, 2)}\n`, { flag: "wx" });
  await writeFile(join(target, "analysis.md"), output.markdown);
  await writeFile(join(target, "analysis.json"), `${JSON.stringify(output.json, null, 2)}\n`);
  console.log(`Generated reports/${data.ticker}/analysis.md\nArchived immutable snapshot ${snapshotId}\nCompatibility: ${output.json.score.compatibility ?? "insufficient evidence"}; completeness: ${output.json.score.completeness}%`);
}

async function snapshotFiles(tickerValue) {
  const ticker = normalizeTicker(tickerValue);
  const history = join(reportRoot, ticker, "history");
  if (!existsSync(history)) return [];
  return (await readdir(history)).filter((name) => name.endsWith(".json")).sort();
}

async function historyCommand(tickerValue) {
  const ticker = normalizeTicker(tickerValue); const files = await snapshotFiles(ticker);
  console.log(files.length ? files.map((name) => name.replace(/\.json$/, "")).join("\n") : `No snapshots for ${ticker}. Run: npm run thesis -- report ${ticker}`);
}

function comparisonMarkdown(ticker, comparison) {
  const metricRows = Object.entries(comparison.metrics).map(([metric, change]) => tableRow([metric, fmt(change.previous), fmt(change.current), fmt(change.absolute), change.percent === null ? "N/A" : `${fmt(change.percent)}%`]));
  return [
    `# ${ticker} - Cross-report comparison`, "",
    `**Previous snapshot:** ${comparison.previousSnapshot}  `,
    `**Current snapshot:** ${comparison.currentSnapshot}`, "",
    "## Thesis status", "",
    `- Previous: ${comparison.previousStatus}`,
    `- Current: ${comparison.currentStatus}`,
    `- Changed: ${comparison.statusChanged ? "Yes" : "No"}`, "",
    "## Metric changes", "",
    ...(metricRows.length ? [tableRow(["Metric", "Previous", "Current", "Absolute change", "% change"]), tableRow(["---", "---:", "---:", "---:", "---:"]), ...metricRows] : ["No comparable numeric metrics."]), "",
    "## Research-memory changes", "",
    "### New risks", "", ...bulletItems(comparison.newRisks, "None detected."), "",
    "### Risks no longer present", "", ...bulletItems(comparison.resolvedRisks, "None detected."), "",
    `- Prediction accuracy: ${comparison.predictionAccuracy === null ? "Not measurable" : `${comparison.predictionAccuracy}%`}`,
    `- Current contradictions: ${comparison.contradictions}`, "",
    "> A disappeared risk is not automatically resolved. Confirm the evidence before changing the thesis."
  ].join("\n");
}

async function compareCommand(tickerValue) {
  const ticker = normalizeTicker(tickerValue); const files = await snapshotFiles(ticker);
  if (files.length < 2) throw new Error(`${ticker} needs at least two snapshots. Generate a new report after adding later evidence.`);
  const history = join(reportRoot, ticker, "history");
  const [previous, current] = await Promise.all([readJson(join(history, files.at(-2))), readJson(join(history, files.at(-1)))]);
  const comparison = compareSnapshots(previous, current);
  const target = join(reportRoot, ticker);
  await writeFile(join(target, "comparison.md"), comparisonMarkdown(ticker, comparison));
  await writeFile(join(target, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
  console.log(`Compared ${files.at(-2)} -> ${files.at(-1)}\nGenerated reports/${ticker}/comparison.md`);
}

function usage() {
  console.log("Thesis terminal workflow\n\n  npm run thesis -- new <TICKER>\n  npm run thesis -- list\n  npm run thesis -- validate <TICKER>\n  npm run thesis -- report <TICKER>\n  npm run thesis -- history <TICKER>\n  npm run thesis -- compare <TICKER>");
}

if (resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [command, ticker] = process.argv.slice(2);
  try {
    if (command === "new" && ticker) await createCase(ticker);
    else if (command === "list") await listCases();
    else if (command === "validate" && ticker) await validateCommand(ticker);
    else if (command === "report" && ticker) await reportCommand(ticker);
    else if (command === "history" && ticker) await historyCommand(ticker);
    else if (command === "compare" && ticker) await compareCommand(ticker);
    else usage();
  } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; }
}
