# ClearLedger

**Bounded, explainable AI reconciliation — every decision logged, no silent matches.**

Built for the Razorpay AI Buildathon — AI Finance Controller track.

---

## The problem

Every business that moves money through multiple systems — an internal ledger and a bank or payment gateway statement — faces the same recurring, manual task: **does what we think happened actually match what happened?**

Settlement delays, bank fees, garbled narrations, and partial payments mean the two records rarely line up 1:1. Today this reconciliation is usually done by a human comparing two spreadsheets by eye.

ClearLedger is an agent that reconciles two financial record sources and, for every transaction, either:
- confidently **matches** it to its counterpart, with a stated reason, or
- flags it as an **exception** — with a reason a human can act on.

It never silently guesses. Every decision is logged with the evidence considered, so the output is auditable end to end. A false match is worse than a correctly-flagged exception — this shaped every design decision below.

---

## Architecture

```mermaid
flowchart LR
    A[Ledger CSV<br/>internal records] --> C
    B[Bank Statement CSV<br/>settlement records] --> C
    C[Candidate Filter<br/>amount · date · text overlap] --> D
    D{Gemini Agent<br/>bounded reasoning} -->|confident match| E[Matched<br/>+ reason]
    D -->|no confident match| F[Exception<br/>+ reason]
    E --> G[Audit Log]
    F --> G
    G --> H[Dashboard<br/>Express + vanilla JS]
```

**Why two stages, not one:**
- **Candidate filter** (cheap, deterministic): narrows ~50 ledger rows down to the 5 most plausible matches per bank row, using amount closeness, date closeness, and narration token overlap. No API cost, no LLM latency.
- **Gemini reasoning** (the actual judgment call): only sees the narrowed candidate list, never the full ledger. This bounds the model's task — pick one of these 5, or say none — which keeps the failure mode safe: worst case is an unnecessary exception, never a false match to something it was never shown.

This mirrors the retrieval-then-reason pattern used in [CodeChat](../codechat) (a prior RAG project), applied here to structured transaction data instead of text chunks.

---

## Results

