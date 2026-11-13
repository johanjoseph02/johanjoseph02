// Draws the stats and languages cards for the profile README, in light and dark.
// Usage: GITHUB_TOKEN=... node scripts/stats.mjs <out-dir> [login]
// Runs daily in .github/workflows/profile.yml; no dependencies (Node 20+ has fetch).
// Counts public repositories the user owns, forks excluded.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "dist";
const login = process.argv[3] ?? process.env.GITHUB_REPOSITORY_OWNER ?? "johanjoseph02";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is not set");

const query = `query($login: String!, $after: String) {
  user(login: $login) {
    createdAt
    contributionsCollection { contributionCalendar { totalContributions } }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
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
let top = [...langs.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 6)
  .map(([name, l]) => ({ name, color: l.color, pct: (100 * l.size) / total }))
  .filter((l) => l.pct >= 1);
const shown = top.reduce((a, l) => a + l.pct, 0);
if (100 - shown >= 0.5) top.push({ name: "Other", color: "#8b949e", pct: 100 - shown });

const stats = [
  { label: "contributions, last 12 months", value: user.contributionsCollection.contributionCalendar.totalContributions },
  { label: "public repositories", value: user.repositories.totalCount },
  { label: "languages in my repositories", value: langs.size },
  { label: "years on GitHub", value: Math.floor((Date.now() - Date.parse(user.createdAt)) / 3.15576e10) },
];

const THEMES = {
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e", accent: "#6ea8ff", track: "#21262d" },
  light: { bg: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#59636e", accent: "#0969da", track: "#eaeef2" },
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const W = 600, H = 210;

const frame = (t, title, desc, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>
.in { animation: rise .7s cubic-bezier(.2,.7,.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
.grow { animation: grow 1.1s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: left; }
@keyframes grow { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) { .in, .grow { animation: none; } }
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.border}"/>
<text x="28" y="42" font-family="${SANS}" font-size="16" font-weight="600" fill="${t.text}">${esc(title)}</text>
${body}
</svg>
`;

function statsCard(t) {
  const cells = stats.map((s, i) => {
    const x = 28 + (i % 2) * 280, y = 98 + Math.floor(i / 2) * 72;
    return `<g class="in" style="animation-delay:${0.1 + i * 0.12}s">
<text x="${x}" y="${y}" font-family="${SANS}" font-size="34" font-weight="700" fill="${i === 0 ? t.accent : t.text}">${s.value.toLocaleString("en-US")}</text>
<text x="${x}" y="${y + 22}" font-family="${SANS}" font-size="13" fill="${t.muted}">${esc(s.label)}</text></g>`;
  });
  const desc = stats.map((s) => `${s.value} ${s.label}`).join(", ");
  return frame(t, "GitHub at a glance", desc, cells.join("\n"));
}

function langsCard(t) {
  let x = 28;
  const barW = W - 56;
  const segs = top.map((l, i) => {
    const w = Math.max(2, (barW * l.pct) / 100);
    const gap = i < top.length - 1 ? 2 : 0; // keeps neighbouring blues (Python, TypeScript) apart
    const r = `<rect class="grow" style="animation-delay:${0.1 + i * 0.08}s" x="${x.toFixed(1)}" y="62" width="${Math.max(1, w - gap).toFixed(1)}" height="10" fill="${l.color}"/>`;
    x += w;
    return r;
  });
  const legend = top.map((l, i) => {
    const lx = 28 + (i % 2) * 280, ly = 108 + Math.floor(i / 2) * 30;
    return `<g class="in" style="animation-delay:${0.3 + i * 0.07}s"><circle cx="${lx + 5}" cy="${ly - 5}" r="5" fill="${l.color}"/>
<text x="${lx + 18}" y="${ly}" font-family="${SANS}" font-size="14" fill="${t.text}">${esc(l.name)} <tspan fill="${t.muted}">${l.pct.toFixed(1)}%</tspan></text></g>`;
  });
  const body = `<clipPath id="bar"><rect x="28" y="62" width="${barW}" height="10" rx="5"/></clipPath>
<rect x="28" y="62" width="${barW}" height="10" rx="5" fill="${t.track}"/>
<g clip-path="url(#bar)">${segs.join("")}</g>
${legend.join("\n")}`;
  const desc = top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ");
  return frame(t, "Languages across my public repositories", desc, body);
}

mkdirSync(out, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(out, `stats-${name}.svg`), statsCard(t));
  writeFileSync(join(out, `langs-${name}.svg`), langsCard(t));
}
console.log(JSON.stringify({ stats, top }, null, 1));
