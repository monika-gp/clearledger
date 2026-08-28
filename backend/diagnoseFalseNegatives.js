/**
 * diagnoseFalseNegatives.js
 *
 * Cross-references audit_log.json against ground_truth.csv to isolate
 * ONLY the genuine false negatives — bank rows that had a real match
 * in the ledger, but the model said NO_MATCH anyway. Prints the model's
 * candidates + reasoning for each, so we can see exactly why it bailed.
 *
 * Run: node diagnoseFalseNegatives.js
 */

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const dataDir = path.join(__dirname, "..", "data");
const outDir = path.join(dataDir, "output");

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(dataDir, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

const groundTruth = loadCSV("ground_truth.csv");
const auditLog = JSON.parse(fs.readFileSync(path.join(outDir, "audit_log.json"), "utf-8"));

const correctMatch = {};
for (const row of groundTruth) {
  if (row.stmt_id && row.txn_id) correctMatch[row.stmt_id] = row.txn_id;
}

const falseNegatives = auditLog.filter(
  (entry) => entry.decision === "NO_MATCH" && correctMatch[entry.stmt_id]
);

console.log(`Found ${falseNegatives.length} genuine false negatives ` +
  `(real match existed, model said NO_MATCH)\n`);

for (const fn of falseNegatives.slice(0, 8)) {
  const expectedTxnId = correctMatch[fn.stmt_id];
  const expectedCandidate = fn.candidates_considered.find((c) => c.txn_id === expectedTxnId);

  console.log(`--- ${fn.stmt_id} (expected: ${expectedTxnId}) ---`);
  console.log(`Model reason: ${fn.reason}`);
  if (expectedCandidate) {
    console.log(`Correct candidate's signals: score=${expectedCandidate.score}, ` +
      `amountDiff=${(expectedCandidate.signals.amountDiffPct * 100).toFixed(2)}%, ` +
      `dateDiff=${expectedCandidate.signals.dateDiffDays}d, ` +
      `tokenOverlap=${expectedCandidate.signals.tokenOverlap}`);
    console.log(`Was it even in the top candidates list? YES (rank ${
      fn.candidates_considered.findIndex((c) => c.txn_id === expectedTxnId) + 1})`);
  } else {
    console.log(`Correct candidate was NOT in the top candidates shown to the model!`);
  }
  console.log();
}