// ゲームない つうかの「きんか（コイン）」アイコン。
// にんじん の かわりに、おかねっぽい きんいろの コインで ひょうじする。

export default function CoinIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="コイン"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="coin-face" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.6" stopColor="#f0c64e" />
          <stop offset="1" stopColor="#c89221" />
        </radialGradient>
      </defs>
      {/* ふち */}
      <circle cx="16" cy="16" r="15" fill="#b8801c" />
      {/* おもて */}
      <circle cx="16" cy="16" r="12.5" fill="url(#coin-face)" stroke="#e7b53a" strokeWidth="1" />
      {/* うちわく */}
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#caa12e" strokeWidth="1" strokeOpacity="0.7" />
      {/* ほし（おかねの もんしょう）*/}
      <path
        d="M16 8.5 L18 13.6 L23.4 13.9 L19.2 17.3 L20.6 22.5 L16 19.6 L11.4 22.5 L12.8 17.3 L8.6 13.9 L14 13.6 Z"
        fill="#fff6da"
        stroke="#caa12e"
        strokeWidth="0.5"
      />
      {/* ハイライト */}
      <ellipse cx="12" cy="11" rx="3.4" ry="2" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}
