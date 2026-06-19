import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPool } from "./pool.js";
import { getStore } from "./store.js";
import { extractDossier, matchExpert, matchBuyer } from "./nebius.js";
import { runPipeline } from "./pipeline.js";
import { MOCK_CALL, mockShortlist } from "./mock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "..", "public")));

let pool;
try {
  pool = loadPool();
} catch (e) {
  console.error(`Failed to load seed/pool.json: ${e}`);
  process.exit(1);
}
const store = getStore();

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/config", (_req, res) =>
  res.json({ vapiPublicKey: process.env.VAPI_PUBLIC_KEY || "", vapiAssistantId: process.env.VAPI_ASSISTANT_ID || "" }));

app.post("/api/process", async (req, res) => {
  try {
    const { transcript } = req.body || {};
    if (!transcript) return res.status(400).json({ error: "transcript required" });
    const call = await runPipeline(transcript, { pool, store, extract: extractDossier, match: matchExpert });
    res.json(call);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get("/api/latest", async (_req, res) => {
  try { res.json((await store.getLatestCall()) || {}); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// Claim a profile: save the expert's email against their call so they keep
// getting matched. Light email validation; no auth (hackathon).
app.post("/api/save-profile", async (req, res) => {
  try {
    const { id, email } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "valid email required" });
    }
    let callId = id;
    if (!callId) callId = (await store.getLatestCall())?.id;
    if (!callId) return res.status(404).json({ error: "no profile to claim" });
    await store.claimProfile(callId, email);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.post("/api/buyer", async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: "query required" });
    // Offline: no Nebius key → deterministic shortlist from the seed pool.
    if (!process.env.NEBIUS_API_KEY) return res.json({ shortlist: mockShortlist(pool) });
    res.json(await matchBuyer(query, pool));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Dev-only: store a fixture call so the screen flow (store→latest→poll→render)
// can be proven end-to-end with no Vapi and no Nebius. Drop before/ignore in prod.
app.post("/api/mock-process", async (_req, res) => {
  try { res.json(await store.saveCall(MOCK_CALL)); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Confer on http://localhost:${port}`));

export { app };
