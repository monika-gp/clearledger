const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { getCandidates } = require("./candidateFilter");

const dataDir = path.join(__dirname, "..", "data");

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(dataDir, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

const ledger = loadCSV("ledger.csv");
const bank = loadCSV("bank_statement.csv");
const groundTruth = loadCSV("ground_truth.csv");

// Build a lookup: stmt_id -> correct txn_id (for checking our filter's recall)
const correctMatch = {};
for (const row of groundTruth) {
  if (row.stmt_id && row.txn_id) correctMatch[row.stmt_id] = row.txn_id;
}

let foundInCandidates = 0;
let totalWithGroundTruth = 0;
let missed = [];

for (const bankRow of bank) {
  const candidates = getCandidates(bankRow, ledger);
  const correctTxnId = correctMatch[bankRow.stmt_id];

  if (correctTxnId) {
    totalWithGroundTruth++;
    const isFound = candidates.some((c) => c.txn_id === correctTxnId);
    if (isFound) {
      foundInCandidates++;
    } else {
      missed.push({ stmt_id: bankRow.stmt_id, expected: correctTxnId });
    }
  }
}

console.log(`Candidate filter recall: ${foundInCandidates}/${totalWithGroundTruth} ` +
  `(${((foundInCandidates / totalWithGroundTruth) * 100).toFixed(1)}%)`);

if (missed.length > 0) {
  console.log("\nMissed (correct match not in top candidates):");
  console.log(missed);
}

// Show one example in detail
console.log("\n--- Example candidate list for first bank row ---");
console.log("Bank row:", bank[0]);
console.log("Top candidates:", getCandidates(bank[0], ledger).map(c => ({
  txn_id: c.txn_id, counterparty: c.counterparty, amount: c.amount,
  date: c.date, score: c._score
})));