// Draws the languages card for the profile README, in light and dark.
// Usage: GITHUB_TOKEN=... node scripts/stats.mjs <out-dir> [login]
// Runs daily in .github/workflows/profile.yml; no dependencies (Node 20+ has fetch).
// Languages count public repositories the user owns, forks excluded.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, SANS, MONO, esc, card } from "./theme.mjs";

const out = process.argv[2] ?? "dist";
const login = process.argv[3] ?? process.env.GITHUB_REPOSITORY_OWNER ?? "johanjoseph02";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is not set");

const query = `query($login: String!, $after: String) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes { languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }
    }
  }
}`;

async function gql(variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json", "user-agent": "profile-stats" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data.user;
}

let user, after = null;
const repos = [];
do {
  user = await gql({ login, after });
  repos.push(...user.repositories.nodes);
  after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
} while (after);

// ---- Languages ---------------------------------------------------------------------------
// Notebooks and generated markup outweigh real code by bytes; leave them out of the mix.
const SKIP = new Set(["Jupyter Notebook", "HTML", "CSS", "SCSS", "Procfile", "Dockerfile", "Shell", "Batchfile", "Makefile"]);
const langs = new Map();
for (const r of repos)
  for (const { size, node } of r.languages.edges) {
    if (SKIP.has(node.name)) continue;
    const l = langs.get(node.name) ?? { size: 0, color: node.color ?? "#8b949e" };
    l.size += size;
    langs.set(node.name, l);
  }
const total = [...langs.values()].reduce((a, l) => a + l.size, 0) || 1;
const top = [...langs.entries()].sort((a, b) => b[1].size - a[1].size)
  .map(([name, l]) => ({ name, color: l.color, pct: (100 * l.size) / total }))
  .filter((l, i) => i < 5 && l.pct >= 1);
const rest = 100 - top.reduce((a, l) => a + l.pct, 0);
if (rest >= 0.5) top.push({ name: "Other", color: "#8b949e", pct: rest });

// ---- Cards -------------------------------------------------------------------------------
function langsCard(t) {
  const W = 590, H = 380, cx = 150, cy = 230, r = 82, sw = 28, C = 2 * Math.PI * r, gap = 3;
  let acc = 0;
  const segs = top.map((l) => {
    const len = (C * l.pct) / 100;
    const s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${l.color}" stroke-width="${sw}" stroke-dasharray="${Math.max(0.5, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acc += len;
    return s;
  }).join("\n");
  const legend = top.map((l, i) => {
    const y = 140 + i * 40, x = 300;
    return `<g class="in" style="animation-delay:${0.35 + i * 0.08}s">
<circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${l.color}"/>
<text x="${x + 22}" y="${y}" font-family="${SANS}" font-size="16" fill="${t.text}">${esc(l.name)}</text>
<text x="${W - 40}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">${l.pct.toFixed(1)}%</text>
<rect x="${x + 22}" y="${y + 9}" width="${W - 40 - x - 22}" height="3" rx="1.5" fill="${t.faint}"/>
<rect class="grow" style="animation-delay:${0.45 + i * 0.08}s" x="${x + 22}" y="${y + 9}" width="${(((W - 40 - x - 22) * l.pct) / 100).toFixed(1)}" height="3" rx="1.5" fill="${l.color}"/></g>`;
  }).join("\n");
  const extraStyle = `
.draw { animation: draw 1.2s cubic-bezier(.3,.7,.2,1) both; }
@keyframes draw { from { stroke-dashoffset: ${C.toFixed(2)}; } }`;
  const body = `<defs><mask id="reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <circle class="draw" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="${sw + 4}" stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>
</mask></defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.faint}" stroke-width="${sw}"/>
<g mask="url(#reveal)">${segs}</g>
<text class="in" style="animation-delay:.4s" x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="700" fill="${t.text}">${langs.size}</text>
<text class="in" style="animation-delay:.5s" x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="${SANS}" font-size="13" fill="${t.muted}">languages</text>
${legend}`;
  const desc = top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ");
  return card({ w: W, h: H, t, overline: "By code, public repos", title: "Languages", desc, body, extraStyle, gutter: "right" });
}

mkdirSync(out, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  // A new name per design: GitHub's image proxy caches by URL, so reusing an old name can
  // keep serving the previous card.
  writeFileSync(join(out, `languages-${name}.svg`), langsCard(t));
}
console.log(JSON.stringify(top));
