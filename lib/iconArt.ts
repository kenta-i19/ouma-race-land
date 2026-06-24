// アプリアイコン（ホームがめんに ついかしたとき）の え。
// せいほうけいの ロゴ柄（みどりはいけい＋きんの ばてい＋にんじん）を SVG で つくる。
// app/icon.tsx・app/apple-icon.tsx から つかい、PNGに へんかんされる。

export function logoSquareSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0" stop-color="#356b50"/>
      <stop offset="1" stop-color="#16302a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7c977"/>
      <stop offset="1" stop-color="#b08d57"/>
    </linearGradient>
    <linearGradient id="carrot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4ad4e"/>
      <stop offset="1" stop-color="#df7521"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="26" y="26" width="460" height="460" rx="72" fill="none" stroke="#d8c08a" stroke-width="6" stroke-opacity="0.55"/>
  <path d="M160 392 A112 120 0 1 1 352 392" fill="none" stroke="url(#gold)" stroke-width="40" stroke-linecap="round"/>
  <g fill="#7a5a1f">
    <circle cx="168" cy="336" r="7"/>
    <circle cx="150" cy="246" r="7"/>
    <circle cx="202" cy="172" r="7"/>
    <circle cx="310" cy="172" r="7"/>
    <circle cx="362" cy="246" r="7"/>
    <circle cx="344" cy="336" r="7"/>
  </g>
  <g>
    <path d="M256 224 Q230 158 206 200 Q228 216 256 224 Z" fill="#5aa45a"/>
    <path d="M256 224 Q256 150 261 196 Q265 216 256 224 Z" fill="#4e9a50"/>
    <path d="M256 224 Q286 162 306 204 Q282 220 256 224 Z" fill="#5aa45a"/>
    <path d="M220 230 Q256 210 292 230 L256 402 Z" fill="url(#carrot)"/>
  </g>
</svg>`;
}

export function logoDataUri(): string {
  return `data:image/svg+xml,${encodeURIComponent(logoSquareSvg())}`;
}
