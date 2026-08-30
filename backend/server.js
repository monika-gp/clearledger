/**
 * server.js
 *
 * Express server for the ClearLedger dashboard.
 * Serves the static frontend, exposes reconciliation output as JSON,
 * and lets the dashboard trigger a live run (used for the demo).
 *
 * Run: node server.js
 * Then open: http://localhost:3001
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3001;
const outDir = path.join(__dirname, "..", "data", "output");
const frontendDir = path.join(__dirname, "..", "frontend");

let isRunning = false;
let lastRunError = null;

app.use(express.static(frontendDir));

app.get("/api/reconciliation-data", (req, res) => {
  try {
    const metrics = JSON.parse(fs.readFileSync(path.join(outDir, "metrics.json"), "utf-8"));
    const matches = JSON.parse(fs.readFileSync(path.join(outDir, "matches.json"), "utf-8"));
    const exceptions = JSON.parse(fs.readFileSync(path.join(outDir, "exceptions.json"), "utf-8"));
    const auditLog = JSON.parse(fs.readFileSync(path.join(outDir, "audit_log.json"), "utf-8"));
    res.json({ metrics, matches, exceptions, auditLog });
  } catch (err) {
    res.status(404).json({
      error: "No reconciliation output found yet.",
      details: err.message,
    });
  }
});

// Kicks off a real run of runReconciliation.js in the background.
// Used by the dashboard's "Run reconciliation" button for a live demo.
app.post("/api/run", (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: "A run is already in progress." });
  }
  isRunning = true;
  lastRunError = null;

  const child = spawn("node", ["runReconciliation.js"], { cwd: __dirname });

  child.stdout.on("data", (data) => process.stdout.write(data));
  child.stderr.on("data", (data) => process.stderr.write(data));

  child.on("close", (code) => {
    isRunning = false;
    if (code !== 0) lastRunError = `Process exited with code ${code}`;
  });

  res.json({ status: "started" });
});

app.get("/api/run-status", (req, res) => {
  res.json({ running: isRunning, error: lastRunError });
});

app.listen(PORT, () => {
  console.log(`ClearLedger dashboard running at http://localhost:${PORT}`);
});