Evaluated on a 50-row synthetic dataset (see [Dataset](#dataset) below) against a held-out ground-truth mapping the pipeline never sees:

| Metric | Value |
|---|---|
| Match rate | 88% |
| Precision | 100% |
| Recall | 100% |
| False positives (wrong matches) | 0 |
| False negatives (missed real matches) | 0 |
| Exceptions correctly flagged | 12 / 12 |

**What this means:** every one of the 44 genuine matches was found correctly, zero incorrect matches were made, and both types of orphaned transactions (a bank entry with no ledger record, and a ledger entry with no bank record) were correctly caught rather than force-matched or silently dropped.

---

## Why the AI reasoning step matters — baseline comparison

To answer the obvious question — *why not just write a SQL join on amount and date?* — a naive exact-match baseline was built and run on the identical dataset:

| Approach | Precision | Recall | What it means |
|---|---|---|---|
| Naive exact match (amount + date only) | 100% | 70.5% | Correctly matches the easy cases, but silently pushes every date-lag, fee-adjusted, and garbled-narration transaction (13 of them) to manual review |
| **ClearLedger** | **100%** | **100%** | Recovers all 13 of those cases automatically, with zero incorrect matches introduced |

Both approaches make zero wrong matches — but the naive version forces a human to manually review 29% of transactions that ClearLedger resolves correctly and automatically, purely because it can't reason about settlement delay, fees, or abbreviated bank text.

See [`backend/baselineMatcher.js`](backend/baselineMatcher.js).

---

## Stress test — genuine ambiguity, not just noise

The main dataset tests realistic noise. To test something harder, a separate adversarial dataset was built: pairs of ledger entries with **identical amount and identical date, but different counterparties** — the kind of case where a system that only looks at amount+date has a coin-flip chance of being confidently wrong.

| Outcome | Result |
|---|---|
| Correctly resolved via narration reasoning | 3 / 3 |
| Confidently picked the wrong sibling | 0 / 3 |

In every case, ClearLedger used the bank narration text — not just amount and date — to correctly identify which of two identical-looking candidates was the true match. Zero false matches, even under deliberately adversarial conditions.

See [`data/generate_stress_data.js`](data/generate_stress_data.js) and [`backend/runStressTest.js`](backend/runStressTest.js).

---

## What this means in business terms

Manual reconciliation is typically a per-transaction human task — an analyst checking one entry against a bank line at a time. On this dataset:

- **44 of 50 transactions (88%) were resolved automatically** with zero incorrect matches, leaving only the genuine exceptions — the bank-side and ledger-side orphans that a human should look at anyway — for manual review.
- The naive baseline, by contrast, would have escalated **19 of 50 (38%)** to manual review, even though 13 of those were perfectly legitimate matches a human would have approved in seconds. ClearLedger removes that unnecessary manual load entirely.
- At scale, this is the difference between a finance team reviewing a handful of genuine exceptions per batch versus re-verifying a third of all transactions by hand, most of which were never actually wrong.

## Cost per transaction

Every match decision costs one Gemini API call. Measured directly from the actual prompt used in this pipeline (~548 input tokens, ~40 output tokens per call) at Gemini 3.5 Flash-Lite's current paid-tier pricing ($0.30/M input, $2.50/M output tokens):

| Volume | Estimated cost |
|---|---|
| 50 transactions (this dataset) | ~$0.013 |
| 1,000 transactions | ~$0.26 |
| 100,000 transactions | ~$26 |

This is a back-of-envelope estimate from measured token counts and Google's published pricing, not a production benchmark — real-world prompts could vary slightly with more complex narrations or more candidates per row. Also worth noting: the actual runs in this project used Gemini's **free tier** (rate-limited to 15 requests/minute), so these figures represent what a production deployment on paid tier would cost, not what this submission spent.

---

## Dataset

Since real transaction data isn't available (and using someone else's would raise privacy concerns), the dataset is synthetically generated with deliberately realistic noise:

- **55%** exact matches
- **20%** date-lag matches (1–3 day settlement delay)
- **13%** amount-mismatch matches (bank/gateway fee deducted)
- **12%** garbled-narration matches (abbreviated bank text, e.g. `RED PHA` for `Redwood Pharma`)
- **12 orphans** — 6 with no bank counterpart, 6 with no ledger counterpart

Generator: [`data/generate_data.js`](data/generate_data.js), seeded for reproducibility.

---

## Features

- Two-stage matching pipeline (candidate filter + Gemini reasoning)
- Full audit trail — every decision logged with the candidates considered and the reason given
- Precision/recall scoring against ground truth
- Dashboard: filterable transaction table, click-to-expand detail view (ledger vs. bank side-by-side, confidence score, "How ClearLedger decided" reasoning breakdown)
- Live "Run reconciliation" trigger from the dashboard
- Markdown report generator for reviewer-readable evidence

---

## Tech stack

- **Backend:** Node.js, Express
- **Matching logic:** custom candidate filter (no external libraries) + Gemini API (`gemini-3.5-flash-lite`)
- **Frontend:** vanilla HTML/CSS/JS (no framework)
- **Data:** CSV, no database — pipeline output is JSON

---

## Running it locally

```bash
git clone https://github.com/monika-gp/clearledger.git
cd clearledger/backend
npm install

# Create backend/.env with your own key:
# GEMINI_API_KEY=your_key_here

node runReconciliation.js    # ~4 min, respects free-tier rate limits
node generateReport.js       # optional: produces RECONCILIATION_REPORT.md
node server.js               # dashboard at http://localhost:3001
```

---

## Known limitations

- Evaluated on a 50-row synthetic dataset with well-separated noise categories. Real-world data at larger scale, with overlapping ambiguity between candidates, would likely show lower precision/recall than reported here.
- The candidate filter caps at 5 candidates per bank row. Duplicate-invoice ambiguity (two ledger entries with identical amount and date) was tested separately (see Stress Test above) with a 3-pair sample — 0 wrong matches — but this remains a small sample, not a comprehensive stress evaluation.
- Single-currency, single-bank-account. Multi-currency or multi-account reconciliation would need additional disambiguation signals.
- Gemini free-tier rate limits (15 requests/minute) mean a full run takes ~4 minutes; a production version would need a paid tier or batching for real-time use.

---

## Project structure

```
clearledger/
├── backend/
│   ├── candidateFilter.js      # Stage 1: cheap deterministic narrowing
│   ├── geminiMatch.js          # Stage 2: LLM reasoning + decision
│   ├── runReconciliation.js    # orchestrates the full pipeline
│   ├── baselineMatcher.js      # naive exact-match comparison
│   ├── runStressTest.js        # ambiguous-case stress test
│   ├── generateReport.js       # produces human-readable Markdown report
│   ├── server.js               # Express server + dashboard API
│   └── diagnoseFalseNegatives.js  # debugging tool used during development
├── frontend/
│   └── index.html              # dashboard (self-contained HTML/CSS/JS)
├── data/
│   ├── generate_data.js        # synthetic dataset generator
│   ├── generate_stress_data.js # adversarial stress dataset generator
│   ├── ledger.csv / bank_statement.csv / ground_truth.csv
│   ├── stress/                 # ambiguous duplicate-invoice test cases
│   └── output/                 # pipeline results (matches, exceptions, audit log, metrics)
└── README.md
```