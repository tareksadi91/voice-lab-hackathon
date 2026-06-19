import { randomUUID } from "node:crypto";

export function makeMemoryStore() {
  const calls = [];
  return {
    async saveCall(call) {
      const rec = { id: call.id || randomUUID(), createdAt: call.createdAt || new Date().toISOString(), ...call };
      calls.push(rec);
      return rec;
    },
    async getLatestCall() {
      if (calls.length === 0) return null;
      return calls.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    },
    async claimProfile(id, email) {
      const rec = calls.find((c) => c.id === id) || calls[calls.length - 1];
      if (rec) rec.email = email;
      return rec || null;
    },
  };
}

// Insforge REST store — PostgREST-style, matches the docs as of 2026-06-19
// (https://docs.insforge.dev/api-reference/client/{create,query}-records).
//   - Endpoint: {baseUrl}/api/database/records/{table}
//   - Create: POST with a JSON ARRAY body; `Prefer: return=representation`
//     returns the created rows (without it the response is an empty array).
//   - Query latest: GET ?order=createdAt.desc&limit=1
//   - Auth: Authorization: Bearer <project API key>
// Prereq (on the day): create a table named INSFORGE_TABLE (default "calls")
// with columns: id (text), createdAt (text/timestamptz — name it EXACTLY
// createdAt to match the order param), dossier / paid_matches / peer_intros
// (jsonb). INSFORGE_BASE_URL is the project host root (no trailing /api).
export function makeInsforgeStore({
  baseUrl = process.env.INSFORGE_BASE_URL,
  apiKey = process.env.INSFORGE_API_KEY,
  table = process.env.INSFORGE_TABLE || "calls",
  fetchImpl = fetch,
} = {}) {
  const url = `${baseUrl}/api/database/records/${table}`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  return {
    async saveCall(call) {
      const rec = { id: call.id || randomUUID(), createdAt: call.createdAt || new Date().toISOString(), ...call };
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify([rec]), // body MUST be an array
      });
      if (!res.ok) throw new Error(`insforge saveCall ${res.status}`);
      return rec; // id is ours (uuid); no need to read the response back
    },
    async getLatestCall() {
      const res = await fetchImpl(`${url}?order=createdAt.desc&limit=1`, { headers });
      if (!res.ok) throw new Error(`insforge getLatest ${res.status}`);
      const data = await res.json();
      // Tolerate bare array or {records:[...]} envelope.
      const rows = Array.isArray(data) ? data : (data.records ?? []);
      return rows.length ? rows[0] : null;
    },
    // Claim a profile: PATCH the call row with the expert's email.
    async claimProfile(id, email) {
      const res = await fetchImpl(`${url}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`insforge claimProfile ${res.status}`);
      return { id, email };
    },
  };
}

export function getStore() {
  return process.env.STORE === "memory" ? makeMemoryStore() : makeInsforgeStore();
}
