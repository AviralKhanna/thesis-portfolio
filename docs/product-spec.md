# Product specification — MVP

## Purpose

Help one investor answer: **“How compatible is this company with my evolving investment philosophy, and what evidence supports that conclusion?”**

## Principles

1. Compatibility is not a buy/sell recommendation.
2. Every extracted idea retains source and page provenance.
3. AI or software may propose a rule; only the user adopts it.
4. Missing evidence lowers completeness, not the company’s quality score.
5. Deterministic financial tests and qualitative judgement remain visibly distinct.
6. Original decision theses are immutable snapshots; later reviews are appended.
7. The user’s knowledge and history must remain portable.

## MVP workflow

```text
Source → extracted knowledge → human review → personal rule
       → company evidence → evaluation → saved report
       → decision entry → later review
```

## In scope

- One local user
- Indian listed-equity research
- Fundamental-analysis knowledge from the supplied notes
- Manual financial and qualitative company inputs
- Transparent weighted compatibility scoring
- Decision journaling and JSON portability

## Out of scope for this version

- Live market feeds or brokerage integration
- Autonomous recommendations or trade execution
- News sentiment
- Automatic PDF ingestion
- Portfolio optimization
- Authentication or cloud sync

## Success criterion

The user can inspect a sourced principle, decide whether it belongs in their philosophy, enter evidence for a company, understand every rule result, and save the resulting research snapshot.
