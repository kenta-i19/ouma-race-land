"use client";

// もじが まだ よめない 4さいじ のために、もんだいを こえで よみあげる。
// ブラウザの Web Speech API（speechSynthesis）を つかう。
// たいおうしていない ブラウザでは なにも おこらない（ゲームは ふつうに あそべる）。

export function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel(); // まえの よみあげを とめる
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.95; // こどもむけに すこし ゆっくり
    u.pitch = 1.1; // あかるい こえ
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
