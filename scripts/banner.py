"""Draws assets/banner.svg: the night city from spark.os, with Johan's name.

Run: python3 scripts/banner.py. The skyline is seeded, so the output is stable.
Animation is CSS inside the SVG, which GitHub plays in an <img>. Every animated element's
resting state is its final state, so with reduced motion the banner is complete and still.
"""

import random
from pathlib import Path

W, H = 1280, 340
GROUND = 300  # top of the road
rng = random.Random(7)

ACCENT = "#6ea8ff"
AMBER = "#f5b14c"
SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

parts: list[str] = []


def skyline(x0: int, x1: int, hmin: int, hmax: int, fill: str, lit: float, twinkle: bool) -> None:
    x = x0
    while x < x1:
        w = rng.randint(34, 78)
        h = rng.randint(hmin, hmax)
        y = GROUND - h
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h + 2}" fill="{fill}"/>')
        # A few roofs get an antenna.
        if rng.random() < 0.18:
            ax = x + w // 2
            parts.append(f'<rect x="{ax}" y="{y - 14}" width="2" height="14" fill="{fill}"/>')
        # Windows in a grid; some lit.
        for wy in range(y + 10, GROUND - 12, 14):
            for wx in range(x + 7, x + w - 9, 11):
                if rng.random() < lit:
                    cls = ""
                    if twinkle and rng.random() < 0.06:
                        cls = f' class="tw" style="animation-delay:{rng.uniform(0, 9):.1f}s"'
                    op = rng.choice([0.55, 0.7, 0.85])
                    parts.append(
                        f'<rect x="{wx}" y="{wy}" width="5" height="7" rx="1" fill="{AMBER}" opacity="{op}"{cls}/>'
                    )
        x += w + rng.randint(2, 10)


# Far skyline (dim, across the width), near skyline (right side, behind no text).
skyline(-10, W + 10, 60, 150, "#141d38", 0.10, False)
skyline(560, W + 10, 90, 230, "#1a2546", 0.22, True)
skyline(-10, 520, 40, 95, "#1a2546", 0.16, True)

city = "\n    ".join(parts)

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t d">
  <title id="t">Johan Mathew Joseph</title>
  <desc id="d">Software Development Engineer II in Bangalore. A night city skyline with lit windows and a car driving past.</desc>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#080d1c"/>
      <stop offset="1" stop-color="#121b36"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="1" r="0.7">
      <stop offset="0" stop-color="{AMBER}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="{AMBER}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff6d8" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#080d1c" stop-opacity="0.92"/>
      <stop offset="0.5" stop-color="#080d1c" stop-opacity="0.55"/>
      <stop offset="0.75" stop-color="#080d1c" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="card"><rect width="{W}" height="{H}" rx="22"/></clipPath>
  </defs>
  <style>
    .in {{ animation: rise .9s cubic-bezier(.2,.7,.2,1) both; }}
    .d1 {{ animation-delay: .15s; }} .d2 {{ animation-delay: .35s; }} .d3 {{ animation-delay: .55s; }}
    @keyframes rise {{ from {{ opacity: 0; transform: translateY(10px); }} }}
    .tw {{ animation: tw 7s ease-in-out infinite; }}
    @keyframes tw {{ 0%, 100% {{ opacity: .85; }} 45% {{ opacity: .12; }} 55% {{ opacity: .12; }} }}
    .car {{ animation: drive 14s linear infinite; }}
    @keyframes drive {{ from {{ transform: translateX(-160px); }} to {{ transform: translateX({W + 40}px); }} }}
    .caret {{ animation: blink 1.1s steps(1) infinite; }}
    @keyframes blink {{ 50% {{ opacity: 0; }} }}
    @media (prefers-reduced-motion: reduce) {{
      .in, .tw, .caret {{ animation: none; }}
      .car {{ animation: none; transform: translateX(980px); }}
    }}
  </style>
  <g clip-path="url(#card)">
    <rect width="{W}" height="{H}" fill="url(#sky)"/>
    <rect width="{W}" height="{H}" fill="url(#glow)"/>
    {city}
    <rect y="{GROUND}" width="{W}" height="{H - GROUND}" fill="#0a0f1f"/>
    <rect y="{GROUND + 19}" width="{W}" height="2" fill="#26314f"/>
    <g fill="#3a4668">
      {"".join(f'<rect x="{x}" y="{GROUND + 19}" width="26" height="2"/>' for x in range(10, W, 70))}
    </g>
    <rect width="{W}" height="{H}" fill="url(#fade)"/>
    <g class="car">
      <path d="M170 {GROUND + 10} L290 {GROUND + 3} L290 {GROUND + 19} Z" fill="url(#beam)"/>
      <rect x="112" y="{GROUND + 6}" width="58" height="14" rx="6" fill="#2b3966"/>
      <rect x="124" y="{GROUND + 1}" width="32" height="9" rx="4" fill="#2b3966"/>
      <circle cx="168" cy="{GROUND + 12}" r="3" fill="#fffbe8"/>
      <rect x="111" y="{GROUND + 10}" width="4" height="5" rx="1.5" fill="#ff5a5a"/>
    </g>
    <text class="in" x="64" y="104" font-family="{MONO}" font-size="17" fill="{ACCENT}" letter-spacing="1.5">HI, I'M</text>
    <text class="in d1" x="62" y="164" font-family="{SANS}" font-size="56" font-weight="700" fill="#f4f6fb">Johan Mathew Joseph</text>
    <text class="in d2" x="64" y="206" font-family="{SANS}" font-size="22" fill="#c9d2e6">Software Development Engineer II <tspan fill="#6b7899">·</tspan> Bangalore</text>
    <g class="in d3">
      <text x="64" y="246" font-family="{MONO}" font-size="16" fill="#8fa0c4">&gt; using AI to take the repetitive parts out of ordinary days<tspan class="caret" fill="{ACCENT}">_</tspan></text>
    </g>
  </g>
  <rect x=".5" y=".5" width="{W - 1}" height="{H - 1}" rx="22" fill="none" stroke="#26314f"/>
</svg>
"""

out = Path(__file__).resolve().parent.parent / "assets" / "banner.svg"
out.parent.mkdir(exist_ok=True)
out.write_text(svg)
print(f"wrote {out} ({len(svg) // 1024} KB)")
