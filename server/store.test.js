import { test } from "node:test";
import assert from "node:assert/strict";
import { makeMemoryStore } from "./store.js";

test("memory store: save then getLatest returns the saved call with an id", async () => {
  const s = makeMemoryStore();
  assert.equal(await s.getLatestCall(), null);
  const saved = await s.saveCall({ dossier: { name: "X" }, paid_matches: [], peer_intros: [] });
  assert.ok(saved.id);
  const latest = await s.getLatestCall();
  assert.equal(latest.dossier.name, "X");
});

test("memory store: getLatest returns most recent", async () => {
  const s = makeMemoryStore();
  await s.saveCall({ dossier: { name: "A" }, paid_matches: [], peer_intros: [] });
  await s.saveCall({ dossier: { name: "B" }, paid_matches: [], peer_intros: [] });
  const latest = await s.getLatestCall();
  assert.equal(latest.dossier.name, "B");
});
