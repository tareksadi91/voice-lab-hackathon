# Confer — day-of runbook (Fri Jun 19, ~5h: 11:00–16:00)

Ordered. Each step ends with a green check before moving on. If you fall behind,
jump to **Cut-line** at the bottom — a working `?demo=1` beats a broken live call.

Spine, skin, replay, Vapi wiring, and the assistant prompt are already built and
pushed. Today is: keys → verify each integration → tune → rehearse.

---

## 0 · Pre-flight (do before 11:00 if you can) — ~10 min

```bash
cd ~/Documents/projects/voice-lab/confer   # or: git clone <repo> && cd confer
git pull
npm install
cp .env.example .env        # if not already present
STORE=memory npm start
```
- [ ] Open `http://localhost:3000/?mock=1` → interview streams → results render.
- [ ] Open `http://localhost:3000/?demo=1` → instant results (the stage net).
- [ ] `node --test` → 9/9.

Green = the whole demo already works offline. Everything below upgrades it to live.

---

## 1 · Nebius (LLM) — ~20 min

1. Get the API key from the Nebius Token Factory console; set in `.env`:
   `NEBIUS_API_KEY=...`  (base URL already correct: `https://api.tokenfactory.nebius.com/v1`)
2. List models, pick a FAST instruct one (not a reasoning model):
   ```bash
   curl -s https://api.tokenfactory.nebius.com/v1/models \
     -H "Authorization: Bearer $NEBIUS_API_KEY" | python3 -m json.tool | grep '"id"'
   ```
   Set `NEBIUS_MODEL=` to one of: `meta-llama/Llama-3.3-70B-Instruct`,
   `Qwen/Qwen2.5-72B-Instruct`, `deepseek-ai/DeepSeek-V3-0324` (whichever is live —
   watch the Jun 22 deprecation list).
3. Smoke-test extract + match on the fixture transcript (no Vapi needed):
   ```bash
   node --env-file=.env -e "import('./server/nebius.js').then(async m=>{const fs=await import('node:fs');const t=fs.readFileSync('seed/fixtures/transcript-maya.txt','utf8');const d=await m.extractDossier(t);console.log('DOSSIER',JSON.stringify(d,null,2));const {loadPool}=await import('./server/pool.js');console.log('MATCH',JSON.stringify(await m.matchExpert(d,loadPool()),null,2))})"
   ```
- [ ] Dossier has all 9 fields, sane values.
- [ ] `paid_matches` = 2, `peer_intros` = 1–2, each `why` names Maya's real take.
- If JSON won't parse: add `"Respond with a single JSON object and nothing else."` to the system prompt in `server/nebius.js`, or lower temperature.

---

## 2 · Vapi (voice) — ~40 min (riskiest; budget the most)

1. Dashboard → create an assistant → paste the System prompt from `VAPI_ASSISTANT.md`. Apply the recommended settings there (assistant speaks first, ~120s max).
2. Set in `.env`: `VAPI_PUBLIC_KEY=...`, `VAPI_ASSISTANT_ID=...`. Record the assistant id (non-secret) in `CONTEXT.md`.
3. Restart: `STORE=memory npm start`. Open `http://localhost:3000`, click **Use mic**, allow the mic.
4. FIRST log the raw events to confirm the SDK shape, then trust the filter:
   - In the browser console during a call: the `message` handler in `app.js` filters
     `m.type==="transcript" && m.transcriptType==="final"`. If no bubbles appear,
     temporarily `console.log(m)` inside `vapi.on("message", ...)` to see real field
     names and adjust.
- [ ] Status goes connecting → listening; transcript bubbles appear as you talk.
- [ ] On hang-up (after the read-back) status → matching, then results render.
- [ ] `?demo=1` still works (fallback intact).

If the ESM import fails: confirm `https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.5.2/+esm`
loads (Network tab); the default export is the Vapi class.

---

## 3 · Insforge (store + prize eligibility) — ~25 min

1. Create a table named `calls` (or set `INSFORGE_TABLE`) with columns:
   `id` text · `createdAt` text or timestamptz (name it EXACTLY `createdAt`) ·
   `dossier` jsonb · `paid_matches` jsonb · `peer_intros` jsonb.
   For the demo, set the table's RLS to allow the API key to insert/select
   (or use the project API key that bypasses RLS).
2. Set `.env`: `INSFORGE_BASE_URL=` (project host root, no `/api`), `INSFORGE_API_KEY=`.
3. Verify round-trip:
   ```bash
   STORE=insforge node --env-file=.env -e "import('./server/store.js').then(async m=>{const s=m.makeInsforgeStore();const r=await s.saveCall({dossier:{name:'ping'},paid_matches:[],peer_intros:[]});console.log('saved',r.id);const l=await s.getLatestCall();console.log('latest',l&&l.dossier&&l.dossier.name)})"
   ```
- [ ] Prints `saved <uuid>` then `latest ping`.
- If 404/parse error: check `INSFORGE_BASE_URL` has no `/api`, the table name, and
  the `createdAt` column name. Then set `STORE=insforge` in `.env` and restart.
- [ ] If it fights you, leave `STORE=memory` — Insforge is prize-eligibility, not a
  demo dependency. Don't sink more than ~25 min here.

---

## 4 · Seed tuning — ~30 min

Goal: the live matches feel inevitable for whatever you'll actually say on stage.
1. Do a real `Use mic` run as Maya (use `seed/fixtures/transcript-maya.txt` as a loose guide).
2. If a match is generic or wrong, sharpen the relevant `signature_takes` / `why_fit_signal`
   in `seed/pool.json` and re-run step 1 of section 1's smoke test.
- [ ] Two paid matches + 1–2 peers land, each with a specific, human `why`.
- [ ] Buyer flip: type "who has shipped AI inside a mature design system?" → good shortlist.

---

## 5 · Rehearsal — ~30 min

Run the exact stage flow 3×, timed (~3 min):
1. Live `Use mic` interview as the expert → read-back → results.
2. Presenter types the buyer query → shortlist.
3. Commercial line in one breath:
   *"Expert insight in an hour, not a week — experts opt in for high-fit paid demand,
   and the graph compounds every call."*
- [ ] Under ~3 min. Trim if over.

---

## 6 · Pre-flight before judging — ~10 min

- [ ] Mic permission granted in the demo browser (and the right mic selected).
- [ ] One full live call succeeds on venue wifi.
- [ ] Phone hotspot ready as wifi backup.
- [ ] `http://localhost:3000/?demo=1` confirmed working (the net).
- [ ] `ARCHITECTURE.html` open in a tab if a judge wants the system view.
- [ ] Browser zoom/font set so the results screen reads from the back of the room.

---

## Cut-line (if behind schedule)

Priority order — protect the wow, drop the rest:
1. **Working `?demo=1`** (already done). Worst case, you present the replay and narrate it.
2. **Live Nebius + Vapi** (sections 1–2). This is the real wow. Worth the time.
3. **Seed tuning** (section 4) — only as much as makes one run land.
4. **Insforge live** (section 3) — nice for the Insforge prize; skip if it fights back, keep `STORE=memory`.

Never let a broken integration block the demo: `STORE=memory` + `?demo=1` is always a complete, presentable product.
```
