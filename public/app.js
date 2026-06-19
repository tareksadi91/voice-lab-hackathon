import { DEMO_CALL } from "/demo-fixture.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

// Each invite is topic-scoped: an expert is reached out to on a specific
// subject (AI design, B2B SaaS, …) carried in the link as ?topic=. The landing
// emphasizes it and the interview is framed around it. Default keeps the
// hackathon demo on "AI design".
const TOPIC = (params.get("topic") || "").trim() || "AI design";

// Brand/product names the transcriber should lock onto (Deepgram nova-3 keyterm
// prompting). Transcribers mangle novel proper nouns; listing demo names here +
// the prompt's spell-back makes capture reliable. Add any you'll mention.
// Override per-session via ?keyterms=Foo,Bar.
const KEYTERMS = [
  "Claude Code", "Claude", "Figma", "Cursor", "Claude Design", "MagicPatterns", "Lovable",
  "Intercom", "Confer", "Vapi", "Nebius", "Insforge",
  ...(params.get("keyterms") || "").split(",").map((s) => s.trim()).filter(Boolean),
];

// Reflect the invite topic on the landing.
const _topicEl = $("#invite-topic"); if (_topicEl) _topicEl.textContent = TOPIC;

// --- status pill -----------------------------------------------------------
const STATUS = {
  idle:       { text: "idle",         pill: "Idle",       dot: "bg-neutral-500" },
  connecting: { text: "connecting…",  pill: "Connecting", dot: "bg-amber-400 dot-live" },
  listening:  { text: "Listening…",   pill: "Listening",  dot: "bg-rose-500 dot-live" },
  matching:   { text: "matching…",    pill: "Matching",   dot: "bg-sky-400 dot-live" },
  done:       { text: "done",         pill: "Done",       dot: "bg-emerald-400" },
  demo:       { text: "demo",         pill: "Replay",     dot: "bg-fuchsia-400" },
};
function setStatus(key) {
  const s = STATUS[key] ?? STATUS.idle;
  const st = $("#status"); if (st) st.textContent = s.text;
  const pill = $("#status-pill"); if (pill) pill.textContent = s.pill;
  const dot = $("#status-dot"); if (dot) dot.className = `h-2 w-2 rounded-full ${s.dot}`;
}
function showNotice(msg) {
  const n = $("#notice");
  n.textContent = msg;
  n.classList.remove("hidden");
}

// --- live call stage: reactive ring ----------------------------------------
// A centered canvas "blob ring" shown for the whole live call. Its radius wobbles
// with layered sine harmonics (always-alive idle) and swells with Vapi's
// volume-level (0..1, whoever is speaking). Sits straight on the green bg.
const _reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RING_GOLD = "#d9a441", RING_GOLD2 = "#b8842f"; // hex (canvas-safe across browsers)

let _vol = 0;            // latest volume level, peak-held, decays per frame
let _ringRAF = null;
let _ringCanvas = null, _ringCtx = null;
function setVolume(v) { _vol = Math.max(_vol, Math.min(1, v || 0)); }

