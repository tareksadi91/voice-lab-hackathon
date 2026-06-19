# Confer — voice-fed expert network (hackathon build)

Working name: **Confer** (rename freely — "to confer" = consult an expert *and* bring people together). Alts considered: Savant, Convene, Voxpert, Warmline.

## What it is
A voice agent that interviews an expert on a domain → extracts a structured dossier → matches them to **high-fit paid demand + relevant peers**, from a graph that compounds every call. Two-sided: **experts** (supply — opt in for paid demand + less spam + a reputation profile; peer access = premium), **companies** (demand — pay to query). The durable asset is the **expertise GRAPH** (who knows what, who should meet whom, which problems cluster) — not the call transaction.

## Hackathon context
Midsummer Multimodal AI Hackathon — Fri Jun 19, SF, ~5h real build (11:00–16:00). Credits: $100 Nebius (LLM), $50 Vapi (voice), $25 Insforge (backend). Prize tracks: **Vapi best voice ($500 + AirPods)** and **most commercially viable voice ($1000)**; Nebius $500; Insforge $500/300/100. Team 1–3 (2 recommended).

## The build (single flow — one vertical, one flow, one wow)
Vapi assistant interviews + reads back → Nebius extracts dossier + matches + synthesizes → Insforge stores the growing graph.
- **Pre-seed ~20 expert profiles + a few open "buyer requests" in ONE vertical** so matches/synthesis land live (cold-start fix for the demo).
- **Demo:** judge role-plays an expert → 90-sec voice interview → screen shows their dossier + 2 matched paid requests ("a company needs exactly your take on X") + 1–2 peer intros with *why*. Then flip: "a buyer asked X → here's the shortlist from the network."
- **Commercial line ($1000 track):** "expert insight in an hour, not a week; experts opt in for high-fit paid demand; the graph compounds every call."
- **Scope discipline:** cut everything that isn't the single wow (agent speaks a real, specific match about a real person). No config screens.

## Incentive design (from market research)
Cash is the cleanest expert incentive (GLG/AlphaSights pay ~$1k+/call). So **lead expert value with paid demand + less spam + reputation profile**; peer-intros / insight-swap = a **premium layer, not the main currency**. Incumbents (GLG, AlphaSights, Guidepoint, Third Bridge; NewtonX already has a knowledge-graph + AI sourcing) optimize one-off compliant calls. The opening = **monetization + peer-graph + reusable graph intelligence in one product**. Company-scale risks (compliance/MNPI, two-sided cold-start, liquidity) are real for a company but irrelevant for the hackathon demo.

## Build status (Jun 19, build day)
**Living architecture doc:** open `ARCHITECTURE.html` (`open ARCHITECTURE.html`) — flowcharts of the component map + call lifecycle, a colour-coded 12-task status board, endpoints/files, and the demo-day flow. Keep it current by editing the `STATUS` array + Mermaid blocks inside it.

Spine done + skinned. Run: `cp .env.example .env` then `STORE=memory npm start` (port 3000).
- **`/?demo=1`** — instant replay (known-good dossier+matches). The stage safety net.
- **`/?mock=1`** — offline end-to-end: streams a canned interview → server stores a fixture call → poll renders results. Proves the flow with no keys.
- **Buyer box** returns a deterministic pool shortlist when `NEBIUS_API_KEY` is unset (auto-switches to real Nebius once set).
- Tasks left for the day (need live keys + mic): **9** Vapi Web SDK voice wiring (paste `VAPI_ASSISTANT.md` prompt in dashboard), **10** fill `.env` + tune seed live + `STORE=insforge` verify, **12** rehearsal. Skin (Task 11) is done.
- Dev-only routes `POST /api/mock-process` + the no-key buyer branch live in `server/mock.js`; harmless, auto-disabled with real keys.

## Credentials / IDs (fill in as you build — secrets go in `.env`, NOT here)
- Vapi assistant ID: _TBD_
- Vapi phone number: _TBD_
- Nebius model / project: _TBD_
- Insforge project: _TBD_
- API keys → `.env` in this folder (gitignored). This file holds only non-secret IDs + notes.

## Connection to Sunlight
A voice **tangent**, not a pivot. But it rhymes: a **voice-fed proprietary expertise graph** = Sunlight's graph competency + the "live strategic intelligence network" framing. If this resonates post-hackathon, it's a candidate adjacent direction. Sunlight strategy lives at `~/Desktop/sunlight/CONTEXT.md`.

## Idea-filter that produced this (for future tangents)
Survived: **user opts in + gets a takeaway**; replaces **expensive human 1:1 conversation**; **multiplayer/connector** angle (Boardy-like) is the novel seam. Rejected: receptionist / sales-practice / support / recruiting-screener (commodity), product narration (wastes the user's time), cold outbound to web visitors (intrusive).
