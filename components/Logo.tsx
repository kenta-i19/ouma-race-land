// 「にんじんダービー」の ロゴ（しょうしょう）。
// みどりの 円に、きんの ばてい（horseshoe）と にんじん を くみあわせた エンブレム。

export default function Logo({ size = 108, className = "" }: { size?: number; className?: string }) {
  // ばていに そった くぎあな
  const nails: [number, number][] = [
    [42, 84],
    [37, 62],
    [50, 44],
    [78, 44],
    [91, 62],
    [86, 84],
  ];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="にんじんダービー ロゴ"
    >
      <defs>
        <linearGradient id="nd-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#356b50" />
          <stop offset="1" stopColor="#1b3c2c" />
        </linearGradient>
        <linearGradient id="nd-carrot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4ad4e" />
          <stop offset="1" stopColor="#df7521" />
        </linearGradient>
        <linearGradient id="nd-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7c977" />
          <stop offset="1" stopColor="#b08d57" />
        </linearGradient>
      </defs>

      {/* がいわく */}
      <circle cx="64" cy="64" r="61.5" fill="#f7f2e8" stroke="url(#nd-gold)" strokeWidth="3.5" />
      <circle cx="64" cy="64" r="56" fill="url(#nd-green)" />
      <circle cx="64" cy="64" r="50" fill="none" stroke="#d8c08a" strokeWidth="1.4" strokeOpacity="0.8" />

      {/* ばてい（horseshoe）*/}
      <path
        d="M40 96 A27 29 0 1 1 88 96"
        fill="none"
        stroke="url(#nd-gold)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {nails.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#7a5a1f" />
      ))}

      {/* にんじん（ちゅうおう）*/}
      <g>
        {/* は */}
        <path d="M64 56 Q58 40 52 50 Q57 54 64 56 Z" fill="#5aa45a" />
        <path d="M64 56 Q64 38 65 49 Q66 54 64 56 Z" fill="#4e9a50" />
        <path d="M64 56 Q71 41 76 51 Q70 55 64 56 Z" fill="#5aa45a" />
        {/* み */}
        <path d="M55 57 Q64 52 73 57 L64 101 Z" fill="url(#nd-carrot)" />
        <path d="M55 57 Q64 52 73 57" fill="none" stroke="#c9651a" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="61" y1="66" x2="63" y2="69" stroke="#c9651a" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="67" y1="66" x2="65" y2="69" stroke="#c9651a" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="62" y1="78" x2="64" y2="81" stroke="#c9651a" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}
