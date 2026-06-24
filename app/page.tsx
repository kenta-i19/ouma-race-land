"use client";

import Link from "next/link";
import { useGame } from "@/lib/storage";

export default function Home() {
  const { data, ready } = useGame();
  const horse = ready ? data.myHorse : null;

  return (
    <main className="home">
      <header className="home-head">
        <span className="home-kicker">Thoroughbred Club</span>
        <span className="home-balance">
          <span className="hb-icon">🥕</span>
          <span className="hb-num">{ready ? data.coins : "—"}</span>
        </span>
      </header>

      <section className="home-hero">
        <span className="hero-emblem">🐎</span>
        <span className="hero-wordmark">OUMA RACE LAND</span>
        <h1 className="home-title">おうまレースランド</h1>
        <span className="hero-divider" aria-hidden />
        <p className="home-lead">
          あいばを そだてて、レースへ。
          <br />
          まなびが ちからに かわる ばしょ。
        </p>
      </section>

      <nav className="menu">
        <Link href="/study" className="menu-item">
          <span className="mi-icon study">✏️</span>
          <span className="mi-body">
            <span className="mi-en">Study</span>
            <span className="mi-title">べんきょう</span>
            <span className="mi-desc">もんだいに こたえて にんじんコインを あつめる</span>
          </span>
          <span className="mi-go" aria-hidden>→</span>
        </Link>

        <Link href="/stable" className="menu-item">
          <span className="mi-icon stable">{horse ? horse.emoji : "🏡"}</span>
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
          <span className="mi-icon race">🏇</span>
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
    </main>
  );
}
