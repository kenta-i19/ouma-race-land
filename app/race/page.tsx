"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/storage";
import { HORSES, BET_OPTIONS, stepHorse, Horse } from "@/lib/game";
import { speak } from "@/lib/speech";

type Phase = "picking" | "racing" | "result";

const FINISH = 88; // ゴールまでの きょり（%）

export default function RacePage() {
  const { data, ready, update } = useGame();
  const [phase, setPhase] = useState<Phase>("picking");
  const [horseId, setHorseId] = useState<number | null>(null);
  const [bet, setBet] = useState<number>(BET_OPTIONS[0]);
  const [positions, setPositions] = useState<number[]>(HORSES.map(() => 0));
  const [winnerId, setWinnerId] = useState<number | null>(null);

  const posRef = useRef<number[]>(HORSES.map(() => 0));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // アンマウントじに タイマーを かたづける
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const canBet = ready && horseId !== null && bet <= data.coins;

  const startRace = () => {
    if (!canBet || horseId === null) return;

    // かけきんを さきに ひく
    update((p) => ({ ...p, coins: p.coins - bet, racesPlayed: p.racesPlayed + 1 }));

    posRef.current = HORSES.map(() => 0);
    setPositions([...posRef.current]);
    setWinnerId(null);
    setPhase("racing");
    speak("よーい、どん！");

    timerRef.current = setInterval(() => {
      const next = posRef.current.map((pos, i) =>
        Math.min(FINISH, pos + stepHorse(HORSES[i]))
      );
      posRef.current = next;
      setPositions([...next]);

      // ゴールした うまが いるか
      const finishedIdx = next
        .map((p, i) => ({ p, i }))
        .filter((x) => x.p >= FINISH);

      if (finishedIdx.length > 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // いちばん すすんだ うまを かちとする
        finishedIdx.sort((a, b) => b.p - a.p);
        const winner = HORSES[finishedIdx[0].i];
        finishRace(winner);
      }
    }, 120);
  };

  const finishRace = (winner: Horse) => {
    setWinnerId(winner.id);
    setPhase("result");
    const won = winner.id === horseId;
    if (won) {
      const payout = bet * winner.odds;
      update((p) => ({
        ...p,
        coins: p.coins + payout,
        racesWon: p.racesWon + 1,
      }));
      speak(`やったー！ ${winner.name} の かち！ にんじんコイン ${payout}まい ゲット！`);
    } else {
      speak(`${winner.name} の かちー！ ざんねん、また がんばろう！`);
    }
  };

  const reset = () => {
    posRef.current = HORSES.map(() => 0);
    setPositions([...posRef.current]);
    setWinnerId(null);
    setHorseId(null);
    setPhase("picking");
  };

  const myHorse = HORSES.find((h) => h.id === horseId) || null;
  const iWon = phase === "result" && winnerId === horseId;
  const payout = myHorse ? bet * myHorse.odds : 0;

  return (
    <main className="screen">
      <Link href="/" className="backbtn">
        ◀ おうち
      </Link>

      <div className="coinbar">
        <span className="icon">🥕</span>
        <span>{ready ? data.coins : "…"}</span>
      </div>

      {/* ── レースじょう ── */}
      <div className="track">
        {HORSES.map((h, i) => (
          <div className="lane" key={h.id}>
            <div className="finish" />
            <div
              className="runner"
              style={{ left: `${positions[i]}%` }}
            >
              <span className="num">{h.id}</span>
              {h.emoji}
            </div>
          </div>
        ))}
      </div>

      {/* ── けっか ── */}
      {phase === "result" && (
        <div className={`celebrate ${iWon ? "win" : "lose"}`}>
          {iWon
            ? `🎉 ${myHorse?.name} かった！ +${payout}🥕`
            : `${HORSES.find((h) => h.id === winnerId)?.name} の かち… また あそぼう！`}
        </div>
      )}

      {/* ── うまえらび と かけ ── */}
      {phase === "picking" && (
        <>
          <p className="hint">🐴 どの おうまを おうえんする？</p>
          {HORSES.map((h) => (
            <button
              key={h.id}
              className={`horse-pick ${horseId === h.id ? "selected" : ""}`}
              onClick={() => setHorseId(h.id)}
            >
              <span className="num">{h.id}</span>
              <span className="h-emoji">{h.emoji}</span>
              <span className="h-name">{h.name}</span>
              <span className="h-odds">{h.odds}ばい</span>
            </button>
          ))}

          <p className="hint">🥕 なんまい かける？</p>
          <div className="bet-row">
            {BET_OPTIONS.map((b) => (
              <button
                key={b}
                className={`bet-chip ${bet === b ? "selected" : ""}`}
                disabled={ready && b > data.coins}
                onClick={() => setBet(b)}
              >
                {b}まい
              </button>
            ))}
          </div>

          <button className="gobtn" disabled={!canBet} onClick={startRace}>
            {horseId === null
              ? "おうまを えらんでね"
              : bet > data.coins
              ? "コインが たりないよ"
              : "スタート！ 🏁"}
          </button>

          {ready && data.coins < BET_OPTIONS[0] && (
            <p className="hint">
              コインが すくないよ。<Link href="/study">べんきょう</Link>して あつめよう！
            </p>
          )}
        </>
      )}

      {phase === "racing" && <p className="hint">🏇 がんばれー！</p>}

      {phase === "result" && (
        <>
          <button className="gobtn" onClick={reset}>
            もう いっかい ▶
          </button>
          <p className="hint">
            コインが ほしいときは <Link href="/study">べんきょう</Link>しよう！
          </p>
        </>
      )}
    </main>
  );
}
