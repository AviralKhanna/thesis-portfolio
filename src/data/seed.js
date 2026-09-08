export const sources = [
  { id: "user-review-v2", title: "Business-intuition and investment-memo review", kind: "user framework", file: "Conversation, 2026-08-03", status: "processed", pageCount: null, scope: "Customer economics, moat replicability, second-order effects, adversarial debate, calibrated probability, and portfolio-manager memo", addedAt: "2026-08-03" },
  { id: "user-review-v1", title: "Investment system review and professional-research roadmap", kind: "user framework", file: "Conversation, 2026-08-03", status: "processed", pageCount: null, scope: "Investor reasoning, business quality, external validation, scenarios, and learning", addedAt: "2026-08-03" },
  { id: "zerodha-fa", title: "Fundamental Analysis", kind: "course notes", file: "Finance Notes/Level-1 Fundamental Analysis.pdf", status: "processed", pageCount: 172, scope: "Core long-term investing source", addedAt: "2026-08-03" },
  { id: "intro", title: "Introduction", kind: "course notes", file: "Finance Notes/Level-0 Introduction.pdf", status: "processed", pageCount: 111, scope: "Market structure, execution, settlement, corporate actions, and integrated point-of-view foundation", addedAt: "2026-08-03" },
  { id: "technical", title: "Technical Analysis", kind: "course notes", file: "Finance Notes/Level-2 Technical Analysis.pdf", status: "processed", pageCount: 177, scope: "Short-horizon trading and execution; excluded from core long-term compatibility scoring", addedAt: "2026-08-03" },
  { id: "futures", title: "Future Trading", kind: "course notes", file: "Finance Notes/Level-3 Future Trading.pdf", status: "processed", pageCount: 131, scope: "Futures mechanics, leverage, margin, settlement, hedging, and risk", addedAt: "2026-08-03" },
  { id: "options", title: "Option Trading", kind: "course notes", file: "Finance Notes/Level-4 Option Trading.pdf", status: "processed", pageCount: 239, scope: "Option payoff, pricing inputs, Greeks, volatility, and chain analysis", addedAt: "2026-08-03" },
  { id: "strategies", title: "Options Strategy", kind: "course notes", file: "Finance Notes/Level-5 Options Strategy.pdf", status: "processed", pageCount: 146, scope: "Multi-leg option construction, payoff, scenario, and risk rules", addedAt: "2026-08-03" },
  { id: "mutual-funds", title: "Mutual Funds", kind: "course notes", file: "Finance Notes/Level-6 Mutual Funds.pdf", status: "processed", pageCount: 426, scope: "Fund selection, debt, performance, portfolio construction, asset allocation, and ETFs", addedAt: "2026-08-03" },
  { id: "finance", title: "Finance", kind: "course notes", file: "Finance Notes/Level-7 Finance.pdf", status: "processed", pageCount: 60, scope: "Health-insurance contracts and financial-resilience prerequisites", addedAt: "2026-08-03" }
];

export const categories = ["Mindset", "Business", "Competition", "Industry", "Management", "Strategy", "Annual report", "Profitability", "Balance sheet", "Cash flow", "Efficiency", "Valuation", "Governance"];

