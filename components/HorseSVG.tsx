"use client";

import { useId } from "react";

// 毛色(color)で 陰影が かわる、ベクター(SVG)の うま。
// 絵文字の かわりに これを つかって、グラフィック／CG てきな 見た目に する。
// 向きや ギャロップアニメは おやの 要素(CSS)で せいぎょする。

function shade(hex: string, amt: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  let r = parseInt(c.slice(0, 2), 16);
  let g = parseInt(c.slice(2, 4), 16);
  let b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hex;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function HorseSVG({
  color = "#7a4a2b",
  size = 44,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const gid = `coat-${uid}`;
  const sid = `sheen-${uid}`;

  const mane = shade(color, -0.34);
  const leg = shade(color, -0.46);
  const hoof = shade(color, -0.66);

  return (
    <svg
      className={`horse-svg ${className}`}
      width={size}
      height={size * 0.78}
      viewBox="0 0 120 94"
      role="img"
      aria-label="うま"
    >
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="74">
          <stop offset="0" stopColor={shade(color, 0.26)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={shade(color, -0.24)} />
        </linearGradient>
        <radialGradient id={sid} cx="0.4" cy="0.28" r="0.7">
          <stop offset="0" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* ── あし（うしろ・どうたいの おく）── */}
      <g stroke={leg} strokeWidth="6.5" strokeLinecap="round" fill="none">
        <path d="M40 54 L 23 76" />
        <path d="M48 56 L 52 78" />
      </g>
      <g fill={hoof}>
        <ellipse cx="22" cy="78" rx="4" ry="2.6" />
        <ellipse cx="53" cy="80" rx="4" ry="2.6" />
      </g>

      {/* ── しっぽ ── */}
      <path
        d="M30 38 Q 9 30 5 54 Q 3 67 12 68 Q 11 56 20 51 Q 27 49 34 50 Z"
        fill={mane}
      />

      {/* ── どうたい ── */}
      <g fill={`url(#${gid})`}>
        <circle cx="44" cy="46" r="19" />
        <rect x="42" y="29" width="34" height="33" rx="15" />
        <circle cx="76" cy="46" r="16" />
        {/* くび */}
        <path d="M72 34 Q 82 16 99 13 L 104 25 Q 88 29 84 48 Z" />
        {/* あたま */}
        <path d="M96 11 Q 114 13 116 30 Q 116 35 109 34 L 96 31 Q 89 22 96 11 Z" />
        {/* みみ */}
        <path d="M97 12 L 100 2 L 105 13 Z" />
      </g>

      {/* ハイライト（CGっぽい つや）*/}
      <ellipse cx="58" cy="38" rx="22" ry="11" fill={`url(#${sid})`} />

      {/* たてがみ */}
      <path d="M71 31 Q 84 12 101 11 Q 92 18 86 32 Q 79 31 74 40 Z" fill={mane} />

      {/* め */}
      <circle cx="106" cy="23" r="2.1" fill="#16110d" />
      <circle cx="106.7" cy="22.3" r="0.7" fill="#fff" />

      {/* ── あし（まえ・どうたいの て前）── */}
      <g stroke={leg} strokeWidth="6.5" strokeLinecap="round" fill="none">
        <path d="M70 56 L 74 78" />
        <path d="M78 55 L 95 72" />
      </g>
      <g fill={hoof}>
        <ellipse cx="74" cy="80" rx="4" ry="2.6" />
        <ellipse cx="96" cy="74" rx="4" ry="2.6" />
      </g>
    </svg>
  );
}
