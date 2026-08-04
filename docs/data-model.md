# Data model

## Source

`id`, `title`, `kind`, `file`, `status`, `pageCount`, `scope`, `addedAt`

## Knowledge item / rule

`id`, `title`, `category`, `kind`, `statement`, `rationale`, `sourceId`, `pages`, `status`, `confidence`, `weight`, `test`, `exceptions`, `tags`

Rule status is one of `adopted`, `proposed`, `undecided`, or `rejected`. A `test` is optional because qualitative principles may require human evidence rather than a formula.

## Company analysis

`id`, `name`, `ticker`, `sector`, `asOfDate`, `metrics`, `judgements`, `notes`, `results`, `compatibility`, `completeness`, `createdAt`

Each result is `pass`, `fail`, `investigate`, `not_applicable`, or `missing`. Missing values affect completeness but are excluded from compatibility.

## Decision

`id`, `company`, `ticker`, `action`, `date`, `thesis`, `risks`, `expectations`, `valuation`, `confidence`, `reviewDate`, `createdAt`

Future reviews should be appended rather than rewriting the original decision record.

## Claim and evidence

`id`, `claim`, `topic`, `date`, `type`, `status`, `source`, `independentCorroboration`, `contradicted`, `stale`, `note`

Evidence types are `audited_fact`, `regulatory_fact`, `external_fact`, `management_claim`, `analyst_inference`, and `projection`. Confidence describes evidentiary support—not whether a claim is favorable.

## Business and moat

Business evidence stores the revenue mechanism, cost structure, reinvestment needs, segments, revenue/geographic/customer mix, industry drivers, competitors, and market position. Customer records separate payer, user, purchase influencer, switching trigger, price sensitivity, repeat demand, concentration, and channel power.

Each moat dimension records its economic mechanism, beneficiary, supporting and counter-evidence, replication requirements, estimated replication time and cost, failure reasons, observed durability, and confidence. Unsupported estimates remain `unknown`.

Second-order-effect records trace a trigger through direct, competitor, customer, channel, capital-allocation, and long-term-equilibrium responses.

## Management quality

Structured assessments cover operating execution, capital allocation and incremental returns, guidance accuracy, acquisition history, innovation productivity, culture and retention, compensation alignment, minority-shareholder treatment, succession, disclosure quality, and response to mistakes.

## Investment memo

The one-page memo stores business quality, customer economics, moat replicability, industry position, management quality, strongest ownership and rejection cases, neutral assessment, unknowns, decision-linked questions, monitoring items, valuation requirement, decision readiness, and final view.

## Prediction

`id`, `claim`, `createdAt`, `targetDate`, `metric`, `operator`, `target`, `probability`, `confidence`, `status`, `outcome`, `reviewedAt`, `evidence`

Prediction status is `open`, `correct`, `incorrect`, `partial`, or `unresolved`. Calibration gives correct outcomes 1 point, partial outcomes 0.5, and incorrect outcomes 0. Failed predictions remain in memory.

## Contradiction

`id`, `topic`, `claimA`, `claimB`, `assessment`, `materiality`, `note`, `monitor`

Contradictions may be explicitly entered, inherited from contradicted claims, or generated from predictions contradicted by later outcomes.

## Research snapshot

Each report run stores immutable Markdown and JSON under `reports/<TICKER>/history/`. The latest two snapshots can be compared for metric changes, thesis status, risks, prediction accuracy, and contradictions.

## Research confidence

Area confidence is deterministic: 70% structured evidence coverage plus 30% recorded evidence quality. It measures the reliability and completeness of the research package, not whether the investment outcome is likely to be favorable.

## Management promise

`date`, `topic`, `promise`, `targetDate`, `status`, `outcome`, `source`

Status should be `open`, `delivered`, `partially_delivered`, `delayed`, `revised`, or `abandoned`.

## Scenario

Bull, base, and bear cases store user-approved probability, drivers, milestones, valuation implications, and confidence. Thesis breakers and ranked risks are stored alongside them.

## Scoring

Compatibility is the weighted percentage of evaluated adopted rules:

```text
pass = 1.0
investigate = 0.5
fail = 0.0
not applicable / missing = excluded
```

Evidence completeness is the percentage of adopted rule weight for which evidence is available. The two values must always be displayed together.