// Each layer's outline = sum of a few harmonics with INCOMMENSURATE frequencies
// and independent phase drift, so the morph never repeats cleanly (organic, not a
// pulsing polygon). `spin` rotates the whole shape; `seed` de-syncs the layers.
const _ringLayers = [
  { col: RING_GOLD,  a: 0.85, w: 3,    spin: 0.16,  seed: 0.0,
    harm: [[2, 0.55, 0.23], [3, 0.30, -0.17], [5, 0.18, 0.41]] },
  { col: RING_GOLD2, a: 0.55, w: 2.25, spin: -0.11, seed: 2.1,
    harm: [[2, 0.40, -0.19], [4, 0.34, 0.13], [7, 0.16, -0.29]] },
  { col: RING_GOLD,  a: 0.30, w: 1.75, spin: 0.07,  seed: 4.3,
    harm: [[3, 0.42, 0.11], [5, 0.26, -0.23], [8, 0.14, 0.37]] },
];
function _drawRing(dt, vol) {
  const ctx = _ringCtx, W = _ringCanvas.width, H = _ringCanvas.height;
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);
  const baseR = Math.min(W, H) * 0.26;
  const amp = baseR * 0.20; // constant morph — does NOT react to speaking volume
  ctx.lineCap = "round";
  for (const L of _ringLayers) {
    const rot = dt * L.spin;                       // whole-shape rotation
    ctx.beginPath();
    const N = 160;
    for (let i = 0; i <= N; i++) {
      const ang = (i / N) * Math.PI * 2;
      // sum harmonics; each drifts in phase at its own rate → non-repeating morph
      let wob = 0;
      for (const [k, mag, rate] of L.harm) {
        wob += mag * Math.sin(k * ang + dt * rate * Math.PI + L.seed);
      }
      const r = baseR + amp * wob;
      const a = ang + rot;                          // spin the outline
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = L.a;
    ctx.strokeStyle = L.col;
    ctx.lineWidth = L.w;
    ctx.shadowColor = L.col;
    ctx.shadowBlur = 18;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
function startRing() {
  if (_ringRAF) return;
  _ringCanvas = $("#ring");
  if (!_ringCanvas) return;
  _ringCtx = _ringCanvas.getContext("2d");
  if (_reduceMotion) { _drawRing(0, 0.18); return; } // static, gently-tiered ring
  const t0 = performance.now();
  const tick = (t) => {
    const dt = (t - t0) / 1000;
    _vol *= 0.92; // decay toward idle each frame
    _drawRing(dt, _vol);
    _ringRAF = requestAnimationFrame(tick);
  };
  _ringRAF = requestAnimationFrame(tick);
}
function stopRing() {
  if (_ringRAF) cancelAnimationFrame(_ringRAF);
  _ringRAF = null;
  _vol = 0;
}

function setCallStatus(text) { const el = $("#call-status"); if (el) el.textContent = text; }

// Reset the transcript to its collapsed default for a fresh call.
function resetTranscriptToggle() {
  $("#transcript-wrap")?.classList.add("hidden");
  const t = $("#transcript-toggle");
  if (t) {
    t.classList.add("hidden");
    t.setAttribute("aria-expanded", "false");
    $("#transcript-toggle-label").textContent = "Show transcript";
  }
}

// Show the call stage. `connecting` = pre-connect (status hint, no controls);
// otherwise the call is live (controls + transcript toggle revealed).
function enterCallStage({ connecting }) {
  $("#intro").classList.add("hidden");
  $("#conn").classList.add("hidden");
  $("#call-stage").classList.remove("hidden");
  startRing();
  $("#call-hint").classList.toggle("hidden", !connecting);
  $("#end-call").classList.toggle("hidden", connecting);
  $("#transcript-toggle").classList.toggle("hidden", connecting);
}
function showConnecting() { setCallStatus("Connecting"); enterCallStage({ connecting: true }); }
function goLive() { setCallStatus("Listening"); enterCallStage({ connecting: false }); }
function stopWave() { stopRing(); $("#call-stage").classList.add("hidden"); }

// Transcript show/hide toggle.
$("#transcript-toggle")?.addEventListener("click", () => {
  const wrap = $("#transcript-wrap");
  const nowHidden = wrap.classList.toggle("hidden");
  $("#transcript-toggle").setAttribute("aria-expanded", String(!nowHidden));
  $("#transcript-toggle-label").textContent = nowHidden ? "Show transcript" : "Hide transcript";
});

// End call: stop the live Vapi call (call-end handler drives the rest).
$("#end-call")?.addEventListener("click", () => { try { vapi?.stop(); } catch {} });

// --- interstitial loader ---------------------------------------------------
// After the conversation ends, show "Creating your profile" then flip to
// "Matching opportunities" while the backend builds the dossier + matches.
// renderResults waits out LOADER_MIN_MS so both phases are always seen.
const LOADER_MIN_MS = 3200;
let _loaderStart = 0;
let _loaderPhase = null;
function showLoader() {
  stopWave();
  $("#interview").classList.add("hidden");
  $("#results").classList.add("hidden");
  $("#loading").classList.remove("hidden");
  const el = $("#loading-text");
  el.style.opacity = "1";
  el.textContent = "Creating your profile";
  _loaderStart = performance.now();
  clearTimeout(_loaderPhase);
  _loaderPhase = setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => { el.textContent = "Matching opportunities for you"; el.style.opacity = "1"; }, 220);
  }, 1700);
}
function hideLoader() {
  clearTimeout(_loaderPhase);
  _loaderStart = 0;
  $("#loading").classList.add("hidden");
}

