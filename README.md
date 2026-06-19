# Confer

**A voice-fed expert network.** A voice agent interviews an expert about their
domain, extracts a structured dossier, and surfaces high-fit **paid demand** and
relevant **peers** — from a graph that compounds with every call.

Built at the Midsummer Multimodal AI Hackathon (SF, Jun 19 2026).

**Stack:** [Vapi](https://vapi.ai) (voice) · [Nebius Token Factory](https://tokenfactory.nebius.com) (LLM) · [Insforge](https://insforge.dev) (backend) · Express + vanilla JS frontend (no build step).

## The demo

1. You're invited as an expert in a topic (carried in the link as `?topic=`).
2. A ~90-second voice interview builds your profile — name, headline, specialties,
   concrete track record.
3. The screen shows your dossier plus **matched paid opportunities** ("a company
   needs exactly your take on X") with a *why* for each match.

## Quick start

No keys needed — runs fully offline in `memory` store mode with a mock interview.

```bash
cp .env.example .env      # defaults are demo-safe (STORE=memory)
npm install
npm start                 # http://localhost:3000
```

Useful URLs:

| URL | What it does |
|-----|--------------|
| `/` | Live flow. Falls back to the mock interview if no Vapi key is set. |
| `/?mock=1` | Offline end-to-end: canned interview → server stores a fixture → results render. Proves the pipeline with no keys. |
| `/?demo=1` | Instant replay of a known-good dossier + matches. The on-stage safety net. |
| `/?topic=B2B%20SaaS` | Scope the invite/interview to a different topic. |

`npm run dev` runs with `--watch`. `npm test` runs the node test suite (`server/*.test.js`).

## Configuration

All secrets live in `.env` (gitignored). See `.env.example` for the full list.

| Var | Purpose |
|-----|---------|
| `PORT` | HTTP port (default 3000). |
| `STORE` | `memory` (default, zero-dep demo) or `insforge`. |
| `NEBIUS_API_KEY` / `NEBIUS_BASE_URL` / `NEBIUS_MODEL` | LLM for dossier extraction + matching. Unset → deterministic fallbacks. |
| `INSFORGE_BASE_URL` / `INSFORGE_API_KEY` / `INSFORGE_TABLE` | Persistent store when `STORE=insforge`. |
| `VAPI_PUBLIC_KEY` / `VAPI_ASSISTANT_ID` | Browser voice call. Unset → mock interview. Public key is browser-safe (served via `/api/config`). |

Graceful degradation is built in: with no keys the app still runs the full flow
against mocks, so it never strands on a blank screen.

## How it works

```
Vapi voice interview  →  Nebius extract (dossier)  →  Nebius match (vs. seed pool)  →  Insforge store
        │                                                                                    │
        └────────────── browser polls /api/latest ──────────── results screen ◄─────────────┘
```

- **Frontend** (`public/`): `index.html` + `app.js`. Live call stage (canvas
  ring, collapsible transcript, end-call), then a results screen of paid
  opportunities. Polls `/api/latest` for the stored call.
- **Pipeline** (`server/pipeline.js`): `extract → match → save`, each step
  swappable (real Nebius or mock).
- **Seed pool** (`seed/pool.json`): pre-seeded buyer requests so matches land
  live (cold-start fix for the demo).

### Key endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/config` | Browser-safe Vapi keys. |
| `POST` | `/api/process` | Run the pipeline on a transcript. |
| `GET` | `/api/latest` | Most recent stored call (poll target). |
| `POST` | `/api/save-profile` | Claim a profile by email. |
| `POST` | `/api/buyer` | Buyer query → expert shortlist. |
| `POST` | `/api/mock-process` | Dev-only: store a fixture call (auto-off with real keys). |

## Project layout

```
public/           Frontend (index.html, app.js, fixtures)
server/           Express app, pipeline, Nebius/Insforge clients, tests
seed/             Expert + buyer-request seed data
migrations/       Insforge table SQL
ARCHITECTURE.html Living architecture doc (open in a browser)
VAPI_ASSISTANT.md Voice assistant system prompt (source of truth)
PRODUCT.md        Product brief + design principles
CONTEXT.md        Project context + hackathon notes
DAYOF-RUNBOOK.md  Live-key setup + rehearsal steps
```

## Notes

- The Vapi assistant prompt is improvised (nothing spoken verbatim). The
  "what happens next" closing is delivered by a deterministic `endCallMessage`
  so the wrap-up always plays in full before hangup. Source of truth: `VAPI_ASSISTANT.md`.
- This is an experiment under `voice-lab/`, not a production service.
