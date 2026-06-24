"use client";

// サウンドの しょきか（さいしょの タップで かいきん）・ルートごとの BGMきりかえ・
// ミュートトグルボタン を まとめた クライアントコンポーネント。layout で よびだす。

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { initAudio, isMuted, setMuted, playBgm } from "@/lib/audio";

function themeForPath(path: string | null): "menu" | "race" {
  return path && path.startsWith("/race") ? "race" : "menu";
}

export default function SoundControl() {
  const pathname = usePathname();
  const [muted, setMutedState] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // ミュートせっていの よみこみ
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  // さいしょの そうさで オーディオを かいきんし、BGMを かいし
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      initAudio();
      setUnlocked(true);
      playBgm(themeForPath(pathname));
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [unlocked, pathname]);

  // ルートが かわったら BGMを きりかえ
  useEffect(() => {
    if (unlocked) playBgm(themeForPath(pathname));
  }, [pathname, unlocked]);

  const toggle = () => {
    initAudio();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!unlocked) {
      setUnlocked(true);
      playBgm(themeForPath(pathname));
    }
  };

  return (
    <button
      type="button"
      className="sound-toggle"
      aria-label={muted ? "おとを ONにする" : "おとを OFFにする"}
      onClick={toggle}
    >
      {muted ? "🔇" : "🎵"}
    </button>
  );
}