// --- transcript teleprompter (last few turns, older dissolve into the bg) ----
const TRANSCRIPT_KEEP = 3; // visible turns; older are unmounted
let _lastBubble = null;
let _lastBubbleRole = null;
function addBubble(role, text, forceNew = false) {
  if (!forceNew && _lastBubble && _lastBubbleRole === role) {
    _lastBubble.querySelector(".t-text").textContent += " " + text;
  } else {
    const b = document.createElement("div");
    b.className = "flex gap-5 t-enter";
    const labelColor = role === "user" ? "oklch(54% 0.06 152)" : "oklch(74% 0.14 78)";
    const label = role === "user" ? "YOU" : "CONFER";
    b.innerHTML = `<span class="t-label shrink-0 w-14 text-xs font-semibold tracking-widest pt-0.5 select-none" style="color:${labelColor};letter-spacing:0.1em">${label}</span><span class="t-text leading-relaxed" style="color:oklch(85% 0.006 80)">${esc(text)}</span>`;
    const t = $("#transcript");
    t.appendChild(b);
    // Keep only the last few turns mounted; the mask fades the topmost one out.
    while (t.children.length > TRANSCRIPT_KEEP) t.removeChild(t.firstChild);
    _lastBubble = b;
    _lastBubbleRole = role;
  }
}

// --- result rendering ------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Initials avatar for a requester (no photos in the seed).
function initials(name) {
  return String(name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
}

// --- save / claim profile --------------------------------------------------
let _currentCallId = null;
let _profileSaved = false;
let _savedEmail = "";

async function saveProfile(email) {
  const res = await fetch("/api/save-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: _currentCallId, email }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  _profileSaved = true;
  _savedEmail = email;
  // Profile saved → dismiss the sticky bar.
  $("#save-bar").classList.add("hidden");
  return true;
}

// Sticky-bar submit.
$("#save-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#save-email").value.trim();
  if (!email) return;
  const btn = $("#save-form").querySelector("button");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await saveProfile(email);
    $("#save-bar-text").textContent = "Saved. We'll email you new matches.";
  } catch {
    btn.disabled = false; btn.textContent = "Save profile";
    $("#save-bar-text").textContent = "Couldn't save, try again.";
  }
});

// Wire the Accept button. If the profile isn't saved yet, Accept first captures
// an email inline (peak intent), then sends; once saved, Accept just sends.
function markSent(btn) {
  btn.textContent = "Request sent ✓";
  btn.disabled = true;
  btn.style.opacity = "0.6";
  btn.style.cursor = "default";
}
function wireAccept(el) {
  const btn = el.querySelector(".accept-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (_profileSaved) { markSent(btn); return; }
    if (el.querySelector(".accept-gate")) return; // already open
    const gate = document.createElement("form");
    gate.className = "accept-gate mt-3 flex gap-2 t-enter";
    gate.innerHTML = `
      <input type="email" required placeholder="you@work.com" autocomplete="email"
        class="grow rounded-full px-4 py-2 text-sm focus:outline-none"
        style="background:oklch(12% 0.04 152);border:1px solid var(--border);color:var(--ink)" />
      <button type="submit" class="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap hover:opacity-90"
        style="background:var(--gold);color:var(--on-gold)">Save & send</button>`;
    btn.parentElement.appendChild(gate);
    const gi = gate.querySelector("input");
    gi.focus();
    const help = document.createElement("p");
    help.className = "accept-gate-help mt-2 text-xs";
    help.style.color = "var(--ink-3)";
    help.textContent = "Save your profile to send this request.";
    btn.parentElement.appendChild(help);
    btn.style.display = "none";
    gate.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = gi.value.trim();
      if (!email) return;
      const gb = gate.querySelector("button");
      gb.disabled = true; gb.textContent = "Sending…";
      try {
        await saveProfile(email);
        gate.remove(); help.remove();
        btn.style.display = "";
        markSent(btn);
      } catch {
        gb.disabled = false; gb.textContent = "Save & send";
      }
    });
  });
}

