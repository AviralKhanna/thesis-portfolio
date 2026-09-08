import { readFile } from "node:fs/promises";

function number(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text);
  const parsed = Number(text.replace(/[₹,%()+\s]/g, "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

export function parsePortfolioText(text) {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const delimiter = cleaned.includes("\t") ? "\t" : ",";
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(delimiter).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
    return {
      ticker: row["Stock Symbol"] || row.Stock || row.Symbol || row.Ticker || "",
      company: row["Company Name"] || row["Stock Name"] || row.Company || "",
      isin: row["ISIN Code"] || row.ISIN || "",
      quantity: number(row.Qty ?? row["Allocated Quantity"] ?? row.Quantity),
      averageCost: number(row["Average Cost Price"] ?? row["Average Price"] ?? row.Cost),
      currentPrice: number(row["Current Market Price"] ?? row.Price),
      marketValue: number(row["Value At Market Price"] ?? row["Market Value"]),
      unrealizedPnL: number(row["Unrealized Profit/Loss"] ?? row["Unrealized P/L"]),
      unrealizedPnLPct: number(row["Unrealized Profit/Loss %"] ?? row["P/L %"])
    };
  }).filter((row) => row.ticker || row.company);
}

export async function loadPortfolioFile(file) {
  return parsePortfolioText(await readFile(file, "utf8"));
}

export async function runPool(items, concurrency, worker) {
  const limit = Math.max(1, Math.min(Number(concurrency) || 1, items.length || 1));
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { item: items[index], status: "failed", error: error.message };
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, consume));
  return results;
}

export function applyAdjustments(holdings, config = {}) {
  const rows = holdings.map((row) => ({ ...row, adjustments: [] }));
  const byTicker = new Map(rows.map((row) => [row.ticker, row]));
  const synthetic = [];
  for (const adjustment of config.adjustments || []) {
    if (adjustment.type !== "entitlement") continue;
    const parent = byTicker.get(adjustment.parentTicker);
    if (!parent) continue;
    const quantity = number(adjustment.quantity);
    const price = number(adjustment.price);
    const marketValue = quantity * price;
    synthetic.push({
      ticker: adjustment.childTicker,
      company: adjustment.childCompany || adjustment.childTicker,
      isin: adjustment.isin || "",
      quantity,
      averageCost: null,
      currentPrice: price,
      marketValue,
      unrealizedPnL: null,
      unrealizedPnLPct: null,
      synthetic: true,
      entitlementStatus: adjustment.status || "unconfirmed",
      parentTicker: adjustment.parentTicker,
      source: adjustment.source || "",
      adjustments: []
    });
    parent.adjustments.push({ type: "entitlement_parent", childTicker: adjustment.childTicker, marketValue });
  }
  return [...rows, ...synthetic];
}

export function summarizePortfolio(holdings, config = {}) {
  const excludedCosts = new Set((config.costBasisExceptions || []).map((item) => item.ticker));
  const marketValue = holdings.reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
  const knownRows = holdings.filter((row) => !excludedCosts.has(row.ticker) && !row.synthetic);
  const knownCost = knownRows.reduce((sum, row) => sum + ((Number(row.averageCost) || 0) * (Number(row.quantity) || 0)), 0);
  const excludedValue = holdings.filter((row) => excludedCosts.has(row.ticker)).reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
  const knownValue = marketValue - excludedValue;
  const knownGain = knownValue - knownCost;
  const weights = holdings.map((row) => ({ ticker: row.ticker, weight: marketValue ? (Number(row.marketValue) || 0) / marketValue * 100 : 0 })).sort((a, b) => b.weight - a.weight);
  return {
    lines: holdings.filter((row) => !row.synthetic).length,
    securities: holdings.length,
    marketValue,
    knownCost,
    knownValue,
    knownGain,
    knownReturnPct: knownCost ? knownGain / knownCost * 100 : null,
    excludedCostTickers: [...excludedCosts],
    topThreeWeight: weights.slice(0, 3).reduce((sum, item) => sum + item.weight, 0),
    topSixWeight: weights.slice(0, 6).reduce((sum, item) => sum + item.weight, 0),
    weights
  };
}

export function batchMarkdown(batch) {
  const money = (value) => Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (value) => Number.isFinite(value) ? `${value.toFixed(2)}%` : "Insufficient";
  const rows = batch.results.map((item) => `| ${item.ticker} | ${item.status} | ${item.errors} | ${item.warnings} | ${item.reportStatus} | ${item.elapsedMs} | ${item.note || "—"} |`);
  return [
    `# Portfolio batch analysis — ${batch.createdAt.slice(0, 10)}`,
    "",
    `**Run ID:** ${batch.id}  `,
    `**Source:** ${batch.source}  `,
    `**Workers:** ${batch.concurrency}  `,
    `**Elapsed:** ${(batch.elapsedMs / 1000).toFixed(2)} seconds`,
    "",
    "## Portfolio summary",
    "",
    `- Recorded portfolio lines: **${batch.summary.lines}**`,
    `- Economic securities after configured entitlements: **${batch.summary.securities}**`,
    `- Reconciled market value: **₹${money(batch.summary.marketValue)}**`,
    `- Known-cost subportfolio return: **${pct(batch.summary.knownReturnPct)}**`,
    `- Top-three concentration: **${pct(batch.summary.topThreeWeight)}**`,
    `- Top-six concentration: **${pct(batch.summary.topSixWeight)}**`,
    `- Cost-basis exclusions: **${batch.summary.excludedCostTickers.join(", ") || "None"}**`,
    "",
    "## Processing result",
    "",
    `- Ready/generated: **${batch.counts.generated}**`,
    `- Validation-blocked: **${batch.counts.blocked}**`,
    `- Missing stock folder: **${batch.counts.missing}**`,
    `- Failed unexpectedly: **${batch.counts.failed}**`,
    "",
    "| Ticker | Status | Errors | Warnings | Report | Milliseconds | Note |",
    "|---|---|---:|---:|---|---:|---|",
    ...rows,
    "",
    "## Decision boundary",
    "",
    "This command accelerates deterministic validation and report assembly. It does not invent missing fundamental evidence, fetch live execution data, or place trades. A generated compatibility score is not a buy/sell recommendation."
  ].join("\n");
}

