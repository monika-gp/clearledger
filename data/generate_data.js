/**
 * Generates synthetic ledger.csv + bank_statement.csv + ground_truth.csv
 * for the ClearLedger reconciliation project.
 *
 * Noise types injected (mirrors real-world settlement behavior):
 *   - exact matches               (~55%)
 *   - date lag (T+1 to T+3)       (~15%)   -> settlement delay
 *   - amount mismatch (fees etc.) (~10%)   -> gateway/bank fee deducted
 *   - garbled narration           (~10%)   -> needs fuzzy match, not exact string
 *   - orphans (no counterpart)    (~10%)   -> should be correctly flagged as exceptions
 *
 * Run: node generate_data.js
 */

const fs = require("fs");
const path = require("path");

// --- seeded RNG (mulberry32) so output is reproducible like the Python version ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) =>
  Number((rand() * (max - min) + min).toFixed(decimals));
const choice = (arr) => arr[randInt(0, arr.length - 1)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const COMPANIES = [
  "Acme Traders", "Bluepeak Retail", "Nimbus Logistics", "Coral Foods",
  "Vertex Industries", "Silverline Textiles", "Orbit Electronics",
  "Maple & Co", "Redwood Pharma", "Zenith Auto Parts", "Harbor Exports",
  "Greenfield Agro", "Falcon Freight", "Ivory Interiors", "Pinnacle Steel",
  "Lotus Handicrafts", "Quantum Devices", "Amber Foods", "Crestline Media",
  "Solstice Energy",
];
const BANK_PREFIXES = ["NEFT", "IMPS", "RTGS", "UPI"];

function randDate(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const d = new Date(startMs + rand() * (endMs - startMs));
  return d;
}
function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function garbleNarration(company, ref) {
  const tokens = company.toUpperCase().replace("&", "AND").split(" ");
  const short = tokens.map((t) => t.slice(0, 3)).join("");
  const prefix = choice(BANK_PREFIXES);
  const refVariant = rand() < 0.5 ? ref.replace("-", "") : ref;
  return `${prefix} ${short} ${refVariant}`;
}

function toCSV(rows, fields) {
  const header = fields.join(",");
  const lines = rows.map((r) =>
    fields.map((f) => String(r[f])).join(",")
  );
  return [header, ...lines].join("\n") + "\n";
}

function main() {
  const startDate = new Date("2026-08-01");
  const endDate = new Date("2026-08-20");

  const nMatched = 44;
  const nLedgerOrphans = 6;
  const nBankOrphans = 6;

  const nExact = Math.floor(nMatched * 0.55);
  const nDateLag = Math.floor(nMatched * 0.2);
  const nAmountMismatch = Math.floor(nMatched * 0.13);
  const nGarbled = nMatched - nExact - nDateLag - nAmountMismatch;

  let categories = [
    ...Array(nExact).fill("exact"),
    ...Array(nDateLag).fill("date_lag"),
    ...Array(nAmountMismatch).fill("amount_mismatch"),
    ...Array(nGarbled).fill("garbled"),
  ];
  categories = shuffle(categories);

  const ledgerRows = [];
  const bankRows = [];
  const groundTruth = [];

  let ledgerId = 1000;
  let stmtId = 5000;

  for (const cat of categories) {
    ledgerId++;
    stmtId++;
    const company = choice(COMPANIES);
    const baseAmount = randFloat(500, 50000);
    const ledgerDate = randDate(startDate, endDate);
    const ref = `INV-${randInt(2000, 2999)}`;
    const utr = `UTR${randInt(100000, 999999)}`;

    const txnId = `LED-${ledgerId}`;
    const stmtIdStr = `STM-${stmtId}`;

    let bankDate = ledgerDate;
    let bankAmount = baseAmount;
    let narration = `${choice(BANK_PREFIXES)} ${company.toUpperCase()} ${ref}`;

    if (cat === "date_lag") {
      bankDate = addDays(ledgerDate, randInt(1, 3));
    } else if (cat === "amount_mismatch") {
      const fee = Number((baseAmount * randFloat(0.005, 0.02, 4)).toFixed(2));
      bankAmount = Number((baseAmount - fee).toFixed(2));
    } else if (cat === "garbled") {
      narration = garbleNarration(company, ref);
    }

    ledgerRows.push({
      txn_id: txnId, date: isoDate(ledgerDate), amount: baseAmount,
      counterparty: company, reference: ref, status: "settled",
    });
    bankRows.push({
      stmt_id: stmtIdStr, date: isoDate(bankDate), amount: bankAmount,
      narration, utr,
    });
    groundTruth.push({ txn_id: txnId, stmt_id: stmtIdStr, match_type: cat });
  }

  for (let i = 0; i < nLedgerOrphans; i++) {
    ledgerId++;
    const company = choice(COMPANIES);
    const amount = randFloat(500, 50000);
    const d = randDate(startDate, endDate);
    const ref = `INV-${randInt(2000, 2999)}`;
    const txnId = `LED-${ledgerId}`;
    ledgerRows.push({
      txn_id: txnId, date: isoDate(d), amount,
      counterparty: company, reference: ref, status: "pending",
    });
    groundTruth.push({ txn_id: txnId, stmt_id: "", match_type: "ledger_orphan" });
  }

  for (let i = 0; i < nBankOrphans; i++) {
    stmtId++;
    const company = choice(COMPANIES);
    const amount = randFloat(500, 50000);
    const d = randDate(startDate, endDate);
    const ref = `INV-${randInt(2000, 2999)}`;
    const utr = `UTR${randInt(100000, 999999)}`;
    const stmtIdStr = `STM-${stmtId}`;
    const narration = `${choice(BANK_PREFIXES)} ${company.toUpperCase()} ${ref}`;
    bankRows.push({ stmt_id: stmtIdStr, date: isoDate(d), amount, narration, utr });
    groundTruth.push({ txn_id: "", stmt_id: stmtIdStr, match_type: "bank_orphan" });
  }

  const shuffledLedger = shuffle(ledgerRows);
  const shuffledBank = shuffle(bankRows);

  const dataDir = __dirname;
  fs.writeFileSync(
    path.join(dataDir, "ledger.csv"),
    toCSV(shuffledLedger, ["txn_id", "date", "amount", "counterparty", "reference", "status"])
  );
  fs.writeFileSync(
    path.join(dataDir, "bank_statement.csv"),
    toCSV(shuffledBank, ["stmt_id", "date", "amount", "narration", "utr"])
  );
  fs.writeFileSync(
    path.join(dataDir, "ground_truth.csv"),
    toCSV(groundTruth, ["txn_id", "stmt_id", "match_type"])
  );

  console.log(`ledger.csv: ${ledgerRows.length} rows`);
  console.log(`bank_statement.csv: ${bankRows.length} rows`);
  console.log(`ground_truth.csv: ${groundTruth.length} rows`);
  console.log(
    `Breakdown: exact=${nExact}, date_lag=${nDateLag}, amount_mismatch=${nAmountMismatch}, ` +
    `garbled=${nGarbled}, ledger_orphans=${nLedgerOrphans}, bank_orphans=${nBankOrphans}`
  );
}

main();
