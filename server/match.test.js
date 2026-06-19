import { test } from "node:test";
import assert from "node:assert/strict";
import { matchExpert, matchBuyer } from "./nebius.js";

const pool = {
  profiles: [{ id: "p01", name: "Maya", headline: "DS lead", signature_takes: ["opinionated AI tools"] }],
  requests: [
    { id: "r01", title: "Need AI design workflow advisor", company: "Northwind Pay", price: "$650 / call", problem: "bring AI in safely" },
    { id: "r02", title: "Audit AI UI quality", company: "Meridian", price: "$2k", problem: "scale safely" },
  ],
};
const dossier = { name: "Maya", signature_takes: ["opinionated AI tools"] };

function fakeFetch(payloadObj) {
  return async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(payloadObj) } }] }) });
}

test("matchExpert joins LLM {request_id,why} onto full request records, drops bad ids", async () => {
  const fetchImpl = fakeFetch({
    paid_matches: [
      { request_id: "r02", why: "fits the audit need" },
      { request_id: "r01", why: "your opinionated-tools take fits" },
      { request_id: "rXX", why: "hallucinated id, should be dropped" },
    ],
  });
  const r = await matchExpert(dossier, pool, { fetchImpl, apiKey: "x", model: "m", baseUrl: "http://t" });
  assert.equal(r.paid_matches.length, 2);                 // rXX dropped
  assert.equal(r.paid_matches[0].request_id, "r02");      // order preserved
  assert.equal(r.paid_matches[0].company, "Meridian");    // joined from pool
  assert.equal(r.paid_matches[0].why, "fits the audit need");
  assert.equal(r.paid_matches[0].price, "$2k");
  assert.equal(r.peer_intros, undefined);                 // peers removed
});

test("matchBuyer returns a shortlist with reasons", async () => {
  const fetchImpl = fakeFetch({ shortlist: [{ profile_id: "p01", name: "Maya", why: "shipped exactly this" }] });
  const r = await matchBuyer("who has shipped AI in a design system?", pool, { fetchImpl, apiKey: "x", model: "m", baseUrl: "http://t" });
  assert.ok(r.shortlist.length >= 1);
  assert.ok(r.shortlist[0].why);
});
