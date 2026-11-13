// Draws the parts of the profile that do not change day to day: the toolbox card and the
// link buttons, in light and dark, into assets/. Run by hand: node scripts/static.mjs
// Icons come from Skill Icons (MIT, https://github.com/tandpfun/skill-icons) and are
// embedded, so the profile does not depend on that service at view time.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, SANS, MONO, esc, card } from "./theme.mjs";

const assets = new URL("../assets/", import.meta.url).pathname;
mkdirSync(assets, { recursive: true });

const GROUPS = [
  ["Languages", ["py", "java", "c", "cpp", "js", "ts"]],
  ["Frameworks", ["pytorch", "react", "nextjs", "angular", "flutter", "nodejs", "express", "spring", "graphql"]],
  ["Data and cloud", ["postgres", "mysql", "mongodb", "firebase", "supabase", "aws", "azure"]],
];
const NAMES = {
  py: "Python", java: "Java", c: "C", cpp: "C++", js: "JavaScript", ts: "TypeScript", pytorch: "PyTorch",
  react: "React", nextjs: "Next.js", angular: "Angular", flutter: "Flutter", nodejs: "Node.js", express: "Express",
  spring: "Spring Boot", graphql: "GraphQL", postgres: "PostgreSQL", mysql: "MySQL", mongodb: "MongoDB",
  firebase: "Firebase", supabase: "Supabase", aws: "AWS", azure: "Azure",
};

async function icon(id, theme, n, x, y, size) {
  const res = await fetch(`https://skillicons.dev/icons?i=${id}&theme=${theme}`);
  if (!res.ok) throw new Error(`icon ${id}: ${res.status}`);
  let s = (await res.text()).trim();
  // Give every internal id a unique prefix so icons cannot collide inside one card.
  const p = `i${n}-`;
  s = s.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
  s = s.replace(/^<svg width="48" height="48"/, `<svg x="${x}" y="${y}" width="${size}" height="${size}"`);
  return s;
}

async function toolbox(name, t) {
  const W = 590, H = 380, size = 44, gapX = 8;
  let n = 0, k = 0;
  const parts = [];
  for (const [gi, [label, ids]] of GROUPS.entries()) {
    const y = 132 + gi * 82;
    parts.push(`<text x="40" y="${y}" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">${esc(label.toUpperCase())}</text>`);
    for (const [i, id] of ids.entries()) {
      const svg = await icon(id, name, n++, 40 + i * (size + gapX), y + 12, size);
      parts.push(`<g class="in" style="animation-delay:${(0.1 + k++ * 0.035).toFixed(3)}s"><title>${esc(NAMES[id])}</title>${svg}</g>`);
    }
  }
  const desc = GROUPS.map(([l, ids]) => `${l}: ${ids.map((i) => NAMES[i]).join(", ")}`).join(". ");
  return card({ w: W, h: H, t, overline: "What I build with", title: "Toolbox", desc, body: parts.join("\n"), gutter: "left" });
}

// Link buttons. Glyphs are drawn here (globe, "in", envelope), 20 px, in the accent colour.
const GLYPHS = {
  globe: (c) => `<g fill="none" stroke="${c}" stroke-width="1.8"><circle cx="10" cy="10" r="8.5"/><ellipse cx="10" cy="10" rx="3.8" ry="8.5"/><path d="M1.5 10h17"/></g>`,
  in: (c) => `<rect x="1" y="1" width="18" height="18" rx="4" fill="${c}"/><text x="10" y="14.6" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="800" fill="#fff">in</text>`,
  mail: (c) => `<g fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"><rect x="1" y="3.5" width="18" height="13" rx="2.5"/><path d="M2 5l8 6 8-6"/></g>`,
};
const BUTTONS = [
  ["portfolio", "Portfolio", "globe"],
  ["linkedin", "LinkedIn", "in"],
  ["email", "Email", "mail"],
];

// Label widths measured in Chromium at 600 16px system UI, plus a little slack for other
// platforms' fonts, so each button hugs its text.
const TEXT_W = { Portfolio: 69, LinkedIn: 69, Email: 45 };

function button(label, glyph, t) {
  const H = 48, textW = TEXT_W[label] ?? Math.ceil(label.length * 9), W = 24 + 20 + 12 + textW + 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${H / 2}" fill="${t.pill}" stroke="${t.border}"/>
<g transform="translate(24 14)">${GLYPHS[glyph](t.accent)}</g>
<text x="56" y="30" font-family="${SANS}" font-size="16" font-weight="600" fill="${t.text}">${esc(label)}</text>
</svg>
`;
}

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(assets, `toolbox-${name}.svg`), await toolbox(name, t));
  for (const [file, label, glyph] of BUTTONS) writeFileSync(join(assets, `${file}-${name}.svg`), button(label, glyph, t));
}
console.log("wrote toolbox and buttons");
