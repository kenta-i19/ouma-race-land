"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/storage";
import HorseSVG from "@/components/HorseSVG";
import Logo from "@/components/Logo";
import CoinIcon from "@/components/CoinIcon";
import { sfx } from "@/lib/audio";

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function Home() {
  const { data, ready, update, reset } = useGame();
  const horse = ready ? data.myHorse : null;
  const [confirmAll, setConfirmAll] = useState(false);
  const [bonus, setBonus] = useState<{ amount: number; streak: number } | null>(null);
  const bonusChecked = useRef(false);

  const doResetAll = () => {
    reset();
    setConfirmAll(false);
    bonusChecked.current = true; // 初期化ちょくごに ボーナスを ださない
    sfx.select();
  };

  // デイリーボーナス：1日1回、れんぞく日数で ぞうりょう
  useEffect(() => {
    if (!ready || bonusChecked.current) return;
    bonusChecked.current = true;
    const today = dateStr(new Date());
    if (data.lastBonusDate === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const streak = data.lastBonusDate === dateStr(y) ? data.loginStreak + 1 : 1;
    const amount = 8 + Math.min(streak, 7) * 2;
    setBonus({ amount, streak });
  }, [ready, data.lastBonusDate, data.loginStreak]);

  const claimBonus = () => {
    if (!bonus) return;
    const amount = bonus.amount;
    const streak = bonus.streak;
    update((p) => ({ ...p, coins: p.coins + amount, lastBonusDate: dateStr(new Date()), loginStreak: streak }));
    sfx.coin();
    setBonus(null);
  };

  return (
    <main className="home">
      <header className="home-head">
        <span className="home-kicker">Carrot Derby Club</span>
        <span className="home-balance">
          <CoinIcon size={18} className="hb-icon" />
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
            <span className="mi-desc">もんだいに こたえて コインを あつめる</span>
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

      {/* トロフィーだな（タップで コレクション）*/}
      {ready && (
        <Link href="/collection" className="trophy-row">
          <span className="trophy-cell g1">👑 G1 <b>{data.trophies.g1}</b></span>
          <span className="trophy-cell">🏆 G2 <b>{data.trophies.g2}</b></span>
          <span className="trophy-cell">🏆 G3 <b>{data.trophies.g3}</b></span>
          <span className="trophy-more">🏅 コレクション →</span>
        </Link>
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

      {/* ── デイリーボーナス ── */}
      {bonus && (
        <div className="bonus-overlay" onClick={claimBonus}>
          <div className="bonus-card" onClick={(e) => e.stopPropagation()}>
            <div className="bonus-gift">🎁</div>
            <p className="bonus-title">ログインボーナス</p>
            <p className="bonus-streak">{bonus.streak}にち れんぞく！</p>
            <p className="bonus-amount">+{bonus.amount} 🪙</p>
            <button className="gobtn" onClick={claimBonus}>うけとる</button>
          </div>
        </div>
      )}
    </main>
  );
}
