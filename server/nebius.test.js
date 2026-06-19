import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDossier, parseJsonLoose } from "./nebius.js";

test("parseJsonLoose strips code fences", () => {
  const o = parseJsonLoose("```json\n{\"a\":1}\n```");
  assert.equal(o.a, 1);
});

test("extractDossier returns parsed 9-field dossier from a mocked Nebius reply", async () => {
  const fakeDossier = {
    name: "Maya", headline: "DS lead", domain: "AI in design",
    subspecialties: ["design systems"], seniority: "lead", contexts: ["fintech"],
    signature_takes: ["AI tools should be opinionated"], wants_from_network: "paid advisory",
    would_meet: "an eval researcher",
  };
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(fakeDossier) } }] }),
  });
  const d = await extractDossier("Hi I'm Maya, a design systems lead...", { fetchImpl, apiKey: "x", model: "m", baseUrl: "http://t" });
  assert.equal(d.name, "Maya");
  assert.equal(d.seniority, "lead");
  assert.ok(d.signature_takes.length >= 1);
});
