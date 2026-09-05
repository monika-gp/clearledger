/**
 * baselineMatcher.js
 *
 * A deliberately naive reconciler: exact amount + exact date match only,
 * no fuzzy tolerance, no narration reasoning, no AI. This is what a
 * simple SQL JOIN or spreadsheet VLOOKUP would achieve.
 *
 * Run against the same dataset and scored against the same ground truth
 * as the full ClearLedger pipeline, this exists to answer the obvious
 * judge question: "why not just write a SQL query for this?"
 *
 * Run: node baselineMatcher.js
 */

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const dataDir = path.join(__dirname, "..", "data");

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(dataDir, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

function run() {
  const ledger = loadCSV("ledger.csv");
  const bank = loadCSV("bank_statement.csv");
  const groundTruth = loadCSV("ground_truth.csv");

  const correctMatch = {};
  for (const row of groundTruth) {
    if (row.stmt_id && row.txn_id) correctMatch[row.stmt_id] = row.txn_id;
  }

  let truePositives = 0, falsePositives = 0, falseNegatives = 0, noMatch = 0;
  const results = [];

  for (const bankRow of bank) {
    // Naive rule: exact amount AND exact date, nothing else
    const exactMatches = ledger.filter(
      (l) => parseFloat(l.amount) === parseFloat(bankRow.amount) && l.date === bankRow.date
    );

    let decision;
    if (exactMatches.length === 1) {
      decision = exactMatches[0].txn_id;
    } else if (exactMatches.length > 1) {
      // Ambiguous — naive approach just takes the first one (this is
      // exactly the kind of silent wrong-guess ClearLedger is built to avoid)
      decision = exactMatches[0].txn_id;
    } else {
      decision = "NO_MATCH";
      noMatch++;
    }

    results.push({ stmt_id: bankRow.stmt_id, decision });

    const correct = correctMatch[bankRow.stmt_id];
    if (decision !== "NO_MATCH") {
      if (decision === correct) truePositives++;
      else falsePositives++;
    } else if (correct) {
      falseNegatives++;
    }
  }

  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;

  const metrics = {
    approach: "naive_exact_match",
    total_bank_rows: bank.length,
    matched: bank.length - noMatch,
    no_match: noMatch,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
  };

  const outDir = path.join(dataDir, "output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "baseline_metrics.json"), JSON.stringify(metrics, null, 2));

  console.log("=== NAIVE BASELINE (exact amount + exact date only) ===");
  console.log(metrics);
  console.log(`\nOutput written to ${path.join(outDir, "baseline_metrics.json")}`);
}

run();