ClearLedger — AI Finance Controller (Razorpay Buildathon)
Problem Statement

Every business that moves money through multiple systems — an internal ledger and a bank/payment gateway statement — faces the same recurring, manual task: does what we think happened match what actually happened? Settlement delays, bank fees, garbled narrations, and partial payments mean the two records rarely line up 1:1, and today this reconciliation is done by a human squinting at two spreadsheets.

ClearLedger is a bounded, explainable AI agent that reconciles two financial record sources (internal ledger vs. bank statement), and for every record either:

confidently matches it to its counterpart, with a stated reason, or
flags it as an exception — with a reason a human can act on.

The agent never silently guesses. Every decision — match or exception — is logged with the evidence considered, so the output is auditable end to end. This mirrors how reconciliation must work in any real finance-ops setting: a false match is worse than a correctly-flagged exception.

Why this approach

The matching pipeline reuses a retrieval-augmented pattern proven on a related problem (code Q&A retrieval in a prior project): cheap candidate filtering first, then an LLM reasoning step over a narrowed candidate set — rather than either pure rule-based matching (too brittle for messy bank narrations) or full embeddings search (unnecessary complexity for structured tabular data at this scale).

Architecture (planned)
ledger.csv ─┐
            ├─> candidate filter (amount/date/token overlap) ─> Gemini match/no-match ─> decision log
bank.csv ───┘                                                                    │
                                                                                  v
                                                          matched pairs + exceptions + metrics
Status
 Repo scaffolded
 Synthetic dataset (Day 2)
 Candidate filter + matching engine (Day 3-4)
 Metrics + exceptions (Day 5)
 Audit trail (Day 6)
 Dashboard (Day 7)
 Final README + diagram (Day 8)
 Pitch video (Day 9)