// The single highlighted "Top fit" opportunity: gold-framed, generous, the
// match rationale is the lead. Editorial, not a templated card.
function topOpportunity(m) {
  const d = document.createElement("article");
  d.className = "rounded-2xl p-6 md:p-7 mb-3";
  d.style.cssText = "background:linear-gradient(180deg, oklch(22% 0.06 130), var(--raised));border:1px solid var(--gold-line);";
  d.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-5">
      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style="background:var(--gold);color:var(--on-gold);letter-spacing:0.1em">★ Top fit</span>
      <span class="text-sm font-semibold" style="color:var(--gold)">${esc(m.price ?? "")}</span>
    </div>

    <div class="flex items-center gap-3">
      <div class="shrink-0 h-10 w-10 rounded-full grid place-items-center text-xs font-bold" style="background:var(--gold-dark);color:var(--gold);border:1px solid var(--gold-line)">${esc(initials(m.requester))}</div>
      <div class="min-w-0">
        <div class="text-sm font-semibold" style="color:var(--ink)">${esc(m.company ?? "")}</div>
        <div class="text-xs" style="color:var(--ink-3)">${esc(m.industry ?? "")}</div>
      </div>
    </div>

    <h4 class="mt-5 text-xl font-semibold leading-snug" style="color:var(--ink)">${esc(m.title ?? "")}</h4>
    ${m.requester ? `<p class="mt-1 text-xs" style="color:var(--ink-3)">from ${esc(m.requester)}${m.requester_role ? `, ${esc(m.requester_role)}` : ""}</p>` : ""}

    ${m.problem ? `<div class="mt-5"><div class="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style="color:var(--ink-3);letter-spacing:0.12em">The problem</div><p class="text-base leading-relaxed" style="color:var(--ink-2)">${esc(m.problem)}</p></div>` : ""}
    ${m.insights_wanted ? `<div class="mt-4"><div class="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style="color:var(--ink-3);letter-spacing:0.12em">What they're looking for</div><p class="text-base leading-relaxed" style="color:var(--ink-2)">${esc(m.insights_wanted)}</p></div>` : ""}
    ${m.why ? `<p class="mt-5 text-sm leading-relaxed" style="color:var(--ink-3)"><span class="font-semibold" style="color:var(--gold)">Why you · </span>${esc(m.why)}</p>` : ""}

    <div class="mt-6 flex justify-end">
      <button class="accept-btn px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90" style="background:var(--gold);color:var(--on-gold)">Accept request</button>
    </div>`;
  wireAccept(d);
  return d;
}

// Remaining opportunities: flat editorial rows separated by hairlines, NOT a
// grid of identical bordered boxes. Lighter weight than the top fit. The first
// row sits below the gold top-fit card, so it skips the top hairline (which
// otherwise reads as a stray full-width line under the card).
function rowOpportunity(m, isFirst = false) {
  const d = document.createElement("article");
  d.className = isFirst ? "pb-6 pt-2" : "py-6 border-t";
  d.style.cssText = "border-color:var(--border);";
  d.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="shrink-0 h-9 w-9 rounded-full grid place-items-center text-xs font-bold" style="background:oklch(25% 0.05 152);color:var(--sage)">${esc(initials(m.requester))}</div>
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate" style="color:var(--ink)">${esc(m.company ?? "")}</div>
          <div class="text-xs truncate" style="color:var(--ink-3)">${esc(m.industry ?? "")}</div>
        </div>
      </div>
      <span class="shrink-0 text-sm font-semibold" style="color:var(--gold)">${esc(m.price ?? "")}</span>
    </div>

    <h4 class="mt-3 text-base font-semibold leading-snug" style="color:var(--ink)">${esc(m.title ?? "")}</h4>
    ${m.problem ? `<p class="mt-2 text-sm leading-relaxed" style="color:var(--ink-2)">${esc(m.problem)}</p>` : ""}
    ${m.insights_wanted ? `<p class="mt-2 text-sm leading-relaxed" style="color:var(--ink-2)"><span style="color:var(--ink-3)">Looking for · </span>${esc(m.insights_wanted)}</p>` : ""}
    ${m.why ? `<p class="mt-2 text-sm leading-relaxed" style="color:var(--ink-3)"><span class="font-semibold" style="color:var(--gold)">Why you · </span>${esc(m.why)}</p>` : ""}

    <div class="mt-4 flex justify-end">
      <button class="accept-btn px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90" style="background:transparent;color:var(--gold);border:1px solid var(--gold-line)">Accept</button>
    </div>`;
  wireAccept(d);
  return d;
}

