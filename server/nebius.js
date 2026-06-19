export function parseJsonLoose(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return JSON.parse(body.slice(start, end + 1));
}

async function chat(messages, { fetchImpl = fetch, apiKey = process.env.NEBIUS_API_KEY, model = process.env.NEBIUS_MODEL, baseUrl = process.env.NEBIUS_BASE_URL } = {}) {
  const res = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.4, messages }),
  });
  if (!res.ok) throw new Error(`nebius ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

const EXTRACT_SYS = `You extract a structured expert dossier from an interview transcript about AI in design.
Return ONLY JSON with EXACTLY these keys:
name (string), headline (string), domain (string), subspecialties (string[]),
seniority (one of "IC","lead","head/director"), contexts (string[]),
signature_takes (string[], 1-3 spiky opinions), wants_from_network (string), would_meet (string).
"contexts" is the MOST IMPORTANT field: capture the HARD FACTS of their track record as concrete phrases. Experience counts in TWO equally-valid forms: (a) what they SHIPPED (products/projects/companies, shipped X, grew Y), AND (b) how they CHANGED A WORKFLOW (set guardrails for a tool, rolled it out safely to a team, introduced a practice, prevented a class of problems). Also capture: specific companies/teams, decision-maker vs contributor, exact tools/platforms/models used hands-on, team/scope they influenced, and recognition. Treat workflow/enablement impact as concretely as a shipped product (e.g. "set guardrails so Intercom's design team could ship PRs with Claude Code safely"). Prefer concrete experience over opinion.
Infer sensibly from the transcript; never invent specific employers not mentioned. No prose, JSON only.`;

export async function extractDossier(transcript, opts = {}) {
  const content = await chat([
    { role: "system", content: EXTRACT_SYS },
    { role: "user", content: `Transcript:\n${transcript}` },
  ], opts);
  return parseJsonLoose(content);
}

export { chat };

const EXPERT_MATCH_SYS = `You are a matchmaker for an expert network in AI design.
Given an expert DOSSIER and a POOL of paid buyer requests, return ALL requests that are a GENUINE fit — usually 3 to 6, best first. Include every request where the expert's real experience honestly applies; do not pad with weak ones, but don't be stingy either if several genuinely fit.
Return ONLY JSON: {
  "paid_matches": [ {"request_id": id, "why": ONE short, punchy sentence (max ~18 words) on why this expert fits} ]
}
Rules for "why": it MUST be grounded in the expert's ACTUAL contexts/experience from the dossier — never invent or imply experience they did not describe. One tight sentence naming the single most relevant real thing they did. No preamble like "As an X with Y...". If a request only loosely relates and you'd have to stretch or invent to justify it, LEAVE IT OUT. Order by fit, strongest first. JSON only.`;

const BUYER_MATCH_SYS = `You are a matchmaker for an expert network in AI design.
Given a buyer QUERY and a POOL of expert profiles, return the best 2-3 experts.
Return ONLY JSON: { "shortlist": [ {"profile_id": id, "name": profile.name, "why": one specific sentence} ] }.
The "why" must cite the profile's signature_takes or contexts. JSON only.`;

export async function matchExpert(dossier, pool, opts = {}) {
  const content = await chat([
    { role: "system", content: EXPERT_MATCH_SYS },
    { role: "user", content: `DOSSIER:\n${JSON.stringify(dossier)}\n\nREQUESTS:\n${JSON.stringify(pool.requests ?? [])}` },
  ], opts);
  const parsed = parseJsonLoose(content);
  // Join the LLM's {request_id, why} onto the full request record so the UI has
  // company / requester / problem / insights / price without trusting the model
  // to echo them back. Drop any hallucinated request_id.
  const byId = new Map((pool.requests ?? []).map((r) => [r.id, r]));
  const paid_matches = (parsed.paid_matches ?? [])
    .map((m) => { const r = byId.get(m.request_id); return r ? { ...r, request_id: r.id, why: m.why } : null; })
    .filter(Boolean);
  return { paid_matches };
}

export async function matchBuyer(query, pool, opts = {}) {
  const content = await chat([
    { role: "system", content: BUYER_MATCH_SYS },
    { role: "user", content: `QUERY:\n${query}\n\nPOOL:\n${JSON.stringify({ profiles: pool.profiles })}` },
  ], opts);
  return parseJsonLoose(content);
}
