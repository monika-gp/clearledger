/**
 * runStressTest.js
 *
 * Runs the same candidate filter + Gemini reasoning pipeline against the
 * deliberately ambiguous stress dataset (data/stress/), and reports
 * whether ClearLedger resolved each pair correctly via narration, or
 * — just as importantly — whether it avoided a confident WRONG guess
 * on cases with no clean signal.
 *
 * This is a stress test, run and reported separately from the main
 * evaluation (see README's "Stress test" section for how to read this).
 *
 * Run: node runStressTest.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { getCandidates } = require("./candidateFilter");
const { matchWithGemini } = require("./geminiMatch");

const stressDir = path.join(__dirname, "..", "data", "stress");

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(stressDir, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env");
    process.exit(1);
  }

  const ledger = loadCSV("stress_ledger.csv");
  const bank = loadCSV("stress_bank_statement.csv");
  const groundTruth = loadCSV("stress_ground_truth.csv");

  const correctMatch = {};
  for (const row of groundTruth) {
    if (row.stmt_id && row.txn_id) correctMatch[row.stmt_id] = row.txn_id;
  }

  const results = [];

  console.log(`Running stress test: ${bank.length} genuinely ambiguous cases...\n`);

  for (const bankRow of bank) {
    const candidates = getCandidates(bankRow, ledger);
    const siblingIds = candidates.filter((c) => c._signals.amountDiffPct === 0).map((c) => c.txn_id);

    let result;
    try {
      result = await matchWithGemini(bankRow, candidates, apiKey);
    } catch (err) {
      result = { decision: "NO_MATCH", confidence: "low", reason: `Call failed: ${err.message}` };
    }

    const correct = correctMatch[bankRow.stmt_id];
    const isCorrect = result.decision === correct;
    const pickedWrongSibling = siblingIds.includes(result.decision) && !isCorrect;

    results.push({
      stmt_id: bankRow.stmt_id,
      candidates_with_identical_amount_date: siblingIds,
      decision: result.decision,
      confidence: result.confidence,
      reason: result.reason,
      expected: correct,
      outcome: isCorrect
        ? "CORRECT — resolved ambiguity via narration"
        : pickedWrongSibling
        ? "WRONG — confidently picked the wrong sibling"
        : "DEFERRED — did not guess between ambiguous candidates",
    });

    console.log(`[${bankRow.stmt_id}] -> ${result.decision} (${result.confidence})`);
    console.log(`  Candidates with identical amount+date: ${siblingIds.join(", ") || "none"}`);
    console.log(`  Outcome: ${results[results.length - 1].outcome}\n`);

    await sleep(4500);
  }

  const outDir = path.join(__dirname, "..", "data", "output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "stress_test_results.json"), JSON.stringify(results, null, 2));

  const correct = results.filter((r) => r.outcome.startsWith("CORRECT")).length;
  const wrong = results.filter((r) => r.outcome.startsWith("WRONG")).length;
  const deferred = results.filter((r) => r.outcome.startsWith("DEFERRED")).length;

  console.log("=== STRESS TEST SUMMARY ===");
  console.log(`Correctly resolved via narration: ${correct}/${results.length}`);
  console.log(`Confidently wrong (picked wrong sibling): ${wrong}/${results.length}`);
  console.log(`Correctly deferred (no guess made): ${deferred}/${results.length}`);
  console.log(`\nOutput written to ${path.join(outDir, "stress_test_results.json")}`);
}

run();