let _pendingReveal = false;
export function renderResults(call) {
  if (!call || !call.dossier) return;
  // If the loader is up, let both phases play before revealing results.
  if (_loaderStart) {
    const remaining = LOADER_MIN_MS - (performance.now() - _loaderStart);
    if (remaining > 0) {
      if (_pendingReveal) return;
      _pendingReveal = true;
      setTimeout(() => { _pendingReveal = false; renderResults(call); }, remaining);
      return;
    }
  }
  // Hung-up-too-early / sparse interview → the backend returns an empty dossier
  // and no matches (no HTTP error, so the normal fallbacks never fire). Don't
  // strand the user on a blank results screen: drop to the known-good replay.
  // DEMO_CALL is always rich, so this can't loop.
  const thin = !call.dossier?.name || !(call.paid_matches?.length);
  if (thin && call.id !== "demo") {
    renderReplay("Interview was too short to match — showing a sample profile");
    return;
  }
  stopWave();
  hideLoader();
  $("#interview").classList.add("hidden");
  $("#results").classList.remove("hidden");
  const d = call.dossier;
  // Compact profile strip (was a left column) — name, headline, specialties inline.
  $("#profile").innerHTML = `
    <div class="text-[11px] font-semibold uppercase tracking-widest mb-2" style="color:var(--ink-3);letter-spacing:0.14em">Your profile</div>
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="text-2xl font-semibold leading-tight" style="color:var(--ink)">${esc(d.name ?? "")}</span>
      ${d.headline ? `<span class="text-sm" style="color:var(--ink-2)">${esc(d.headline)}</span>` : ""}
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      ${(d.subspecialties ?? []).map((s) => `<span class="px-2 py-0.5 rounded-full text-xs font-medium" style="background:oklch(25% 0.07 152);border:1px solid oklch(32% 0.09 152);color:var(--gold)">${esc(s)}</span>`).join("")}
      ${d.seniority ? `<span class="text-xs ml-1" style="color:var(--ink-3)">${esc(d.seniority)}</span>` : ""}
    </div>`;
  const matches = call.paid_matches ?? [];
  $("#paid-count").textContent = matches.length ? `${matches.length} matched` : "";
  $("#paid-matches").replaceChildren(
    ...matches.map((m, i) => (i === 0 ? topOpportunity(m) : rowOpportunity(m, i === 1)))
  );

  // Claim-profile: remember which call this is, show the sticky save bar
  // (unless already saved this session).
  _currentCallId = call.id || _currentCallId;
  if (!_profileSaved) {
    $("#save-bar-text").textContent = `Save your profile to keep getting paid ${TOPIC} requests.`;
    $("#save-bar").classList.remove("hidden");
  }
}

