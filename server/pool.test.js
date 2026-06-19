import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPool } from "./pool.js";

test("pool has >=20 profiles and >=5 requests", () => {
  const { profiles, requests } = loadPool();
  assert.ok(profiles.length >= 20, `profiles=${profiles.length}`);
  assert.ok(requests.length >= 5, `requests=${requests.length}`);
});

test("every profile has the 9 dossier fields + id, ids unique", () => {
  const { profiles } = loadPool();
  const keys = ["id","name","headline","domain","subspecialties","seniority","contexts","signature_takes","wants_from_network","would_meet"];
  const ids = new Set();
  for (const p of profiles) {
    for (const k of keys) assert.ok(k in p, `missing ${k} in ${p.id}`);
    assert.ok(Array.isArray(p.signature_takes) && p.signature_takes.length >= 1, `${p.id} takes`);
    assert.ok(!ids.has(p.id), `dup id ${p.id}`);
    ids.add(p.id);
  }
});
