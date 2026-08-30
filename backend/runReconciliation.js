/**
 * runReconciliation.js
 *
 * Runs the full ClearLedger pipeline end to end:
 *   1. Load ledger.csv + bank_statement.csv
 *   2. For each bank row: candidate filter -> Gemini decision
 *   3. Write out: matches.json, exceptions.json, audit_log.json
 *   4. Score against ground_truth.csv -> print precision/recall/match rate
 *
 * Run: node runReconciliation.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { getCandidates } = require("./candidateFilter");
const { matchWithGemini } = require("./geminiMatch");

const dataDir = path.join(__dirname, "..", "data");
const outDir = path.join(__dirname, "..", "data", "output");

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(dataDir, filename), "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env — create backend/.env with your key first.");
    process.exit(1);
  }

  const ledger = loadCSV("ledger.csv");
  const bank = loadCSV("bank_statement.csv");
  const groundTruth = loadCSV("ground_truth.csv");

  const correctMatch = {};
  for (const row of groundTruth) {
    if (row.stmt_id && row.txn_id) correctMatch[row.stmt_id] = row.txn_id;
  }

  const matches = [];
  const exceptions = [];
  const auditLog = [];
  const matchedLedgerIds = new Set();

  console.log(`Processing ${bank.length} bank rows against ${ledger.length} ledger rows...\n`);

  for (let i = 0; i < bank.length; i++) {
    const bankRow = bank[i];
    const candidates = getCandidates(bankRow, ledger);

    let result;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        result = await matchWithGemini(bankRow, candidates, apiKey);
        break;
      } catch (err) {
        attempts++;
        const isRateLimit = err.message.includes("429");
        if (isRateLimit && attempts < maxAttempts) {
          console.log(`  [${bankRow.stmt_id}] Rate limited, waiting 15s before retry ${attempts}/${maxAttempts}...`);
          await sleep(15000);
          continue;
        }
        console.error(`  [${bankRow.stmt_id}] Gemini call failed: ${err.message}`);
        result = {
          decision: "NO_MATCH",
          confidence: "low",
          reason: `Model call failed: ${err.message}`,
          rawPrompt: null,
          rawResponse: null,
        };
        break;
      }
    }

    const auditEntry = {
      stmt_id: bankRow.stmt_id,
      candidates_considered: candidates.map((c) => ({
        txn_id: c.txn_id,
        score: c._score,
        signals: c._signals,
      })),
      decision: result.decision,
      confidence: result.confidence,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    };
    auditLog.push(auditEntry);

    if (result.decision === "NO_MATCH") {
      exceptions.push({
        stmt_id: bankRow.stmt_id,
        type: "no_match_in_ledger",
        bank_row: bankRow,
        ledger_row: null,
        reason: result.reason,
        candidates_seen: candidates.length,
      });
      console.log(`  [${bankRow.stmt_id}] -> EXCEPTION (${result.reason})`);
    } else {
      const matchedLedgerRow = ledger.find((l) => l.txn_id === result.decision);
      matchedLedgerIds.add(result.decision);
      matches.push({
        stmt_id: bankRow.stmt_id,
        txn_id: result.decision,
        bank_row: bankRow,
        ledger_row: matchedLedgerRow || null,
        confidence: result.confidence,
        reason: result.reason,
      });
      console.log(`  [${bankRow.stmt_id}] -> ${result.decision} (${result.confidence}): ${result.reason}`);
    }

    await sleep(4500); // 15 requests/min free-tier limit = 1 every 4s minimum; 4.5s for safety margin
  }

  // --- Ledger-side orphans: rows never claimed by any bank row match ---
  for (const ledgerRow of ledger) {
    if (!matchedLedgerIds.has(ledgerRow.txn_id)) {
      exceptions.push({
        stmt_id: null,
        type: "missing_in_bank",
        bank_row: null,
        ledger_row: ledgerRow,
        reason: "No corresponding bank statement entry found for this ledger transaction.",
        candidates_seen: 0,
      });
      console.log(`  [${ledgerRow.txn_id}] -> EXCEPTION (missing in bank statement)`);
    }
  }

  // --- Scoring against ground truth ---
  let truePositives = 0, falsePositives = 0, falseNegatives = 0;
  let correctlyFlaggedOrphans = 0;

  for (const m of matches) {
    if (correctMatch[m.stmt_id] === m.txn_id) truePositives++;
    else falsePositives++;
  }
  for (const e of exceptions) {
    if (correctMatch[e.stmt_id]) falseNegatives++; // should have matched but didn't
    else correctlyFlaggedOrphans++; // correctly identified as unmatched
  }

  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const matchRate = matches.length / bank.length;

  const metrics = {
    total_bank_rows: bank.length,
    matched: matches.length,
    exceptions: exceptions.length,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    correctly_flagged_orphans: correctlyFlaggedOrphans,
    match_rate: Number(matchRate.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "matches.json"), JSON.stringify(matches, null, 2));
  fs.writeFileSync(path.join(outDir, "exceptions.json"), JSON.stringify(exceptions, null, 2));
  fs.writeFileSync(path.join(outDir, "audit_log.json"), JSON.stringify(auditLog, null, 2));
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));

  console.log("\n=== METRICS ===");
  console.log(metrics);
  console.log(`\nOutput written to ${outDir}/`);
}

run();