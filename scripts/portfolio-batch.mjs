#!/usr/bin/env node
import { availableParallelism } from "node:os";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { applyAdjustments, batchMarkdown, loadPortfolioFile, runPool, summarizePortfolio } from "../src/lib/portfolio-batch.js";
import { loadCase, validateCase, writeReportOutput } from "./thesis.mjs";

const root = resolve(import.meta.dirname, "..");

function argumentsOf(values) {
  const options = { file: null, adjustments: null, concurrency: Math.min(8, Math.max(2, availableParallelism() - 1)), report: true, resume: true };
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!value.startsWith("--") && !options.file) options.file = value;
    else if (value === "--adjustments") options.adjustments = values[++index];
    else if (value === "--concurrency") options.concurrency = Number(values[++index]);
    else if (value === "--validate-only") options.report = false;
    else if (value === "--no-resume") options.resume = false;
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  return options;
}

function usage() {
  console.log(`Portfolio batch workflow

  npm run portfolio:batch -- <portfolio.csv|xls> [options]

Options:
  --concurrency <n>       Parallel stock workers (default CPU-aware, capped at 8)
  --adjustments <json>    Corporate-action and cost-basis exception file
  --validate-only         Validate without creating stock report snapshots
  --no-resume             Regenerate valid reports even if analysis.json exists`);
}

async function main() {
  const options = argumentsOf(process.argv.slice(2));
  if (options.help || !options.file) return usage();
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 32) throw new Error("Concurrency must be an integer from 1 to 32.");
  const source = resolve(root, options.file);
  if (!existsSync(source)) throw new Error(`Portfolio file not found: ${options.file}`);
  const config = options.adjustments ? JSON.parse(await readFile(resolve(root, options.adjustments), "utf8")) : {};
  const original = await loadPortfolioFile(source);
  if (!original.length) throw new Error("No holdings could be parsed from the portfolio file.");
  const adjusted = applyAdjustments(original, config);
  const tickerRows = [...new Map(original.filter((row) => row.ticker).map((row) => [row.ticker, row])).values()];
  const start = Date.now();
  console.log(`Analyzing ${tickerRows.length} stocks with ${options.concurrency} workers…`);
  const results = await runPool(tickerRows, options.concurrency, async (holding) => {
    const itemStart = Date.now();
    const ticker = holding.ticker;
    if (!existsSync(join(root, "input", ticker))) return { ticker, status: "missing", errors: 1, warnings: 0, reportStatus: "not_run", elapsedMs: Date.now() - itemStart, note: `Create input/${ticker}` };
    const data = await loadCase(ticker);
    let identityNote = "";
    if (!data.company.name?.trim() && holding.company?.trim()) {
      data.company = { ...data.company, name: holding.company.trim(), identitySource: `${basename(source)} portfolio row` };
      identityNote = "Company identity sourced from portfolio row; input was not modified. ";
    }
    const validation = validateCase(data);
    if (validation.errors.length) return { ticker, status: "blocked", errors: validation.errors.length, warnings: validation.warnings.length, reportStatus: "not_run", elapsedMs: Date.now() - itemStart, note: identityNote + validation.errors.join("; ") };
    if (!options.report) return { ticker, status: "ready", errors: 0, warnings: validation.warnings.length, reportStatus: "validate_only", elapsedMs: Date.now() - itemStart, note: identityNote + "Validation passed" };
    const existing = join(root, "reports", ticker, "analysis.json");
    if (options.resume && existsSync(existing)) return { ticker, status: "generated", errors: 0, warnings: validation.warnings.length, reportStatus: "reused", elapsedMs: Date.now() - itemStart, note: identityNote + "Existing deterministic report reused" };
    const report = await writeReportOutput(data);
    return { ticker, status: "generated", errors: 0, warnings: validation.warnings.length, reportStatus: "generated", elapsedMs: Date.now() - itemStart, snapshotId: report.snapshotId, note: identityNote + "Immutable stock snapshot created" };
  });
  const createdAt = new Date().toISOString();
  const id = createdAt.replaceAll(":", "").replaceAll("-", "").replace(".", "-");
  const batch = {
    schemaVersion: 1,
    id,
    createdAt,
    source: basename(source),
    adjustmentsSource: options.adjustments ? basename(options.adjustments) : null,
    concurrency: options.concurrency,
    elapsedMs: Date.now() - start,
    summary: summarizePortfolio(adjusted, config),
    counts: {
      generated: results.filter((item) => ["generated", "ready"].includes(item.status)).length,
      blocked: results.filter((item) => item.status === "blocked").length,
      missing: results.filter((item) => item.status === "missing").length,
      failed: results.filter((item) => item.status === "failed").length
    },
    adjustments: config,
    holdings: adjusted,
    results
  };
  const output = join(root, "reports", "PORTFOLIO");
  const history = join(output, "batches");
  await mkdir(history, { recursive: true });
  const markdown = batchMarkdown(batch);
  await writeFile(join(history, `${id}.json`), `${JSON.stringify(batch, null, 2)}\n`, { flag: "wx" });
  await writeFile(join(history, `${id}.md`), `${markdown}\n`, { flag: "wx" });
  await writeFile(join(output, "batch-latest.json"), `${JSON.stringify(batch, null, 2)}\n`);
  await writeFile(join(output, "batch-latest.md"), `${markdown}\n`);
  console.log(`Completed in ${(batch.elapsedMs / 1000).toFixed(2)}s: ${batch.counts.generated} ready/generated, ${batch.counts.blocked} blocked, ${batch.counts.missing} missing, ${batch.counts.failed} failed.`);
  console.log("Latest report: reports/PORTFOLIO/batch-latest.md");
  if (batch.counts.failed) process.exitCode = 1;
}

main().catch((error) => { console.error(`Error: ${error.message}`); process.exitCode = 1; });
