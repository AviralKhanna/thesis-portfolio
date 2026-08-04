import { starterState, categories, metricFields } from "./data/seed.js";
import { createId, scoreResults } from "./lib/engine.js";

const STORAGE_KEY = "thesis-investment-workspace-v1";
const app = document.querySelector("#app");
const title = document.querySelector("#pageTitle");
const toast = document.querySelector("#toast");
let analysisDraft = { metrics: {}, judgements: {} };

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.version === 1 ? saved : clone(starterState);
  } catch { return clone(starterState); }
}
let state = loadState();
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function notify(message) {
  toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
function sourceFor(rule) { return state.sources.find((source) => source.id === rule.sourceId); }
function route() { return (location.hash.replace("#", "") || "dashboard").split("?")[0]; }
function statusLabel(status) { return status.replace("_", " "); }

const views = {
  dashboard() {
    const adopted = state.rules.filter((rule) => rule.status === "adopted");
    const reviewed = state.rules.filter((rule) => ["adopted", "rejected"].includes(rule.status)).length;
    const byCategory = categories.map((category) => {
      const all = state.rules.filter((rule) => rule.category === category);
      const approved = all.filter((rule) => rule.status === "adopted");
      return { category, count: approved.length, percent: all.length ? Math.round(approved.length / all.length * 100) : 0 };
    }).filter((item) => item.count);
    return `
      <section class="hero">
        <h2>Build conviction.<br><em>Keep the evidence.</em></h2>
        <p>Your notes are becoming a living investment philosophy—sourced, reviewable, and ready to apply without collapsing judgement into a black-box score.</p>
      </section>
      <section class="metric-grid">
        <div class="metric-card"><span>Knowledge items</span><strong>${state.rules.length}</strong><small>${reviewed} reviewed</small></div>
        <div class="metric-card"><span>Adopted rules</span><strong>${adopted.length}</strong><small>${state.rules.filter((r) => r.status === "proposed").length} proposals waiting</small></div>
        <div class="metric-card"><span>Company reports</span><strong>${state.analyses.length}</strong><small>Evidence snapshots</small></div>
        <div class="metric-card"><span>Decisions</span><strong>${state.decisions.length}</strong><small>Journal entries</small></div>
      </section>
      <section class="dashboard-grid">
        <div class="card">
          <div class="card-title"><div><h3>Your philosophy by category</h3><p>Adopted rules and relative coverage</p></div><a class="ghost-button" href="#philosophy">Review rules →</a></div>
          <div class="progress-list">${byCategory.map((item) => `<div class="progress-row"><span>${esc(item.category)}</span><div class="bar"><i style="width:${item.percent}%"></i></div><b>${item.count}</b></div>`).join("")}</div>
        </div>
        <div class="card">
          <div class="card-title"><div><h3>Build sequence</h3><p>The next useful milestones</p></div></div>
          <ol class="steps">
            <li class="done">Source library registered<small>8 supplied PDFs catalogued</small></li>
            <li class="done">Fundamental notes structured<small>19 traceable principles</small></li>
            <li class="${reviewed === state.rules.length ? "done" : ""}">Review proposed rules<small>${state.rules.length - reviewed} decisions remaining</small></li>
            <li class="${state.analyses.length ? "done" : ""}">Analyze the first company<small>Enter evidence, then save a snapshot</small></li>
            <li class="${state.decisions.length ? "done" : ""}">Create a decision entry<small>Preserve thesis before the outcome</small></li>
          </ol>
        </div>
      </section>`;
  },

  knowledge() {
    return `
      <section class="section-head"><div><h2>Knowledge library</h2><p>Every idea stays connected to where it came from.</p></div><span class="badge">${state.sources.length} sources</span></section>
      <div class="dashboard-grid">
        <section>
          <div class="toolbar"><input id="knowledgeSearch" type="search" placeholder="Search ideas, categories, tags…"><select id="categoryFilter"><option value="">All categories</option>${categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select><select id="kindFilter"><option value="">All types</option><option>rule</option><option>mental model</option><option>checklist</option><option>red flag</option></select></div>
          <div id="knowledgeList" class="knowledge-list">${renderKnowledge(state.rules)}</div>
        </section>
        <aside class="card"><div class="card-title"><div><h3>Source registry</h3><p>Processed and waiting material</p></div></div>${state.sources.map((source) => `<div class="source-card"><div><h4>${esc(source.title)}</h4><p>${esc(source.scope)}</p></div><span class="badge ${source.status === "processed" ? "adopted" : ""}">${esc(source.status)}</span></div>`).join("")}</aside>
      </div>`;
  },

  philosophy() {
    const adopted = state.rules.filter((rule) => rule.status === "adopted").length;
    const proposals = state.rules.filter((rule) => rule.status === "proposed").length;
    return `
      <section class="section-head"><div><h2>My philosophy</h2><p>Adopt, reject, and weight ideas. Proposed numeric thresholds are hypotheses—not facts from the source.</p></div><div><span class="badge adopted">${adopted} adopted</span> <span class="badge proposed">${proposals} proposed</span></div></section>
      <div class="toolbar"><input id="philosophySearch" type="search" placeholder="Find a rule…"><select id="statusFilter"><option value="">All review states</option><option>adopted</option><option>proposed</option><option>undecided</option><option>rejected</option></select></div>
      <div id="philosophyList" class="knowledge-list">${renderPhilosophy(state.rules)}</div>`;
  },

  analyze() {
    const adopted = state.rules.filter((rule) => rule.status === "adopted");
    const qualitative = adopted.filter((rule) => rule.test?.type === "qualitative");
    const scored = scoreResults(state.rules, analysisDraft.metrics, analysisDraft.judgements);
    return `
      <section class="section-head"><div><h2>Company analysis</h2><p>Enter only evidence you can support. Empty fields remain visibly incomplete.</p></div><button class="secondary-button" id="clearAnalysis">Clear draft</button></section>
      <div class="analysis-layout">
        <form class="card" id="analysisForm">
          <div class="card-title"><div><h3>1. Company identity</h3><p>Create an as-of-date research snapshot</p></div></div>
          <div class="form-grid">
            ${field("companyName", "Company name", analysisDraft.companyName, "e.g. Asian Paints")}
            ${field("ticker", "NSE / BSE ticker", analysisDraft.ticker, "e.g. ASIANPAINT")}
            ${field("sector", "Sector", analysisDraft.sector, "e.g. Consumer Durables")}
            ${field("asOfDate", "Analysis date", analysisDraft.asOfDate || new Date().toISOString().slice(0, 10), "", "date")}
          </div>
          <div class="card-title" style="margin-top:30px"><div><h3>2. Quantitative evidence</h3><p>Threshold rules become active only after you adopt them</p></div></div>
          <div class="form-grid">${metricFields.map((metric) => metricField(metric)).join("")}</div>
          <div class="card-title" style="margin-top:30px"><div><h3>3. Qualitative evidence</h3><p>Your judgement stays explicit and reviewable</p></div></div>
          <div class="qual-list">${qualitative.map((rule) => qualitativeField(rule)).join("") || `<div class="empty">No qualitative rules adopted.</div>`}</div>
          <div class="card-title" style="margin-top:30px"><div><h3>4. Research notes</h3><p>Capture evidence, sources, and unresolved questions</p></div></div>
          <div class="form-grid">
            ${area("businessSummary", "Business summary", analysisDraft.businessSummary, "How does the business make money?")}
            ${area("evidence", "Evidence and source references", analysisDraft.evidence, "Annual report pages, filings, calculations…")}
            ${area("risks", "Main risks", analysisDraft.risks, "What could break the thesis?")}
            ${area("questions", "Needs investigation", analysisDraft.questions, "Questions that remain unanswered")}
          </div>
          <button class="primary-button" style="margin-top:22px" type="submit">Save analysis snapshot</button>
        </form>
        <aside class="card score-panel" id="scorePanel">${renderScore(scored)}</aside>
      </div>
      <section style="margin-top:32px"><div class="section-head"><div><h2 style="font-size:30px">Saved research</h2><p>Historical snapshots remain separate from your live draft.</p></div></div>${renderAnalyses()}</section>`;
  },

  journal() {
    return `
      <section class="section-head"><div><h2>Decision journal</h2><p>Record the thesis before hindsight edits the story.</p></div><span class="badge">${state.decisions.length} entries</span></section>
      <div class="dashboard-grid">
        <form class="card" id="decisionForm">
          <div class="card-title"><div><h3>New decision snapshot</h3><p>This record is saved with its original timestamp</p></div></div>
          <div class="form-grid">
            ${field("company", "Company", "", "Company name")}${field("ticker", "Ticker", "", "NSE / BSE")}
            <div class="field"><label>Decision</label><select name="action"><option>Watch</option><option>Research further</option><option>Buy</option><option>Add</option><option>Hold</option><option>Reduce</option><option>Avoid</option><option>Sell</option></select></div>
            ${field("date", "Decision date", new Date().toISOString().slice(0, 10), "", "date")}
            ${area("thesis", "Thesis", "", "Why is this decision sensible today?")}${area("risks", "Risks consciously accepted", "", "What could make this wrong?")}
            ${area("expectations", "Expected milestones", "", "What should happen, and by when?")}${area("valuation", "Valuation and assumptions", "", "Price, intrinsic value range, key assumptions")}
            <div class="field"><label>Confidence</label><select name="confidence"><option>Low</option><option selected>Medium</option><option>High</option></select></div>
            ${field("reviewDate", "Review date", "", "", "date")}
          </div>
          <button class="primary-button" style="margin-top:22px" type="submit">Save decision</button>
        </form>
        <aside class="card"><div class="card-title"><div><h3>Journal discipline</h3><p>What makes this useful later</p></div></div><ol class="steps"><li>Write falsifiable expectations<small>Not just “good company”</small></li><li>Record accepted failures<small>Which rules did you override?</small></li><li>Set a review date<small>Revisit on evidence, not emotion</small></li><li>Append later reviews<small>Never rewrite the original thesis</small></li></ol></aside>
      </div>
      <div class="saved-list">${state.decisions.length ? state.decisions.map(renderDecision).join("") : `<div class="empty">No decisions yet. Your first entry becomes the start of the learning loop.</div>`}</div>`;
  }
};

function renderKnowledge(items) {
  return items.length ? items.map((rule) => `<article class="knowledge-card"><div><span class="badge">${esc(rule.kind)}</span><h3>${esc(rule.title)}</h3><p>${esc(rule.statement)}</p><div class="meta"><span>${esc(rule.category)}</span><span>${esc(sourceFor(rule)?.title)}</span><span>${esc(rule.pages)}</span></div></div><div><span class="badge ${rule.status}">${esc(rule.status)}</span></div></article>`).join("") : `<div class="empty">No knowledge matches these filters.</div>`;
}

function renderPhilosophy(items) {
  return items.length ? items.map((rule) => `<article class="knowledge-card"><div><span class="badge">${esc(rule.category)}</span><h3>${esc(rule.title)}</h3><p>${esc(rule.statement)}</p><div class="meta"><span>${esc(rule.kind)}</span><span>${esc(rule.pages)}</span><span>Confidence: ${esc(rule.confidence)}</span>${rule.test?.type === "number" ? `<span>Test: ${esc(rule.test.label)} (${rule.test.direction === "higher" ? "good ≥" : "good ≤"} ${rule.test.good}${esc(rule.test.unit)})</span>` : ""}</div><details><summary class="ghost-button">Why & exceptions</summary><p style="margin:8px 0"><b>Why:</b> ${esc(rule.rationale)}<br><b>Exceptions:</b> ${esc(rule.exceptions)}</p></details></div><div class="knowledge-actions"><select data-status="${rule.id}" aria-label="Review state"><option ${rule.status === "adopted" ? "selected" : ""}>adopted</option><option ${rule.status === "proposed" ? "selected" : ""}>proposed</option><option ${rule.status === "undecided" ? "selected" : ""}>undecided</option><option ${rule.status === "rejected" ? "selected" : ""}>rejected</option></select><label class="weight">Weight <input data-weight="${rule.id}" type="range" min="1" max="10" value="${rule.weight}"><b>${rule.weight}</b></label></div></article>`).join("") : `<div class="empty">No rules match these filters.</div>`;
}

function field(name, label, value = "", placeholder = "", type = "text") { return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`; }
function area(name, label, value = "", placeholder = "") { return `<div class="field full"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`; }
function metricField(metric) {
  return `<div class="field"><label for="metric-${metric.key}">${esc(metric.label)}</label><div class="unit-input"><input id="metric-${metric.key}" data-metric="${metric.key}" inputmode="decimal" type="number" step="any" value="${esc(analysisDraft.metrics[metric.key] ?? "")}"><span>${esc(metric.unit)}</span></div></div>`;
}
function qualitativeField(rule) {
  const value = analysisDraft.judgements[rule.id] || "missing";
  return `<div class="qual-row"><div><strong>${esc(rule.title)}</strong><small>${esc(rule.pages)}</small></div><select data-judgement="${rule.id}"><option value="missing" ${value === "missing" ? "selected" : ""}>No evidence yet</option><option value="pass" ${value === "pass" ? "selected" : ""}>Pass</option><option value="investigate" ${value === "investigate" ? "selected" : ""}>Investigate</option><option value="fail" ${value === "fail" ? "selected" : ""}>Fail</option><option value="not_applicable" ${value === "not_applicable" ? "selected" : ""}>Not applicable</option></select></div>`;
}

function renderScore(scored) {
  const rulesById = Object.fromEntries(state.rules.map((rule) => [rule.id, rule]));
  const score = scored.compatibility ?? 0;
  return `<div class="card-title"><div><h3>Compatibility</h3><p>Against adopted rules only</p></div></div><div class="score-ring" style="--score:${score}%"><div><strong>${scored.compatibility ?? "—"}</strong><small>${scored.compatibility == null ? "No evidence" : "percent"}</small></div></div><div class="score-pair"><div><strong>${scored.completeness}%</strong><small>Evidence complete</small></div><div><strong>${scored.evaluated}/${scored.total}</strong><small>Rules evaluated</small></div></div><div class="evaluation-list">${scored.results.map((result) => `<div class="evaluation"><span>${esc(rulesById[result.ruleId]?.title)}</span><span class="badge ${result.result}">${statusLabel(result.result)}</span></div>`).join("")}</div><p style="color:var(--muted);font-size:10px;line-height:1.5;margin:16px 0 0">Compatibility is not a recommendation. Missing evidence is excluded from the score and shown separately through completeness.</p>`;
}

function renderAnalyses() {
  return state.analyses.length ? `<div class="saved-list">${state.analyses.map((item) => `<div class="saved-row"><div><h4>${esc(item.companyName)} <small>${esc(item.ticker)}</small></h4><p>${esc(item.asOfDate)} · ${item.compatibility ?? "—"}% compatibility · ${item.completeness}% evidence complete</p></div><button class="ghost-button" data-delete-analysis="${item.id}">Delete</button></div>`).join("")}</div>` : `<div class="empty">No company analysis saved yet.</div>`;
}
function renderDecision(item) {
  return `<article class="saved-row"><div><span class="badge">${esc(item.action)}</span><h4>${esc(item.company)} <small>${esc(item.ticker)}</small></h4><p>${esc(item.date)} · ${esc(item.confidence)} confidence · Review ${esc(item.reviewDate || "not scheduled")}</p><details><summary class="ghost-button">Read original thesis</summary><p style="max-width:760px;line-height:1.6"><b>Thesis:</b> ${esc(item.thesis)}<br><b>Risks:</b> ${esc(item.risks)}<br><b>Expectations:</b> ${esc(item.expectations)}</p></details></div><button class="ghost-button" data-delete-decision="${item.id}">Delete</button></article>`;
}

function filterRules(search, category, kindOrStatus) {
  const query = search.trim().toLowerCase();
  return state.rules.filter((rule) => {
    const haystack = [rule.title, rule.statement, rule.category, rule.kind, ...(rule.tags || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!category || rule.category === category) && (!kindOrStatus || rule.kind === kindOrStatus || rule.status === kindOrStatus);
  });
}

function bindView(current) {
  if (current === "knowledge") {
    const update = () => document.querySelector("#knowledgeList").innerHTML = renderKnowledge(filterRules(document.querySelector("#knowledgeSearch").value, document.querySelector("#categoryFilter").value, document.querySelector("#kindFilter").value));
    ["knowledgeSearch", "categoryFilter", "kindFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", update));
  }
  if (current === "philosophy") {
    const list = document.querySelector("#philosophyList");
    const update = () => { list.innerHTML = renderPhilosophy(filterRules(document.querySelector("#philosophySearch").value, "", document.querySelector("#statusFilter").value)); bindPhilosophyList(); };
    document.querySelector("#philosophySearch").addEventListener("input", update);
    document.querySelector("#statusFilter").addEventListener("input", update);
    bindPhilosophyList();
  }
  if (current === "analyze") bindAnalysis();
  if (current === "journal") bindJournal();
}

function bindPhilosophyList() {
  document.querySelectorAll("[data-status]").forEach((select) => select.addEventListener("change", () => {
    state.rules.find((rule) => rule.id === select.dataset.status).status = select.value; save(); notify("Philosophy updated"); render();
  }));
  document.querySelectorAll("[data-weight]").forEach((input) => input.addEventListener("change", () => {
    state.rules.find((rule) => rule.id === input.dataset.weight).weight = Number(input.value); save(); render();
  }));
}

function captureDraft() {
  document.querySelectorAll("#analysisForm [name]").forEach((input) => { analysisDraft[input.name] = input.value; });
  document.querySelectorAll("[data-metric]").forEach((input) => { analysisDraft.metrics[input.dataset.metric] = input.value; });
  document.querySelectorAll("[data-judgement]").forEach((select) => { analysisDraft.judgements[select.dataset.judgement] = select.value; });
}
function refreshScore() {
  captureDraft();
  document.querySelector("#scorePanel").innerHTML = renderScore(scoreResults(state.rules, analysisDraft.metrics, analysisDraft.judgements));
}
function bindAnalysis() {
  document.querySelectorAll("[data-metric], [data-judgement]").forEach((input) => input.addEventListener("input", refreshScore));
  document.querySelector("#analysisForm").addEventListener("submit", (event) => {
    event.preventDefault(); captureDraft();
    if (!analysisDraft.companyName?.trim()) return notify("Add a company name before saving");
    const scored = scoreResults(state.rules, analysisDraft.metrics, analysisDraft.judgements);
    state.analyses.unshift({ id: createId("analysis"), ...clone(analysisDraft), ...scored, createdAt: new Date().toISOString() });
    save(); notify("Analysis snapshot saved"); render();
  });
  document.querySelector("#clearAnalysis").addEventListener("click", () => { analysisDraft = { metrics: {}, judgements: {} }; render(); });
  document.querySelectorAll("[data-delete-analysis]").forEach((button) => button.addEventListener("click", () => { state.analyses = state.analyses.filter((item) => item.id !== button.dataset.deleteAnalysis); save(); render(); }));
}
function bindJournal() {
  document.querySelector("#decisionForm").addEventListener("submit", (event) => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!data.company.trim() || !data.thesis.trim()) return notify("Company and thesis are required");
    state.decisions.unshift({ id: createId("decision"), ...data, createdAt: new Date().toISOString() }); save(); notify("Decision snapshot saved"); render();
  });
  document.querySelectorAll("[data-delete-decision]").forEach((button) => button.addEventListener("click", () => { state.decisions = state.decisions.filter((item) => item.id !== button.dataset.deleteDecision); save(); render(); }));
}

function render() {
  const current = views[route()] ? route() : "dashboard";
  const labels = { dashboard: "Overview", knowledge: "Knowledge", philosophy: "My philosophy", analyze: "Analyze a company", journal: "Decision journal" };
  title.textContent = labels[current];
  document.querySelectorAll("#nav a").forEach((link) => link.classList.toggle("active", link.dataset.route === current));
  app.innerHTML = views[current](); bindView(current); document.querySelector(".sidebar").classList.remove("open");
}

document.querySelector("#menuBtn").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `thesis-workspace-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); notify("Workspace exported");
});
document.querySelector("#importInput").addEventListener("change", async (event) => {
  try {
    const imported = JSON.parse(await event.target.files[0].text());
    if (imported.version !== 1 || !Array.isArray(imported.rules)) throw new Error("Unsupported workspace");
    state = imported; save(); render(); notify("Workspace imported");
  } catch (error) { notify(error.message || "Could not import workspace"); }
  event.target.value = "";
});
window.addEventListener("hashchange", render);
render();