// --- live-path auto-fallback ----------------------------------------------
// Tomorrow's Vapi call-end handler calls processTranscript(transcript).
// If the backend errors (no keys, Nebius parse fail, wifi), we never strand
// the screen on a forever-poll — we drop to the known-good replay.
function renderReplay(reason) {
  setStatus("demo");
  if (reason) showNotice(reason);
  renderResults(DEMO_CALL);
}
export async function processTranscript(transcript) {
  setStatus("matching");
  showLoader();
  try {
    const res = await fetch("/api/process", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // success: the poll loop picks up the stored call and renders it.
    // Watchdog: if nothing renders within 8s, fall back to replay.
    setTimeout(() => {
      if ($("#results").classList.contains("hidden")) renderReplay("Live match slow — showing replay");
    }, 8000);
  } catch {
    renderReplay("Live match unavailable — showing replay");
  }
}

// --- poll /api/latest ------------------------------------------------------
// Only poll after an interview has started this session — prevents stale
// results from a previous run rendering on fresh page load.
let lastId = null;
let sessionStarted = false;
async function poll() {
  if (!sessionStarted) return;
  try {
    const call = await (await fetch("/api/latest")).json();
    if (call && call.id && call.id !== lastId) { lastId = call.id; setStatus("done"); $("#notice").classList.add("hidden"); renderResults(call); }
  } catch {}
}
setInterval(poll, 1500);


window.__renderResults = renderResults; // manual console testing

// --- mock interview: prove interview→store→poll→results offline (no keys) --
// Streams a canned transcript, then asks the server to store a fixture call;
// the normal poll loop renders it — exercising the real integration path.
// Reused as the no-key fallback when "Use mic" is clicked before Vapi is set.
async function runMockInterview() {
  try { const cur = await (await fetch("/api/latest")).json(); lastId = cur && cur.id ? cur.id : null; } catch {}
  sessionStarted = true;
  resetTranscriptToggle();
  goLive();
  const script = [
    ["assistant", "Hey! I'm Confer. We're a small, curated network — experts like you get matched with people who want their time. Before we dig in, how's your day going?"],
    ["user", "Pretty good, busy week but good. Thanks for having me."],
    ["assistant", "Glad to hear it. Let's keep this quick then — who are you and what do you work on, in a line?"],
    ["user", "Maya Okonkwo — I'm a design-systems lead, I shipped AI-assisted Figma workflows at a fintech."],
    ["assistant", "What's a strong opinion you'd defend that others push back on?"],
    ["user", "AI design tools should be opinionated, not blank-canvas. And design systems are the only place AI codegen is safe to ship today."],
    ["assistant", "Got it — pulling your matches now, check the screen."],
  ];
  setStatus("listening");
  for (const [role, text] of script) {
    addBubble(role, text, true);
    // fake "speaking" pulses so the waveform reacts during the mock
    const pulses = setInterval(() => setVolume(0.4 + Math.random() * 0.5), 120);
    await new Promise((r) => setTimeout(r, 900));
    clearInterval(pulses);
  }
  setStatus("matching");
  showLoader();
  try {
    const res = await fetch("/api/mock-process", { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // poll loop renders the stored call
  } catch {
    renderReplay("Mock backend unavailable — showing replay");
  }
}

// --- live voice (Vapi Web SDK) --------------------------------------------
// PRE-WRITTEN for Task 9, UNVERIFIED until tested live with real keys.
// Loaded as an ESM module on demand (no-build friendly), pinned to 2.5.2.
// Guarded so it cannot break the offline build: with no Vapi key configured,
// "Use mic" runs the mock interview instead.
//
// TOMORROW (on the day), verify against a real call:
//   1. The default export is the Vapi class (it is, per the 2.5.2 ESM build).
//   2. The message event shape: confirm m.type==="transcript" &&
//      m.transcriptType==="final" and m.role/m.transcript field names — log the
//      raw `message` events first, then trust the filter below.
//   3. That `call-end` fires after the assistant's read-back.
const VAPI_SDK = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.5.2/+esm";

// Calm, grounded male ElevenLabs voice (overrides the dashboard's Rachel).
// "Daniel" reads measured + serious without sounding corporate. High stability
// + zero style = steady, understated delivery (no theatrical/bro energy).
// Swap voiceId for another: Adam pNInz6obpgDQGcFmaJgB (deep/neutral),
// Antoni ErXwobaYiN019PkySvjV (warm), Arnold VR6AewLTigWG4xSOukaG (firm).
const CONFER_VOICE = {
  provider: "11labs",
  voiceId: "onwK4e9ZLuTAKqWW03F9",
  stability: 0.6,
  similarityBoost: 0.8,
  style: 0,
};

// System prompt overridden at call start so the interview behavior is
// deterministic regardless of dashboard config. Everything is IMPROVISED by the
// model — nothing below is spoken verbatim; the examples only set tone & shape.
// Mirrors VAPI_ASSISTANT.md (source of truth).
const CONFER_SYSTEM_PROMPT = `You are Confer — a friendly, sharp guy running a quick chat for Confer, a curated network of experts. This person was invited for their work in "${TOPIC}" — keep the whole conversation about what they've actually done in ${TOPIC}.

VOICE & TONE: Calm, grounded, and serious, but still human and easy. Talk like a thoughtful person who respects their time, not a corporate intake bot and not a hyped-up bro. Use contractions and plain language, but skip slangy filler ("cool", "awesome", "honestly", "for sure") and hype. Short, measured sentences. React naturally but understated. Genuinely curious and a little understated, like a sharp colleague, not a salesperson.

IMPROVISE EVERYTHING. Nothing in this prompt is a script. Do not recite any line verbatim. The phrasings below are only examples of TONE and SHAPE — always speak in your own natural words, reacting to this specific person.

OPENING — warm, human, a two-step welcome. FIRST turn: greet them, say who you are (Confer) and one friendly line about what Confer is — a small curated network where experts get matched with people who want their time — then ask how they're doing today. Light and genuine, not a formal welcome and not a pitch. Then STOP and let them answer. This greeting is its OWN turn — do NOT bundle the "how are you" with the first real question. WAIT for their reply, react briefly and naturally to it, and only THEN ask the first real question (their name and what they work on). (Example vibe, NOT to repeat: "Hey! I'm Confer. We're a small, curated network — experts like you get matched with people who want their time. Before we dig in, how's your day going?")

GOAL: in about 90 seconds, learn the person's CONCRETE TRACK RECORD — what they have actually done, not just what they think. Experts get matched on real experience. That experience counts in TWO forms, both equally valid: (a) things they SHIPPED (a product, feature, project, company), AND (b) how they CHANGED THE WAY A TEAM WORKS — workflow and process impact: guardrails they set, tools they rolled out and got a team to adopt safely, practices they introduced, problems they prevented. Many of the best experts are enablers, not just builders; treat "I changed how my design team uses X" as a strong, concrete answer, not a weak one. Fill this dossier:
- name
- a one-line headline (who they are)
- sub-specialties within ${TOPIC}
- seniority (IC / lead / head or director — infer from their role and scope, don't ask bluntly)
- contexts: the HARD FACTS of their experience — specific companies/teams/projects, whether they were the DECISION MAKER or a contributor, the exact tools/platforms/models they used hands-on, team size or scope they influenced, and concrete impact in either form: what they SHIPPED (shipped X, grew Y) OR how they CHANGED A WORKFLOW (set guardrails for X, rolled out Y safely to a team of Z, cut Z risk). Capture process/enablement impact as specifically as a shipped product.
- what they want from the network: paid work, or a specific kind of person to meet

STYLE: Curious, not a form. Lead a real conversation — listen to each answer and let your NEXT question follow naturally from what they just said.

CRITICAL — ONE QUESTION AT A TIME. Ask exactly one thing per turn. NEVER stack or bundle questions (do NOT ask "what was your role, team size, and tools?" — pick the single most useful next thing). Get the answer, react briefly, then ask the next single question.

REACT LIKE A HUMAN, DON'T PARROT. Do NOT robotically repeat the person's last words before the next question (no "Okay, Claude Code. Next..."). Instead react with something real: a genuine observation, a bit of recognition, or a light reaction, THEN ask. E.g. they say "I work in Claude Code" → "Claude Code, yeah, I'm hearing that more and more lately. Are you using it day to day, or more for prototyping?" Vary your reactions, never use a fixed template. Only echo a name back when you genuinely need to confirm you heard it right (an unusual or easily-misheard name); otherwise just respond naturally and move on.

KNOWN NAMES — these tools/brands come up in this space; if the transcript shows something close to one, assume that's what they meant and use the correct spelling: ${KEYTERMS.join(", ")}. In particular, "cloud code", "clawed code", "claude code", or "cloud" almost always mean Claude Code (Anthropic's coding tool) — treat them as Claude Code.

Always probe for SPECIFICS and EVIDENCE, one at a time: were they the decision maker or a contributor; which exact tool, used hands-on; what they shipped OR what they changed about how the team works, and what happened after; the scope (team size / who they enabled). If their contribution is a workflow change (e.g. "I set the guardrails so our designers could use Claude Code to ship PRs safely"), dig into THAT with the same rigor: what were the guardrails, what would have gone wrong without them, how many people now work that way. Prefer concrete facts over opinions — if they give a generic take, pull them back to a real example. Never interrogate. Keep it light and fast. Skip anything they've already volunteered.

GO DEEP ON ${TOPIC} — do NOT stay generic. Beyond role/tools/decision-maker, ask at least one or two questions that ONLY make sense for an expert in ${TOPIC}: the specific changes they personally initiated, the hard tradeoffs they navigated, the methods or practices unique to this field, and how their team's day-to-day actually changed. Derive these from ${TOPIC} itself. (For example, if the topic is AI design: what specific guardrails or practices did you put in place so the team could use AI tools safely? what did you change about how the design team works? what would have broken without it?) Use the equivalent depth for whatever ${TOPIC} is.

EXAMPLE angles to draw from (improvise, ONE per turn, never recite): the most significant thing they shipped OR the biggest change they drove in how their team works; whether they were the decision maker or executing someone else's call; which tool they worked in hands-on and what guardrails/practices they set around it; the scope (team size, who they enabled); what would make the network worth their time.

PACING: keep it FAST. After the warm greeting turn (which is just rapport, not a substantive question), it's about 3-4 real exchanges total. Ask short questions, let them answer, don't over-acknowledge. Once you have their name/headline, one concrete thing they shipped OR a workflow change they drove, and one topic-specific detail, move straight to the wrap-up. Do not end the call before you have that one concrete fact, but do not drag past 4 questions.

CLOSE — when you have what you need, speak ONE short, warm closing turn, THEN end the call. The system automatically speaks "what happens next" (building their profile, matching, results on screen) right after you end, so you do NOT need to recite those steps — keep your sign-off brief and human, just signal you're wrapping up and thank them. Never hang up silently and never end mid-sentence: finish your spoken sign-off, then end. (Example feel, improvise your own words, NOT verbatim: "Alright, that's everything I need — really good talking with you. Hang tight one sec.")`;

let turns = [];
let vapi = null;
let callEnded = false;

async function startInterview() {
  let cfg = {};
  try { cfg = await (await fetch("/api/config")).json(); } catch {}

  // No key yet → keep the demo useful: run the mock interview.
  if (!cfg.vapiPublicKey || !cfg.vapiAssistantId) {
    showNotice("No Vapi key set — running mock interview");
    return runMockInterview();
  }

  // Real in-browser voice call.
  // Seed lastId with the current stored call so the poll loop only renders a
  // NEW call from THIS interview — not a leftover from a previous run.
  try { const cur = await (await fetch("/api/latest")).json(); lastId = cur && cur.id ? cur.id : null; } catch {}
  sessionStarted = true;
  turns = [];
  callEnded = false;
  _lastBubble = null;
  _lastBubbleRole = null;
  $("#transcript").replaceChildren();
  resetTranscriptToggle();
  setStatus("connecting");
  showConnecting();
  try {
    const mod = await import(VAPI_SDK);
    const Vapi = mod.default?.default ?? mod.default ?? mod.Vapi ?? mod;
    vapi = new Vapi(cfg.vapiPublicKey);
    vapi.on("call-start", () => { setStatus("listening"); goLive(); });
    // Assistant speaking ↔ listening (drives the status line under the ring).
    vapi.on("speech-start", () => setCallStatus("Speaking"));
    vapi.on("speech-end", () => setCallStatus("Listening"));
    vapi.on("volume-level", (v) => setVolume(typeof v === "number" ? v : (v && v.volume) || 0));
    vapi.on("message", (m) => {
      console.log("[confer] vapi message:", JSON.stringify(m));
      if (m && m.type === "transcript" && m.transcriptType === "final") {
        const role = m.role === "user" ? "user" : "assistant";
        turns.push(`${role}: ${m.transcript}`);
        addBubble(role, m.transcript);
      }
    });
    vapi.on("call-end", () => {
      callEnded = true;
      stopWave();
      const t = turns.join("\n");
      if (t) { processTranscript(t); } else { renderReplay("No transcript captured — showing replay"); }
    });
    vapi.on("error", (e) => {
      console.error("[confer] vapi error:", e);
      try { console.error("[confer] vapi error detail:", JSON.stringify(e?.error ?? e, null, 2)); } catch {}
    });
    vapi.start(cfg.vapiAssistantId, {
      // Improvised opening: model generates the first message from the prompt.
      firstMessageMode: "assistant-speaks-first-with-model-generated-message",
      model: { provider: "openai", model: "gpt-5.4-mini", messages: [{ role: "system", content: CONFER_SYSTEM_PROMPT }] },
      voice: CONFER_VOICE,
      // nova-2 plain (proven stable). Vapi's web override rejected the `keywords`
      // array (400 at call start), and nova-3 `keyterm` killed transcription
      // mid-call — so name accuracy leans on the prompt (KNOWN NAMES + mishear map).
      transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
      // The assistant config caps calls at 120s — too short, it gets ejected
      // mid-interview before wrapping up. Give it room + tolerate think-pauses,
      // and let the model end the call itself after its wrap-up line.
      maxDurationSeconds: 300,
      silenceTimeoutSeconds: 45,
      endCallFunctionEnabled: true,
      // Safety net for premature hangups: the model kept ending on a short
      // "goodbye" before its wrap-up finished (TTS cut by the end-call tool).
      // Vapi SPEAKS this deterministic closing right before it hangs up, so the
      // "what happens next / watch the screen" beat always plays. The prompt now
      // tells the model to keep its own sign-off brief so these don't double up.
      endCallMessage:
        "Perfect, that's everything I need. I'll build your profile, match you against the open requests, and your paid opportunities will show up on screen in just a moment. Great talking with you.",
    });
  } catch (err) {
    console.error("[confer] startInterview error:", err);
    renderReplay("Couldn't start voice — showing replay");
  }
}
$("#start").addEventListener("click", startInterview);

// --- demo replay (instant) -------------------------------------------------
if (params.get("demo") === "1") {
  renderReplay();
  $("#notice").classList.add("hidden"); // pure replay, no warning banner
  setStatus("demo");
}

// --- mock flow via URL -----------------------------------------------------
if (params.get("mock") === "1") runMockInterview();
