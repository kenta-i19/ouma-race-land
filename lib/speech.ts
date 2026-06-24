"use client";

// もんだいや じっきょうを こえで よみあげる。
// ブラウザの Web Speech API（speechSynthesis）を つかう。
//
// しぜんな こえに するために、
//   ・たんまつに ある いちばん こうひんしつな にほんごボイスを えらぶ
//     （Google にほんご / Siri / Microsoft Natural / Kyoko など）
//   ・ピッチ・はやさを しぜんな あたいに する
// たいおうしていない ブラウザでは なにも おこらない（ゲームは ふつうに あそべる）。

let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceResolved = false;

// なまえに この ことばが はいっている にほんごボイスを ゆうせん（うえほど こうひんしつ）。
const VOICE_PRIORITY = [
  "natural", // Microsoft Online Natural（Nanami など）
  "google", // Google 日本語（Chrome：しぜん）
  "siri", // iOS / macOS の Siri ボイス
  "premium",
  "enhanced",
  "o-ren",
  "kyoko",
  "otoya",
  "hattori",
  "sayaka",
  "nanami",
  "ayumi",
  "haruka",
  "ichiro",
  "keita",
];

function isJa(v: SpeechSynthesisVoice): boolean {
  return /^ja(-|_|$)/i.test(v.lang) || /japanese|日本語/i.test(v.name);
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  for (let i = 0; i < VOICE_PRIORITY.length; i++) {
    if (name.includes(VOICE_PRIORITY[i])) return VOICE_PRIORITY.length - i;
  }
  return 0;
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices().filter(isJa);
  if (voices.length === 0) return null;
  // てんすうが たかい じゅん→ローカル（オフライン）を ゆうせん
  voices.sort((a, b) => {
    const s = scoreVoice(b) - scoreVoice(a);
    if (s !== 0) return s;
    return Number(b.localService) - Number(a.localService);
  });
  return voices[0];
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (voiceResolved && cachedVoice) return cachedVoice;
  const best = pickBestVoice();
  if (best) {
    cachedVoice = best;
    voiceResolved = true;
  }
  return cachedVoice;
}

// ボイスは ひどうきで よみこまれる ことが あるので、よみこまれたら えらびなおす。
if (typeof window !== "undefined" && window.speechSynthesis) {
  ensureVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = pickBestVoice();
    voiceResolved = !!cachedVoice;
  });
}

export function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel(); // まえの よみあげを とめる
    const u = new SpeechSynthesisUtterance(text);
    const voice = ensureVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "ja-JP";
    u.rate = 1.0; // しぜんな はやさ
    u.pitch = 1.0; // しぜんな たかさ（子供っぽい うらごえに しない）
    u.volume = 1.0;
    synth.speak(u);
  } catch {
    // よみあげに しっぱいしても むし
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // むし
  }
}
