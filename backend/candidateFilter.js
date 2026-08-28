
const AMOUNT_TOLERANCE_PCT = 0.03; // allow up to 3% difference (covers typical fees)
const DATE_WINDOW_DAYS = 4;        // allow up to 4 days lag
const MAX_CANDIDATES = 5;          // cap candidates sent to the LLM per bank row

function daysBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.abs((a - b) / (1000 * 60 * 60 * 24));
}

function tokenize(str) {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Token overlap score: how many ledger tokens (from counterparty + reference)
// appear as a prefix-match inside the narration tokens. This is deliberately
// loose to catch abbreviations like "RED" matching "REDWOOD".
function tokenOverlapScore(narration, counterparty, reference) {
  const narrationTokens = tokenize(narration);
  const targetTokens = tokenize(counterparty + " " + reference);
  if (targetTokens.length === 0) return 0;

  let hits = 0;
  for (const target of targetTokens) {
    const found = narrationTokens.some(
      (nt) => nt.startsWith(target.slice(0, 3)) || target.startsWith(nt.slice(0, 3))
    );
    if (found) hits++;
  }
  return hits / targetTokens.length; // 0..1
}

/**
 * Returns candidate ledger rows for a single bank row, scored and sorted.
 * @param {object} bankRow - {stmt_id, date, amount, narration, utr}
 * @param {object[]} ledgerRows - all ledger rows still unmatched
 * @returns {object[]} top candidates, each = {...ledgerRow, _score, _signals}
 */
function getCandidates(bankRow, ledgerRows) {
  const bankAmount = parseFloat(bankRow.amount);

  const scored = ledgerRows
    .map((ledgerRow) => {
      const ledgerAmount = parseFloat(ledgerRow.amount);
      const amountDiffPct = Math.abs(ledgerAmount - bankAmount) / ledgerAmount;
      const dateDiff = daysBetween(bankRow.date, ledgerRow.date);
      const overlap = tokenOverlapScore(
        bankRow.narration,
        ledgerRow.counterparty,
        ledgerRow.reference
      );

      // Hard filters: skip rows with no plausible relationship at all
      const amountPlausible = amountDiffPct <= AMOUNT_TOLERANCE_PCT * 3; // wider net, LLM decides final
      const datePlausible = dateDiff <= DATE_WINDOW_DAYS * 2;
      if (!amountPlausible && !datePlausible && overlap === 0) return null;

      // Composite score: lower amount/date diff and higher overlap = better
      const amountScore = Math.max(0, 1 - amountDiffPct / AMOUNT_TOLERANCE_PCT / 3);
      const dateScore = Math.max(0, 1 - dateDiff / (DATE_WINDOW_DAYS * 2));
      const score = amountScore * 0.4 + dateScore * 0.2 + overlap * 0.4;

      return {
        ...ledgerRow,
        _score: Number(score.toFixed(3)),
        _signals: {
          amountDiffPct: Number(amountDiffPct.toFixed(4)),
          dateDiffDays: Number(dateDiff.toFixed(1)),
          tokenOverlap: Number(overlap.toFixed(2)),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, MAX_CANDIDATES);
}

module.exports = { getCandidates, tokenOverlapScore, daysBetween };