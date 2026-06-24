"use client";

import Link from "next/link";
import { useGame } from "@/lib/storage";

export default function Home() {
  const { data, ready } = useGame();

  return (
    <main className="screen">
      <div className="coinbar">
        <span className="icon">🥕</span>
        <span>{ready ? data.coins : "…"}</span>
      </div>

      <div className="hero-horse">🐴</div>
      <h1 className="title">おうまレースランド</h1>
      <p className="subtitle">べんきょうして おうまレースで あそぼう！</p>

      <Link href="/study" className="bigbtn study">
        <span className="emoji">✏️</span>
        <span>
          べんきょうする
          <span className="sub">もんだいに こたえて にんじんコインを ゲット！</span>
        </span>
      </Link>

      <Link href="/race" className="bigbtn race">
        <span className="emoji">🏇</span>
        <span>
          おうまレース
          <span className="sub">コインを かけて おうまを おうえん！</span>
        </span>
      </Link>

      {ready && (
        <div className="statbar">
          <span>せいかい {data.studyCorrect}もん</span>
          <span>レース {data.racesWon}/{data.racesPlayed}しょう</span>
        </div>
      )}
    </main>
  );
}
