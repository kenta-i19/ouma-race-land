"use client";

import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/lib/storage";
import HorseSVG from "@/components/HorseSVG";
import Logo from "@/components/Logo";
import { sfx } from "@/lib/audio";

export default function Home() {
  const { data, ready, reset } = useGame();
  const horse = ready ? data.myHorse : null;
  const [confirmAll, setConfirmAll] = useState(false);

  const doResetAll = () => {
    reset();
    setConfirmAll(false);
    sfx.select();
  };

  return (
    <main className="home">
      <header className="home-head">
        <span className="home-kicker">Carrot Derby Club</span>
        <span className="home-balance">
          <span className="hb-icon">🥕</span>
          <span className="hb-num">{ready ? data.coins : "—"}</span>
        </span>
      </header>

      <section className="home-hero">
        <Logo size={112} className="hero-logo" />
        <h1 className="home-title">にんじんダービー</h1>
        <span className="hero-wordmark">CARROT DERBY</span>
        <span className="hero-divider" aria-hidden />
        <p className="home-lead">
          あいばを そだてて、レースへ。
          <br />
          まなびが ちからに かわる ばしょ。
        </p>
      </section>

      <nav className="menu">
        <Link href="/study" className="menu-item">
          <span className="mi-icon study">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#3a73a8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6.5C10.5 5 8 4.5 4 4.8v12.4c4-.3 6.5.2 8 1.6 1.5-1.4 4-1.9 8-1.6V4.8c-4-.3-6.5.2-8 1.7Z" />
              <path d="M12 6.5v12.3" />
            </svg>
          </span>
          <span className="mi-body">
            <span className="mi-en">Study</span>
            <span className="mi-title">べんきょう</span>
            <span className="mi-desc">もんだいに こたえて にんじんコインを あつめる</span>
          </span>
          <span className="mi-go" aria-hidden>→</span>
        </Link>

        <Link href="/stable" className="menu-item">
          <span className="mi-icon stable"><HorseSVG color={horse ? horse.color : "#7a4a2b"} size={38} deco={horse?.deco} /></span>
          <span className="mi-body">
            <span className="mi-en">Stable</span>
            <span className="mi-title">{horse ? `${horse.name} を そだてる` : "あいばを そだてる"}</span>
            <span className="mi-desc">
              {horse
                ? `Lv.${horse.level} ・ トレーニングで つよく する`
                : "じぶんの おうまを むかえて トレーニング"}
            </span>
          </span>
          <span className="mi-go" aria-hidden>→</span>
        </Link>

        <Link href="/race" className="menu-item feature">
          <span className="mi-icon race">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#234a39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V3" />
              <path d="M5 4c3-1.6 6 1.6 9 0v7c-3 1.6-6-1.6-9 0Z" fill="#234a39" fillOpacity="0.16" />
            </svg>
          </span>
          <span className="mi-body">
            <span className="mi-en">Race</span>
            <span className="mi-title">おうまレース</span>
            <span className="mi-desc">あいばで しゅつそう。コインを かけて かんせん</span>
          </span>
          <span className="mi-go" aria-hidden>→</span>
        </Link>
      </nav>

      {ready && (
        <div className="home-stats">
          <span className="hs-cell">
            <b>{data.studyCorrect}</b>
            <span>せいかい</span>
          </span>
          <span className="hs-cell">
            <b>{data.racesWon}</b>
            <span>しょうり</span>
          </span>
          <span className="hs-cell">
            <b>{data.racesPlayed}</b>
            <span>しゅつそう</span>
          </span>
          {horse && (
            <span className="hs-cell">
              <b>Lv.{horse.level}</b>
              <span>あいば</span>
            </span>
          )}
        </div>
      )}

      {/* ── すべて 初期化 ── */}
      <footer className="home-foot">
        {!confirmAll ? (
          <button className="reset-link" onClick={() => setConfirmAll(true)}>
            すべての データを 初期化する
          </button>
        ) : (
          <div className="reset-confirm">
            <p className="reset-q">
              ほんとうに ぜんぶ 初期化する？<br />
              コイン・せいせき・あいば すべてが きえます
            </p>
            <div className="reset-actions">
              <button className="reset-yes" onClick={doResetAll}>はい、ぜんぶ けす</button>
              <button className="reset-no" onClick={() => setConfirmAll(false)}>やめる</button>
            </div>
          </div>
        )}
      </footer>
    </main>
  );
}