export const rules = [
  {
    id: "long-term-mindset", title: "Evaluate as a long-term owner", category: "Mindset", kind: "mental model",
    statement: "Separate short-term price noise from underlying business performance and evaluate investments over a multi-year horizon.",
    rationale: "Fundamental analysis is intended to build conviction through business performance rather than short-term prediction.",
    sourceId: "zerodha-fa", pages: "PDF pp. 2-7", status: "adopted", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "A thesis-breaking event still requires immediate review.", tags: ["ownership", "time horizon"]
  },
  {
    id: "qual-and-quant", title: "Use qualitative and quantitative evidence", category: "Mindset", kind: "checklist",
    statement: "Evaluate every investment on both qualitative and quantitative dimensions.",
    rationale: "Financial statements describe numeric performance; business quality and management context explain how it was produced.",
    sourceId: "zerodha-fa", pages: "PDF pp. 8-14", status: "adopted", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "None; missing either side reduces evidence completeness.", tags: ["evidence"]
  },
  {
    id: "understand-business", title: "Understand the business thoroughly", category: "Business", kind: "rule",
    statement: "Do not complete due diligence until the company’s operations, revenue drivers, customers, industry, and risks are understood.",
    rationale: "A stock idea is only the beginning; business understanding precedes checklist and valuation work.",
    sourceId: "zerodha-fa", pages: "PDF pp. 132-140", status: "adopted", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Financial businesses require a sector-specific framework.", tags: ["circle of competence"]
  },
  {
    id: "annual-report-primary", title: "Use the annual report as primary evidence", category: "Annual report", kind: "checklist",
    statement: "Read the annual report and prefer it as the primary source of company-specific information.",
    rationale: "It is the company’s official communication and contains both qualitative discussion and audited statements.",
    sourceId: "zerodha-fa", pages: "PDF pp. 15-26", status: "adopted", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Cross-check company claims with independent and regulatory sources.", tags: ["primary source"]
  },
  {
    id: "mda-review", title: "Review management discussion and outlook", category: "Annual report", kind: "checklist",
    statement: "Examine what management says went right, went wrong, and what it expects in the year ahead.",
    rationale: "The MD&A provides management’s view of the economy, industry, performance, risks, and outlook.",
    sourceId: "zerodha-fa", pages: "PDF pp. 15-26", status: "adopted", confidence: "high", weight: 7,
    test: { type: "qualitative" }, exceptions: "Treat promotional language as a claim to verify, not evidence by itself.", tags: ["management", "outlook"]
  },
  {
    id: "consolidated-default", title: "Prefer consolidated statements", category: "Annual report", kind: "rule",
    statement: "Use consolidated financials when subsidiaries materially contribute to the group.",
    rationale: "Standalone numbers exclude subsidiaries and can provide an incomplete view of the economic entity.",
    sourceId: "zerodha-fa", pages: "PDF pp. 15-26", status: "adopted", confidence: "high", weight: 6,
    test: { type: "qualitative" }, exceptions: "Use standalone statements as an additional lens when parent-only obligations matter.", tags: ["subsidiaries"]
  },
  {
    id: "revenue-growth", title: "Sustained revenue growth", category: "Profitability", kind: "rule",
    statement: "Prefer companies with healthy multi-year revenue growth rather than dependence on a single strong year.",
    rationale: "Revenue is the operating top line; trend analysis is more informative than a standalone value.",
    sourceId: "zerodha-fa", pages: "PDF pp. 27-33, 92-107", status: "proposed", confidence: "medium", weight: 7,
    test: { type: "number", metric: "revenueCagr", label: "5Y revenue CAGR", unit: "%", direction: "higher", good: 15, investigate: 8 },
    exceptions: "Threshold should vary for mature, cyclical, commodity, and financial businesses.", tags: ["growth", "proposed threshold"]
  },
  {
    id: "profit-growth", title: "Profit growth supports expansion", category: "Profitability", kind: "rule",
    statement: "Look for multi-year profit growth that broadly supports revenue expansion.",
    rationale: "Revenue growth without profit development may indicate pressure on costs, pricing, or business economics.",
    sourceId: "zerodha-fa", pages: "PDF pp. 27-43, 92-107", status: "proposed", confidence: "medium", weight: 7,
    test: { type: "number", metric: "profitCagr", label: "5Y PAT CAGR", unit: "%", direction: "higher", good: 15, investigate: 8 },
    exceptions: "Investment phases and temporary cycles require explanation.", tags: ["growth", "proposed threshold"]
  },
  {
    id: "roe-debt", title: "Do not read ROE without leverage", category: "Profitability", kind: "mental model",
    statement: "A high ROE accompanied by high debt is not automatically a sign of business quality.",
    rationale: "Leverage can inflate shareholder returns; use DuPont decomposition and review debt together.",
    sourceId: "zerodha-fa", pages: "PDF pp. 92-107", status: "adopted", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Banks and other leveraged financial institutions need sector-specific capital measures.", tags: ["ROE", "leverage"]
  },
  {
    id: "roce", title: "Capital employed earns an adequate return", category: "Profitability", kind: "rule",
    statement: "Prefer businesses that generate attractive returns on the debt and equity capital employed.",
    rationale: "ROCE connects operating performance to the total long-term capital required by the business.",
    sourceId: "zerodha-fa", pages: "PDF pp. 92-107", status: "proposed", confidence: "medium", weight: 9,
    test: { type: "number", metric: "roce", label: "ROCE", unit: "%", direction: "higher", good: 18, investigate: 12 },
    exceptions: "Capital-intensive and early expansion businesses require cycle-aware comparisons.", tags: ["returns", "proposed threshold"]
  },
  {
    id: "debt-equity", title: "Keep financial leverage controlled", category: "Balance sheet", kind: "rule",
    statement: "Investigate businesses whose debt is large relative to shareholder equity.",
    rationale: "Debt-to-equity describes the financing mix and must be read with debt-service capacity.",
    sourceId: "zerodha-fa", pages: "PDF pp. 108-120", status: "proposed", confidence: "medium", weight: 10,
    test: { type: "number", metric: "debtEquity", label: "Debt / equity", unit: "x", direction: "lower", good: 0.5, investigate: 1 },
    exceptions: "Not suitable for banks; utilities and infrastructure may operate with structurally higher leverage.", tags: ["debt", "proposed threshold"]
  },
  {
    id: "interest-cover", title: "Maintain comfortable interest coverage", category: "Balance sheet", kind: "rule",
    statement: "Operating earnings should cover finance costs with a meaningful buffer.",
    rationale: "Interest coverage tests the company’s EBIT-level ability to service debt costs.",
    sourceId: "zerodha-fa", pages: "PDF pp. 108-120", status: "proposed", confidence: "medium", weight: 10,
    test: { type: "number", metric: "interestCoverage", label: "Interest coverage", unit: "x", direction: "higher", good: 5, investigate: 2.5 },
    exceptions: "Use normalized EBIT for cyclical companies and sector capital measures for financials.", tags: ["debt service", "proposed threshold"]
  },
  {
    id: "operating-cash", title: "Operating activity generates cash", category: "Cash flow", kind: "rule",
    statement: "Give special attention to whether core operations generate positive cash.",
    rationale: "The cash-flow statement reveals the company’s true cash movement across operating, investing, and financing activities.",
    sourceId: "zerodha-fa", pages: "PDF pp. 64-75", status: "adopted", confidence: "high", weight: 10,
    test: { type: "number", metric: "cfo", label: "Latest operating cash flow", unit: "₹ Cr", direction: "positive" },
    exceptions: "One negative period may reflect deliberate working-capital investment; persistent weakness needs explanation.", tags: ["cash quality"]
  },
  {
    id: "cfo-pat", title: "Cash flow supports reported profit", category: "Cash flow", kind: "red flag",
    statement: "Investigate persistent divergence when operating cash flow does not support accounting profit.",
    rationale: "Profit is an accounting estimate while operating cash flow shows cash generated by core activities.",
    sourceId: "zerodha-fa", pages: "PDF pp. 27-43, 64-75", status: "proposed", confidence: "medium", weight: 10,
    test: { type: "number", metric: "cfoPat", label: "5Y cumulative CFO / PAT", unit: "x", direction: "higher", good: 1, investigate: 0.7 },
    exceptions: "Fast growth can temporarily consume working capital; investigate receivables and inventory.", tags: ["earnings quality", "proposed threshold"]
  },
  {
    id: "working-capital", title: "Monitor working-capital efficiency", category: "Efficiency", kind: "red flag",
    statement: "Track inventory days and receivable days over time and compare them with peers.",
    rationale: "Ratios are meaningful through trends and peer comparison; rising days can tie up cash or reveal collection issues.",
    sourceId: "zerodha-fa", pages: "PDF pp. 108-120", status: "adopted", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "Seasonality and changing product/channel mix can alter working-capital patterns.", tags: ["inventory", "receivables"]
  },
  {
    id: "ratio-context", title: "Never interpret a ratio in isolation", category: "Efficiency", kind: "mental model",
    statement: "Study a ratio’s trend and compare it with suitable peers before forming an opinion.",
    rationale: "A standalone ratio conveys little without history, business context, and comparable companies.",
    sourceId: "zerodha-fa", pages: "PDF pp. 76-120", status: "adopted", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Peer accounting and business mix must be comparable.", tags: ["context", "peers"]
  },
  {
    id: "valuation-after-quality", title: "Value the business after due diligence", category: "Valuation", kind: "checklist",
    statement: "Understand the business and financial performance before estimating intrinsic value.",
    rationale: "Due diligence progresses from business understanding to financial checklist to valuation.",
    sourceId: "zerodha-fa", pages: "PDF pp. 132-140", status: "adopted", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "A quick valuation screen can prioritize research but should not replace it.", tags: ["process"]
  },
  {
    id: "valuation-caution", title: "Treat valuation as an estimate", category: "Valuation", kind: "mental model",
    statement: "Use conservative assumptions and an intrinsic-value range rather than a falsely precise point estimate.",
    rationale: "DCF depends on interwoven assumptions about cash flow, growth, time value, terminal value, and net debt.",
    sourceId: "zerodha-fa", pages: "PDF pp. 145-167", status: "adopted", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "The size of the uncertainty band should reflect business predictability, not a fixed universal percentage.", tags: ["DCF", "margin of safety"]
  },
  {
    id: "checklist-evolves", title: "Continuously improve the checklist", category: "Mindset", kind: "mental model",
    statement: "Revise the investment checklist as experience reveals missing questions and recurring mistakes.",
    rationale: "The notes explicitly describe the checklist as something an investor should improve with experience.",
    sourceId: "zerodha-fa", pages: "PDF pp. 132-140", status: "adopted", confidence: "high", weight: 6,
    test: { type: "qualitative" }, exceptions: "Changes should be deliberate and documented rather than reactions to one outcome.", tags: ["learning loop"]
  },
  {
    id: "explain-causal-change", title: "Explain why financial trends changed", category: "Business", kind: "rule",
    statement: "Do not stop at what changed; identify whether the cause was volume, price, mix, market share, costs, working capital, accounting, or a one-time event.",
    rationale: "Investor reasoning requires causal explanations and a view on whether the driver is temporary or structural.",
    sourceId: "user-review-v1", pages: "Problem 1; Phase 1", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Use 'insufficient evidence' when causality cannot be established; do not manufacture an explanation.", tags: ["causality", "trend"]
  },
  {
    id: "moat-evidence", title: "Require evidence for competitive advantage", category: "Competition", kind: "rule",
    statement: "Assess brand, distribution, switching costs, scale, cost position, technology, patents, network effects, and regulatory advantages using evidence.",
    rationale: "Business quality and durability cannot be inferred from financial ratios alone.",
    sourceId: "user-review-v1", pages: "Problems 2 and 6; Phase 2", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "A claimed advantage is not a moat until persistence and competitor difficulty are demonstrated.", tags: ["moat", "business quality"]
  },
  {
    id: "peer-comparison", title: "Compare against suitable competitors", category: "Competition", kind: "checklist",
    statement: "Compare growth, margins, returns, debt, cash flow, valuation, market share, and strategic progress with genuinely comparable peers.",
    rationale: "Company-only trends cannot establish whether a business is winning or losing competitively.",
    sourceId: "user-review-v1", pages: "Problem 3; Phase 4", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Explain differences in segment mix and accounting before ranking peers.", tags: ["peers", "relative performance"]
  },
  {
    id: "industry-driver-map", title: "Map the industry drivers", category: "Industry", kind: "checklist",
    statement: "Evaluate market growth, technology shifts, commodity inputs, regulation, customer demand, capacity, pricing, and substitution risk.",
    rationale: "A business operates inside an industry system; internal numbers alone cannot explain future economics.",
    sourceId: "user-review-v1", pages: "Problem 5; Phase 2", status: "proposed", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Use primary external sources and date every industry claim.", tags: ["industry", "drivers"]
  },
  {
    id: "claim-verification", title: "Challenge material management claims", category: "Management", kind: "rule",
    statement: "Classify each material management statement as supported, partially supported, contradicted, or insufficiently evidenced.",
    rationale: "Management communication is a claim to test, not independent confirmation.",
    sourceId: "user-review-v1", pages: "Problem 4; Phase 4", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Future guidance cannot be verified immediately; track it as a dated promise.", tags: ["claims", "verification"]
  },
  {
    id: "guidance-track-record", title: "Track promises against outcomes", category: "Management", kind: "rule",
    statement: "Record dated guidance and compare it with subsequent delivery, delay, revision, or abandonment.",
    rationale: "Repeated execution outcomes provide stronger evidence of management credibility than tone or promoter ownership.",
    sourceId: "user-review-v1", pages: "Problem 8; Phase 3", status: "proposed", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Separate controllable execution failures from genuinely external shocks.", tags: ["guidance", "credibility"]
  },
  {
    id: "capital-allocation", title: "Evaluate capital allocation outcomes", category: "Management", kind: "rule",
    statement: "Judge reinvestment, capex, acquisitions, subsidiaries, dividends, buybacks, debt, and dilution by subsequent returns rather than announced intent.",
    rationale: "Money invested is not value created; management quality is visible in long-term incremental returns.",
    sourceId: "user-review-v1", pages: "Problem 7; Phase 3", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Long-gestation investments require milestone tracking before final judgement.", tags: ["capital allocation", "management"]
  },
  {
    id: "governance-scorecard", title: "Use a complete governance scorecard", category: "Governance", kind: "checklist",
    statement: "Review auditors, board independence, compensation, related parties, pledging, dilution, litigation, compliance, succession, and control weaknesses.",
    rationale: "Stable promoter holding is only one narrow governance signal.",
    sourceId: "user-review-v1", pages: "Problem 7; Phase 3", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Absence of disclosure is not evidence of absence.", tags: ["governance", "management"]
  },
  {
    id: "bull-base-bear", title: "Build bull, base, and bear cases", category: "Strategy", kind: "checklist",
    statement: "Express alternative futures with explicit drivers, milestones, risks, and valuation implications.",
    rationale: "Scenario thinking makes uncertainty visible and prevents a single narrative from dominating the decision.",
    sourceId: "user-review-v1", pages: "Problems 9 and 10; Phase 5", status: "proposed", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Probabilities must be user-approved and should not imply false precision.", tags: ["scenarios", "probability"]
  },
  {
    id: "thesis-breakers", title: "Define thesis breakers", category: "Strategy", kind: "rule",
    statement: "State observable conditions that would weaken or invalidate the investment thesis before making a decision.",
    rationale: "A falsifiable thesis reduces hindsight bias and turns monitoring into evidence-based review.",
    sourceId: "user-review-v1", pages: "Phase 5; Ultimate Vision", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Thresholds should be company-specific and connected to the thesis.", tags: ["falsification", "monitoring"]
  },
  {
    id: "rank-risks", title: "Rank risks by impact and likelihood", category: "Strategy", kind: "rule",
    statement: "Prioritize risks using probability, financial impact, time horizon, detectability, and mitigation rather than listing them equally.",
    rationale: "Decision support requires knowing which uncertainty matters most.",
    sourceId: "user-review-v1", pages: "Phase 5", status: "proposed", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "Do not convert weak evidence into precise probabilities.", tags: ["risk", "ranking"]
  },
  {
    id: "evidence-confidence", title: "Attach confidence to every conclusion", category: "Mindset", kind: "rule",
    statement: "Classify conclusions by evidence type and confidence, distinguishing audited fact, external fact, management claim, analyst inference, and projection.",
    rationale: "A conclusion’s reliability depends on both reasoning and the quality and independence of its evidence.",
    sourceId: "user-review-v1", pages: "Evidence Confidence; Phase 6", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Confidence measures evidentiary support, not whether an outcome is favorable.", tags: ["confidence", "evidence"]
  },
  {
    id: "separate-fact-inference-projection", title: "Separate facts, inferences, and projections", category: "Mindset", kind: "mental model",
    statement: "Label what is directly observed, what is inferred, and what is projected; never present one category as another.",
    rationale: "This prevents management narratives and analyst expectations from masquerading as established facts.",
    sourceId: "user-review-v1", pages: "Phase 6", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "None.", tags: ["epistemics", "evidence"]
  },
  {
    id: "decision-memory", title: "Preserve predictions and decision outcomes", category: "Mindset", kind: "checklist",
    statement: "Store the original thesis, scenarios, confidence, expected milestones, outcome, mistakes, and lessons without rewriting history.",
    rationale: "Research memory makes repeated errors and calibration quality measurable over time.",
    sourceId: "user-review-v1", pages: "Phase 7 and 8", status: "proposed", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "Append reviews; do not overwrite original predictions.", tags: ["memory", "learning"]
  },
  {
    id: "customer-purchase-system", title: "Map customer and purchase economics", category: "Business", kind: "rule",
    statement: "Identify the payer, user, purchase influencer, reason to buy, switching trigger, price sensitivity, repeat demand, concentration, and channel power for every material customer group.",
    rationale: "Pricing power and demand durability cannot be assessed until the actual purchase decision is understood.",
    sourceId: "user-review-v2", pages: "Customer analysis", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "For multi-sided businesses, map each side separately.", tags: ["customers", "pricing power", "channels"]
  },
  {
    id: "moat-replicability", title: "Test whether competitors can replicate the moat", category: "Competition", kind: "rule",
    statement: "For each claimed advantage, identify its economic mechanism, beneficiary, counter-evidence, replication requirements, time, cost, failure reasons, observed durability, and confidence.",
    rationale: "A descriptive strength becomes an investment moat only when its persistence and resistance to replication are evidenced.",
    sourceId: "user-review-v2", pages: "Moat scoring", status: "proposed", confidence: "high", weight: 10,
    test: { type: "qualitative" }, exceptions: "Leave replication time and cost unknown when they cannot be sourced; do not invent precision.", tags: ["moat", "replicability", "competition"]
  },
  {
    id: "second-order-reasoning", title: "Trace second-order competitive effects", category: "Strategy", kind: "mental model",
    statement: "Trace each material driver through direct, competitor, customer, channel, capital-allocation, and long-term-equilibrium responses.",
    rationale: "The direct accounting effect often differs from the eventual industry outcome after participants respond.",
    sourceId: "user-review-v2", pages: "Second-order effects", status: "proposed", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "Mark branches unknown when evidence is insufficient.", tags: ["causality", "competition", "systems thinking"]
  },
  {
    id: "adversarial-investment-debate", title: "Write an adversarial investment debate", category: "Strategy", kind: "checklist",
    statement: "Present the strongest ownership case, strongest rejection case, and neutral assessment using distinct evidence rather than mechanically reversing one narrative.",
    rationale: "Adversarial reasoning exposes hidden assumptions and reduces confirmation bias.",
    sourceId: "user-review-v2", pages: "Investment Debate", status: "proposed", confidence: "high", weight: 9,
    test: { type: "qualitative" }, exceptions: "The debate does not replace valuation or a decision rule.", tags: ["bull", "bear", "neutral", "bias"]
  },
  {
    id: "probability-calibration", title: "Use probabilities only when calibrated", category: "Strategy", kind: "rule",
    statement: "Attach numeric probabilities only when all scenarios are defined, sum to 100%, and the estimates are consciously approved and supported by evidence or prediction history.",
    rationale: "Probabilities improve decisions only when they express genuine calibration rather than decorative precision.",
    sourceId: "user-review-v2", pages: "Missing probability", status: "proposed", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "Use uncalibrated qualitative likelihood and state what would change it when numeric support is absent.", tags: ["probability", "calibration", "uncertainty"]
  },
  {
    id: "one-page-investment-memo", title: "Produce a one-page decision memo", category: "Strategy", kind: "checklist",
    statement: "Summarize business and customer quality, moat, industry, management, thesis, rejection case, unknowns, monitoring, valuation requirement, readiness, and final view in a compact memo.",
    rationale: "A portfolio decision requires a concise synthesis alongside the complete evidence report.",
    sourceId: "user-review-v2", pages: "Investment Memo", status: "proposed", confidence: "high", weight: 8,
    test: { type: "qualitative" }, exceptions: "Compression must not hide missing evidence or confidence limitations.", tags: ["memo", "decision", "monitoring"]
  }
];

export const metricFields = rules
  .filter((rule) => rule.test?.type === "number")
  .map((rule) => ({ key: rule.test.metric, label: rule.test.label, unit: rule.test.unit }));

export const starterState = {
  version: 1,
  sources,
  rules,
  analyses: [],
  decisions: []
};
