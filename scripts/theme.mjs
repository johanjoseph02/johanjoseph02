// Shared look for every card on the profile: colours per theme, fonts and the card frame.

export const THEMES = {
  dark: {
    bg0: "#121826", bg1: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e",
    faint: "#21262d", accent: "#6ea8ff", accent2: "#a78bfa", glow: "#3b6cff", glowOpacity: 0.16,
    pill: "#161b22",
  },
  light: {
    bg0: "#f6f8fb", bg1: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#59636e",
    faint: "#eaeef2", accent: "#0969da", accent2: "#7c3aed", glow: "#6ea8ff", glowOpacity: 0.14,
    pill: "#f6f8fa",
  },
};

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Motion shared by all cards. Every animation ends in the element's normal state, so with
// reduced motion (animation: none) each card is complete.
export const MOTION = `
.in { animation: rise .8s cubic-bezier(.2,.7,.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
.up { animation: up 1s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: bottom; }
@keyframes up { from { transform: scaleY(0); } }
.grow { animation: grow 1s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: left; }
@keyframes grow { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) { .in, .up, .grow, .draw { animation: none !important; } }`;

/**
 * A card: rounded frame, soft corner glow, overline and title, then the body.
 * gutter ("left" or "right") adds transparent space on that side, so two half-width cards
 * placed edge to edge in the README get a gap between them and keep their outer edges.
 */
export const GUTTER = 12;
export function card({ w, h, t, overline, title, desc, body, extraStyle = "", gutter = null }) {
  const vw = gutter ? w + GUTTER : w, ox = gutter === "left" ? GUTTER : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-ox} 0 ${vw} ${h}" width="${vw}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>${MOTION}${extraStyle}</style>
<defs>
  <linearGradient id="cbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg0}"/><stop offset="1" stop-color="${t.bg1}"/></linearGradient>
  <radialGradient id="cglow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${t.glow}" stop-opacity="${t.glowOpacity}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
</defs>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="18" fill="url(#cbg)"/>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="18" fill="url(#cglow)"/>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="18" fill="none" stroke="${t.border}"/>
<text x="40" y="52" font-family="${MONO}" font-size="13" letter-spacing="2" fill="${t.muted}">${esc(overline.toUpperCase())}</text>
<text x="40" y="84" font-family="${SANS}" font-size="24" font-weight="700" fill="${t.text}">${esc(title)}</text>
${body}
</svg>
`;
}
