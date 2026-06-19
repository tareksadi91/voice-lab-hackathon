import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "./pipeline.js";
import { makeMemoryStore } from "./store.js";

test("runPipeline extracts, matches, stores, and returns a full call", async () => {
  const pool = { profiles: [{ id: "p01", name: "Maya" }], requests: [{ id: "r01", title: "T" }] };
  const store = makeMemoryStore();
  const extract = async () => ({ name: "Maya", signature_takes: ["x"] });
  const match = async () => ({
    paid_matches: [{ request_id: "r01", title: "T", why: "a" }, { request_id: "r01", title: "T", why: "b" }],
  });
  const call = await runPipeline("transcript text", { pool, store, extract, match });
  assert.equal(call.dossier.name, "Maya");
  assert.equal(call.paid_matches.length, 2);
  assert.equal(call.peer_intros, undefined);
  assert.ok(call.id);
  const latest = await store.getLatestCall();
  assert.equal(latest.id, call.id);
});
