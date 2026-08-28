/**
 * geminiMatch.js
 *
 * Step 2 of the matching pipeline: given one bank row and its top
 * candidate ledger rows (from candidateFilter.js), ask Gemini to make
 * the final call — which candidate is the true match, or "no match" —
 * with a one-line reason. This reuses the same "retrieve then reason"
 * pattern as CodeChat's code-chunk retrieval + Gemini answer step.
 *
 * IMPORTANT: the model is only ever shown the narrowed candidate list,
 * never the full ledger — this keeps prompts small and keeps the model's
 * job bounded (pick from these N, or say none), which is what makes the
 * output auditable and the failure mode safe (worst case: an unnecessary
 * exception, never a false match to something it was never shown).
 */

const fetch = require("node-fetch");

const GEMINI_MODEL = "gemini-3.5-flash-lite"; // updated Aug 2026 — 2.0-flash-lite was deprecated
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt(bankRow, candidates) {
  const candidateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. txn_id=${c.txn_id} | counterparty="${c.counterparty}" | ` +
        `amount=${c.amount} | date=${c.date} | reference=${c.reference} | ` +
        `signals: amountDiff=${(c._signals.amountDiffPct * 100).toFixed(2)}%, ` +
        `dateDiff=${c._signals.dateDiffDays}d, tokenOverlap=${c._signals.tokenOverlap}`
    )
    .join("\n");

  return `You are a financial reconciliation assistant. Match ONE bank statement row against a short list of candidate ledger entries.

IMPORTANT DOMAIN CONTEXT — these are NORMAL, EXPECTED patterns in real settlement data, not red flags:
- Bank dates commonly lag ledger dates by 1-3 days (settlement delay). A dateDiff of up to 3-4 days with strong amount/name match is still a confident match.
- Bank amounts are commonly 0.5-2% lower than ledger amounts due to gateway/bank fees deducted before settlement. A small amountDiff with strong date/name match is still a confident match.
- Bank narration text is commonly abbreviated, reordered, or has spaces/hyphens stripped (e.g. "REDWOOD PHARMA" may appear as "REDPHA" or "RED PHA"). A moderate tokenOverlap combined with strong amount+date match is still a confident match — do not require exact text matches.
- Only say NO_MATCH when NO candidate has a coherent combination of signals (e.g. amount, date, AND name all differ substantially) — not merely because one signal is imperfect.

A wrong match (choosing an incorrect candidate) is worse than a missed match, but an unnecessarily cautious NO_MATCH on a genuinely correct candidate is also a real cost — use the signals holistically, the way a human reconciliation analyst would, not on strict text-matching alone.

BANK ROW:
stmt_id=${bankRow.stmt_id} | amount=${bankRow.amount} | date=${bankRow.date} | narration="${bankRow.narration}" | utr=${bankRow.utr}

CANDIDATE LEDGER ENTRIES (pre-sorted, best signal match first):
${candidateList}

Respond in EXACTLY this format, nothing else:
DECISION: <txn_id or NO_MATCH>
CONFIDENCE: <high|medium|low>
REASON: <one short sentence explaining the decision, referencing specific evidence>`;
}

function parseResponse(text) {
  const decisionMatch = text.match(/DECISION:\s*(\S+)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(\S+)/i);
  const reasonMatch = text.match(/REASON:\s*(.+)/i);

  return {
    decision: decisionMatch ? decisionMatch[1].trim() : "NO_MATCH",
    confidence: confidenceMatch ? confidenceMatch[1].trim().toLowerCase() : "low",
    reason: reasonMatch ? reasonMatch[1].trim() : "No reason parsed from model output.",
  };
}

/**
 * Calls Gemini to decide the match for one bank row against its candidates.
 * @param {object} bankRow
 * @param {object[]} candidates - output of getCandidates()
 * @param {string} apiKey
 * @returns {Promise<{decision, confidence, reason, rawPrompt, rawResponse}>}
 */
async function matchWithGemini(bankRow, candidates, apiKey) {
  if (candidates.length === 0) {
    return {
      decision: "NO_MATCH",
      confidence: "high",
      reason: "No plausible candidates found by pre-filter.",
      rawPrompt: null,
      rawResponse: null,
    };
  }

  const prompt = buildPrompt(bankRow, candidates);

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 }, // deterministic for reconciliation decisions
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = parseResponse(text);

  return { ...parsed, rawPrompt: prompt, rawResponse: text };
}

module.exports = { matchWithGemini, buildPrompt, parseResponse };