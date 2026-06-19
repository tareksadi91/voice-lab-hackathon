export const DEMO_CALL = {
  id: "demo",
  dossier: {
    name: "Maya Okonkwo",
    headline: "Design-systems lead who shipped AI-assisted Figma workflows at a fintech",
    domain: "AI in design",
    subspecialties: ["design systems", "AI-assisted tooling", "design ops"],
    seniority: "lead",
    contexts: ["Built an internal Figma plugin that auto-generates component variants"],
    signature_takes: ["AI design tools should be opinionated, not blank-canvas", "Design systems are the only place AI codegen is safe to ship today"],
    wants_from_network: "paid advisory with teams adopting AI into mature design systems",
    would_meet: "an eval/research person who can measure AI-generated UI quality",
  },
  paid_matches: [
    { request_id: "r01", title: "AI-assisted design workflow advisor", company: "Northwind Pay", industry: "Series-B fintech · design org of 12", requester: "Dana Whitfield", requester_role: "VP of Design", problem: "Our design system is mature and governed, but we keep stalling on how to bring AI into the workflow without breaking that governance.", insights_wanted: "How you rolled AI tooling into an established system, what guardrails you set, and what you'd do differently.", price: "$350 / 45-min call", why: "You integrated AI into a mature design system without breaking governance, exactly their ask." },
    { request_id: "r03", title: "Audit of AI-generated UI quality", company: "Meridian Group", industry: "Fortune 500 enterprise · design org of 60+", requester: "Priya Nair", requester_role: "Head of Design Systems", problem: "We're about to scale an AI-UI program org-wide and need an outside audit before we commit budget.", insights_wanted: "A quality, brand-compliance, and design-system-adherence audit, ideally with an automated rubric.", price: "$1,500 / engagement", why: "Your take that codegen is only safe inside design systems is the lens they're missing." },
    { request_id: "r05", title: "Accessibility review of AI codegen output", company: "Talloak", industry: "Mid-market SaaS · engineering-led team of 50", requester: "Sam Osei", requester_role: "Staff Engineer", problem: "Our AI codegen pipeline ships UI fast, but accessibility is an afterthought and audits are failing.", insights_wanted: "A WCAG 2.2 review of generated components and help designing an a11y gate that runs in CI.", price: "$800 / audit", why: "You ship AI codegen inside design systems, so you know where accessibility breaks in generated UI." },
    { request_id: "r06", title: "Stand up an AI design ops practice", company: "Cobalt Labs", industry: "Series-C health tech · design org of 30", requester: "Ava Lindqvist", requester_role: "Director of Design Ops", problem: "Every team is adopting AI tools ad hoc and our ops layer can't keep up with the chaos.", insights_wanted: "How to define an AI design-ops practice: tooling, review rituals, and what to centralize.", price: "$350 / 60-min call", why: "You scaled a 200-component system across teams, so you know what design ops to centralize." },
    { request_id: "r08", title: "Write a safe-AI-adoption playbook for our design org", company: "Lumen Health", industry: "Series-B health tech · design org of 25", requester: "Naomi Park", requester_role: "Head of Design", problem: "Designers want to use AI coding tools but leadership is nervous about quality and things breaking in prod.", insights_wanted: "A practical playbook: what to allow, what guardrails to set, and how to roll it out without a mess.", price: "$400 / 60-min call", why: "You set the guardrails for safe AI tooling on a design team, exactly the playbook they need." },
    { request_id: "r09", title: "Help us choose and roll out AI design tools", company: "Plume", industry: "Seed-stage consumer app · 12 people", requester: "Eli Rosen", requester_role: "Founding Designer", problem: "Too many AI design tools, no idea which to commit to or how to get the team actually using them.", insights_wanted: "Which tools are worth it for a small team, and how to drive real adoption.", price: "$350 / 45-min call", why: "You drove team-wide adoption of AI tools hands-on, which is what they're stuck on." },
  ],
};
