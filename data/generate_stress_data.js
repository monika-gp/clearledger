/**
 * generate_stress_data.js
 *
 * A small, deliberately adversarial dataset: pairs of ledger entries with
 * IDENTICAL amount and date but DIFFERENT counterparties — the kind of
 * ambiguity naive matching (and even a careless AI) can get wrong by
 * picking the first/nearest candidate instead of recognizing genuine
 * ambiguity.
 *
 * This is a stress test, not the main evaluation set: it exists to show
 * what ClearLedger does when there is NOT a clean answer — the honest
 * outcome here is a correctly low-confidence match or an exception
 * routed to human review, not a confident guess.
 *
 * Run: node generate_stress_data.js
 */

const fs = require("fs");
const path = require("path");

const COMPANIES = [
  ["Acme Traders", "Apex Traders"],       // deliberately similar names too
  ["Coral Foods", "Crestline Foods"],
  ["Vertex Industries", "Vantage Industries"],
];

function toCSV(rows, fields) {
  const header = fields.join(",");
  const lines = rows.map((r) => fields.map((f) => String(r[f])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

function main() {
  const ledgerRows = [];
  const bankRows = [];
  const groundTruth = [];

  let ledgerId = 9000;
  let stmtId = 9500;

  COMPANIES.forEach(([companyA, companyB], i) => {
    const sharedDate = `2026-08-${15 + i}`;
    const sharedAmount = (10000 + i * 3333.33).toFixed(2);

    // Two ledger entries, same amount, same date, different companies —
    // genuinely ambiguous on amount+date alone.
    ledgerId++;
    const idA = `LED-${ledgerId}`;
    ledgerRows.push({
      txn_id: idA, date: sharedDate, amount: sharedAmount,
      counterparty: companyA, reference: `INV-${9000 + i}A`, status: "settled",
    });

    ledgerId++;
    const idB = `LED-${ledgerId}`;
    ledgerRows.push({
      txn_id: idB, date: sharedDate, amount: sharedAmount,
      counterparty: companyB, reference: `INV-${9000 + i}B`, status: "settled",
    });

    // ONE bank row, matching company A's narration clearly enough that
    // a system actually reading the text (not just amount+date) should
    // resolve it correctly — this tests whether narration reasoning
    // breaks the tie the way it's supposed to.
    stmtId++;
    const sId = `STM-${stmtId}`;
    bankRows.push({
      stmt_id: sId, date: sharedDate, amount: sharedAmount,
      narration: `NEFT ${companyA.toUpperCase()} INV${9000 + i}A`,
      utr: `UTR${900000 + i}`,
    });

    groundTruth.push({ txn_id: idA, stmt_id: sId, match_type: "ambiguous_resolved_by_narration" });
    groundTruth.push({ txn_id: idB, stmt_id: "", match_type: "ambiguous_unmatched_sibling" });
  });

  const outDir = path.join(__dirname, "stress");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "stress_ledger.csv"),
    toCSV(ledgerRows, ["txn_id", "date", "amount", "counterparty", "reference", "status"]));
  fs.writeFileSync(path.join(outDir, "stress_bank_statement.csv"),
    toCSV(bankRows, ["stmt_id", "date", "amount", "narration", "utr"]));
  fs.writeFileSync(path.join(outDir, "stress_ground_truth.csv"),
    toCSV(groundTruth, ["txn_id", "stmt_id", "match_type"]));

  console.log(`Stress dataset written to ${outDir}/`);
  console.log(`${ledgerRows.length} ledger rows (${COMPANIES.length} ambiguous pairs), ${bankRows.length} bank rows`);
}

main();
