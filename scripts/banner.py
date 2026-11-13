"""Draws assets/banner-dark.svg and assets/banner-light.svg for the profile README.

Run: python3 scripts/banner.py. A name over a slowly drifting glow and a dot grid that a
soft light sweeps across. Animation is CSS inside the SVG, which GitHub plays in an <img>.
Each animated element rests in its final state, so with reduced motion the banner is
complete and still.
"""

from pathlib import Path

W, H = 1280, 300
NAME = "Johan Mathew Joseph"
SUB = "Bangalore, India"
SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

THEMES = {
    "dark": dict(bg0="#0b1020", bg1="#0d1117", border="#30363d", name="#f4f6fb", sub="#8b949e",
                 dot="#e6edf3", dot_dim=0.07, dot_lit=0.55,
                 glows=[("#3b6cff", 0.42), ("#8b5cf6", 0.34), ("#14b8a6", 0.26)]),
    "light": dict(bg0="#f6f8fb", bg1="#ffffff", border="#d0d7de", name="#1f2328", sub="#59636e",
                  dot="#1f2328", dot_dim=0.08, dot_lit=0.45,
                  glows=[("#6ea8ff", 0.38), ("#c4b5fd", 0.42), ("#5eead4", 0.30)]),
}


def banner(t: dict) -> str:
    glows = "\n".join(
        f'<radialGradient id="g{i}"><stop offset="0" stop-color="{c}" stop-opacity="{o}"/>'
        f'<stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'
        for i, (c, o) in enumerate(t["glows"])
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t">
  <title id="t">{NAME}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{t['bg0']}"/><stop offset="1" stop-color="{t['bg1']}"/>
    </linearGradient>
    {glows}
    <radialGradient id="spot"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="1.3" fill="{t['dot']}"/>
    </pattern>
    <mask id="sweep" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
      <ellipse class="spot" cx="0" cy="{H / 2}" rx="230" ry="190" fill="url(#spot)"/>
    </mask>
    <clipPath id="card"><rect width="{W}" height="{H}" rx="18"/></clipPath>
  </defs>
  <style>
    .a {{ animation: drift 18s ease-in-out infinite alternate; }}
    .b {{ animation: drift2 22s ease-in-out infinite alternate; }}
    .c {{ animation: drift 26s ease-in-out infinite alternate-reverse; }}
    @keyframes drift {{ to {{ transform: translate(140px, 30px); }} }}
    @keyframes drift2 {{ to {{ transform: translate(-160px, -24px); }} }}
    .spot {{ animation: sweep 9s cubic-bezier(.45,0,.55,1) infinite; }}
    @keyframes sweep {{ from {{ transform: translateX(-260px); }} to {{ transform: translateX({W + 260}px); }} }}
    .in {{ animation: rise 1s cubic-bezier(.2,.7,.2,1) both; }}
    .d1 {{ animation-delay: .25s; }}
    @keyframes rise {{ from {{ opacity: 0; transform: translateY(8px); }} }}
    @media (prefers-reduced-motion: reduce) {{
      .a, .b, .c, .in {{ animation: none; }}
      .spot {{ animation: none; transform: translateX({W / 2}px); }}
    }}
  </style>
  <g clip-path="url(#card)">
    <rect width="{W}" height="{H}" fill="url(#bg)"/>
    <ellipse class="a" cx="300" cy="80" rx="420" ry="230" fill="url(#g0)"/>
    <ellipse class="b" cx="980" cy="230" rx="440" ry="240" fill="url(#g1)"/>
    <ellipse class="c" cx="660" cy="320" rx="380" ry="200" fill="url(#g2)"/>
    <rect width="{W}" height="{H}" fill="url(#dots)" opacity="{t['dot_dim']}"/>
    <rect width="{W}" height="{H}" fill="url(#dots)" opacity="{t['dot_lit']}" mask="url(#sweep)"/>
    <text class="in" x="{W / 2}" y="160" text-anchor="middle" font-family="{SANS}" font-size="64" font-weight="700" letter-spacing="-1" fill="{t['name']}">{NAME}</text>
    <text class="in d1" x="{W / 2}" y="204" text-anchor="middle" font-family="{MONO}" font-size="17" letter-spacing="3" fill="{t['sub']}">{SUB.upper()}</text>
  </g>
  <rect x=".5" y=".5" width="{W - 1}" height="{H - 1}" rx="18" fill="none" stroke="{t['border']}"/>
</svg>
"""


assets = Path(__file__).resolve().parent.parent / "assets"
assets.mkdir(exist_ok=True)
for name, theme in THEMES.items():
    (assets / f"banner-{name}.svg").write_text(banner(theme))
    print(f"wrote assets/banner-{name}.svg")
