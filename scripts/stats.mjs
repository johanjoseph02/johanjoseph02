// Draws the activity and languages cards for the profile README, in light and dark.
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
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
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

// ---- Activity: months, streaks ----------------------------------------------------------
const cal = user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const byMonth = new Map();
for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.contributionCount);
const last = new Date(days.at(-1).date + "T00:00:00Z");
const months = [];
for (let i = 11; i >= 0; i--) {
  const m = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - i, 1));
  const key = m.toISOString().slice(0, 7);
  months.push({ key, label: MONTHS[m.getUTCMonth()], year: m.getUTCFullYear(), count: byMonth.get(key) ?? 0 });
}
let longest = 0, run = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
const activeDays = days.filter((d) => d.contributionCount > 0).length;
const best = months.reduce((a, m) => (m.count > a.count ? m : a), months[0]);

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
function activityCard(t) {
  const W = 1200, H = 360;
  const kpis = [
    { v: cal.totalContributions.toLocaleString("en-US"), l: "contributions", accent: true },
    { v: `${longest} ${longest === 1 ? "day" : "days"}`, l: "longest streak" },
    { v: `${best.label} ${best.year}`, l: `most active month (${best.count})` },
    { v: String(activeDays), l: "days with contributions" },
  ];
  const kpiSvg = kpis.map((k, i) => {
    const x = 40 + (i % 2) * 200, y = 150 + Math.floor(i / 2) * 100;
    return `<g class="in" style="animation-delay:${0.1 + i * 0.1}s">
<text x="${x}" y="${y}" font-family="${SANS}" font-size="32" font-weight="700" fill="${k.accent ? t.accent : t.text}">${esc(k.v)}</text>
<text x="${x}" y="${y + 26}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(k.l)}</text></g>`;
  }).join("\n");

  // Bar chart on the right.
  const cx0 = 480, cx1 = W - 40, base = 300, top_ = 120, ch = base - top_;
  const max = Math.max(1, ...months.map((m) => m.count));
  const step = (cx1 - cx0) / months.length, bw = Math.min(34, step * 0.56);
  const grid = [0.25, 0.5, 0.75, 1].map((f) => {
    const y = base - ch * f;
    return `<line x1="${cx0}" x2="${cx1}" y1="${y}" y2="${y}" stroke="${t.faint}" stroke-dasharray="3 5"/>`;
  }).join("");
  const bars = months.map((m, i) => {
    const h = m.count ? Math.max(4, (ch * m.count) / max) : 0;
    const x = cx0 + step * i + (step - bw) / 2, y = base - h;
    const isBest = m === best && m.count > 0;
    const fill = isBest ? "url(#barHot)" : "url(#bar)";
    const bar = h ? `<rect class="up" style="animation-delay:${0.15 + i * 0.05}s" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${fill}"/>` : `<rect x="${x.toFixed(1)}" y="${base - 2}" width="${bw.toFixed(1)}" height="2" rx="1" fill="${t.faint}"/>`;
    const val = m.count ? `<text class="in" style="animation-delay:${0.6 + i * 0.05}s" x="${(x + bw / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${isBest ? t.text : t.muted}">${m.count}</text>` : "";
    const lab = `<text x="${(x + bw / 2).toFixed(1)}" y="${base + 26}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">${m.label}</text>`;
    return bar + val + lab;
  }).join("\n");

  const body = `<defs>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity=".55"/><stop offset="1" stop-color="${t.accent}" stop-opacity=".18"/></linearGradient>
  <linearGradient id="barHot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent2}"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>
</defs>
${kpiSvg}
<line x1="440" x2="440" y1="112" y2="${base + 24}" stroke="${t.faint}"/>
${grid}
<line x1="${cx0}" x2="${cx1}" y1="${base}" y2="${base}" stroke="${t.border}"/>
${bars}`;
  const desc = `${cal.totalContributions} contributions in the last 12 months; longest streak ${longest} days; most active month ${best.label} ${best.year} with ${best.count}. Per month: ${months.map((m) => `${m.label} ${m.count}`).join(", ")}.`;
  return card({ w: W, h: H, t, overline: "Last 12 months", title: "Activity", desc, body });
}

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
  writeFileSync(join(out, `activity-${name}.svg`), activityCard(t));
  writeFileSync(join(out, `langs-${name}.svg`), langsCard(t));
}
console.log(JSON.stringify({ total: cal.totalContributions, longest, activeDays, best, months: months.map((m) => m.count), top }));
