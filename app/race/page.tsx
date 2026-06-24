"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/storage";
import { BET_OPTIONS } from "@/lib/game";
import {
  Racer,
  RaceEvent,
  SimResult,
  DISTANCE,
  STYLE_LABEL,
  STYLE_EMOJI,
  buildField,
  computeOdds,
  simulateRace,
} from "@/lib/race";
import { applyRaceResult } from "@/lib/horse";
import { speak } from "@/lib/speech";

type Phase = "picking" | "countdown" | "racing" | "result";

// うまの しんこうど（0..1）を、だえん（オーバル）コースじょうの ざひょう（％）に へんかんする。
// レーンごとに はんけいを かえて、うちがわ／そとがわに ならべる。
// スタート／ゴールは した（6じ）の いちで、はんとけいまわりに 1しゅう する。
function ovalPos(progress: number, lane: number, lanes: number) {
  const f = (lane + 0.5) / lanes; // 0(そと)〜1(うち)
  const rx = 44 - f * 15;
  const ry = 43 - f * 15;
  const theta = Math.PI / 2 - Math.min(1, Math.max(0, progress)) * 2 * Math.PI;
  return {
    x: 50 + rx * Math.cos(theta),
    y: 50 + ry * Math.sin(theta),
  };
}

// at いか で いちばん あたらしい じっきょうを さがす
function latestEventAt(events: RaceEvent[], frame: number): RaceEvent | null {
  let found: RaceEvent | null = null;
  for (const e of events) {
    if (e.at <= frame) found = e;
    else break;
  }
  return found;
}

const MEDAL = ["🥇", "🥈", "🥉"];

type Outcome = {
  winnerIndex: number;
  placing: number | null; // あいばの じゅんい（あいばが いれば）
  betWon: boolean;
  payout: number; // ばけんの はらいもどし
  prize: number; // あいばの しょうきん
  expGain: number;
  leveledTo: number | null;
  photoFinish: boolean;
};

export default function RacePage() {
  const { data, ready, update } = useGame();

  const [phase, setPhase] = useState<Phase>("picking");
  const [field, setField] = useState<Racer[]>([]);
  const [odds, setOdds] = useState<number[]>([]);
  const [betIndex, setBetIndex] = useState<number | null>(null);
  const [bet, setBet] = useState<number>(BET_OPTIONS[0]);

  const [positions, setPositions] = useState<number[]>([]);
  const [countdown, setCountdown] = useState<number>(3);
  const [commentary, setCommentary] = useState<string>("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const simRef = useRef<SimResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokenRef = useRef<number>(-1);

  // しゅつばひょうを（さい）こうせいする
  const rebuild = () => {
    const f = buildField(data.myHorse);
    setField(f);
    setOdds(computeOdds(f));
    setPositions(f.map(() => 0));
    setBetIndex(null);
    setCommentary("");
    setOutcome(null);
    setPhase("picking");
  };

  // よみこみ かんりょうで しゅつばひょうを つくる
  useEffect(() => {
    if (ready && field.length === 0) rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // アンマウントで タイマーかたづけ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playerIndex = field.findIndex((r) => r.isPlayer);

  // ── ライブじゅんい（いまの いちで ならべた index）──
  const ranking = useMemo(() => {
    return field
      .map((_, i) => i)
      .sort((a, b) => (positions[b] ?? 0) - (positions[a] ?? 0));
  }, [field, positions]);
  const rankOf = (i: number) => ranking.indexOf(i) + 1;

  const canBet = ready && betIndex !== null && bet <= data.coins;

  // ── スタート（カウントダウンへ）──
  const startRace = () => {
    if (!canBet || betIndex === null) return;
    update((p) => ({ ...p, coins: p.coins - bet, racesPlayed: p.racesPlayed + 1 }));
    simRef.current = simulateRace(field, Math.random);
    spokenRef.current = -1;
    setPositions(field.map(() => 0));
    setCommentary("");
    setCountdown(3);
    setPhase("countdown");
  };

  // ── カウントダウンの しんこう ──
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 3) speak("よーい");
    if (countdown <= 0) {
      const id = setTimeout(beginPlayback, 650);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 780);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ── レースの さいせい（フレームおくり）──
  const beginPlayback = () => {
    const sim = simRef.current;
    if (!sim) return;
    setPhase("racing");
    speak("どん！");
    const first = latestEventAt(sim.events, 0);
    if (first) setCommentary(first.text);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      if (i >= sim.frames.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPositions(sim.frames[sim.frames.length - 1]);
        finishRace(sim);
        return;
      }
      setPositions(sim.frames[i]);
      const ev = latestEventAt(sim.events, i);
      if (ev) {
        setCommentary(ev.text);
        if (ev.big && spokenRef.current !== ev.at) {
          spokenRef.current = ev.at;
          speak(ev.text.replace(/[🏁🔥📸🏆]/g, ""));
        }
      }
    }, sim.frameMs);
  };

  // ── ゴールご の しゅうけい ──
  const finishRace = (sim: SimResult) => {
    const winnerIndex = sim.finishOrder[0];
    const betWon = betIndex === winnerIndex;
    const payout = betWon && betIndex !== null ? Math.round(bet * odds[betIndex]) : 0;

    let placing: number | null = null;
    let prize = 0;
    let expGain = 0;
    let leveledTo: number | null = null;

    if (playerIndex >= 0 && data.myHorse) {
      placing = sim.finishOrder.indexOf(playerIndex) + 1;
      prize = [20, 12, 7][placing - 1] ?? 3; // じゅんいしょうきん
      const reward = applyRaceResult(data.myHorse, placing, field.length);
      expGain = reward.expGain;
      leveledTo = reward.leveledTo;
      update((p) => ({
        ...p,
        coins: p.coins + payout + prize,
        racesWon: p.racesWon + (betWon ? 1 : 0),
        myHorse: reward.horse,
      }));
    } else {
      update((p) => ({
        ...p,
        coins: p.coins + payout,
        racesWon: p.racesWon + (betWon ? 1 : 0),
      }));
    }

    setOutcome({
      winnerIndex,
      placing,
      betWon,
      payout,
      prize,
      expGain,
      leveledTo,
      photoFinish: sim.photoFinish,
    });

    const winner = field[winnerIndex];
    if (betWon) {
      speak(`やったー！ ${winner.name} の かち！ にんじんコイン ${payout}まい！`);
    } else {
      speak(`${winner.name} の ゆうしょう！`);
    }
    setPhase("result");
  };

  const racing = phase === "racing" || phase === "countdown";

  return (
    <main className="screen">
      <div className="topbar">
        <Link href="/" className="backbtn">◀ おうち</Link>
        <div className="coinbar small">
          <span className="icon">🥕</span>
          <span>{ready ? data.coins : "…"}</span>
        </div>
      </div>

      {/* ── ライブじゅんい（レースちゅう）── */}
      {racing && (
        <div className="leaderboard">
          {ranking.slice(0, 3).map((idx, r) => (
            <span key={field[idx].key} className={`lb-item ${field[idx].isPlayer ? "you" : ""}`}>
              <b>{r + 1}</b>
              <span className="lb-emoji">{field[idx].emoji}</span>
              {field[idx].name}
            </span>
          ))}
        </div>
      )}

      {/* ── レースじょう（だえんコース）── */}
      <div className={`stage oval ${racing ? "running" : ""}`}>
        <div className="circuit">
          <div className="infield">
            {racing && commentary && <div className="commentary">{commentary}</div>}
          </div>
          <div className="startline" aria-hidden>
            <span className="startline-flag">🏁</span>
          </div>

          {field.map((h, i) => {
            const pos = positions[i] ?? 0;
            const done = pos >= DISTANCE;
            const rank = racing || phase === "result" ? rankOf(i) : 0;
            const { x, y } = ovalPos(pos / DISTANCE, i, field.length);
            return (
              <div
                key={h.key}
                className={`oval-runner ${h.isPlayer ? "player" : ""}`}
                style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) + 5 }}
              >
                {racing && !done && <span className="dust">💨</span>}
                <span
                  className={`horse-sprite ${racing && !done ? "gallop" : ""}`}
                  style={{ filter: `drop-shadow(0 3px 2px ${h.color}88)` }}
                >
                  {h.emoji}
                </span>
                {(racing || phase === "result") && (
                  <span className={`rankbadge rank-${rank}`}>{rank}</span>
                )}
                {h.isPlayer && <span className="you-flag">あなた</span>}
              </div>
            );
          })}
        </div>

        {/* カウントダウン */}
        {phase === "countdown" && (
          <div className="countdown">
            <span key={countdown} className="count-num">
              {countdown > 0 ? countdown : "GO!"}
            </span>
          </div>
        )}
      </div>

      {/* ════════ うまえらび ＆ ばけん ════════ */}
      {phase === "picking" && (
        <>
          {!data.myHorse && (
            <Link href="/stable" className="notice">
              🐣 じぶんの あいばを そだてると、レースに しゅつそう できるよ！ → ぼくじょうへ
            </Link>
          )}

          <p className="hint">🏇 どの うまが かつ？ 1とう えらんで コインを かけよう</p>

          {field.map((h, i) => (
            <button
              key={h.key}
              className={`horse-pick ${betIndex === i ? "selected" : ""} ${h.isPlayer ? "is-you" : ""}`}
              onClick={() => setBetIndex(i)}
            >
              <span className="num">{i + 1}</span>
              <span className="h-emoji">{h.emoji}</span>
              <span className="h-main">
                <span className="h-name">
                  {h.name}
                  {h.isPlayer && <span className="you-tag">あなたの あいば</span>}
                </span>
                <span className="h-style">
                  {STYLE_EMOJI[h.style]} {STYLE_LABEL[h.style]}
                </span>
              </span>
              <span className="h-odds">{odds[i]?.toFixed(1)}ばい</span>
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
            {betIndex === null
              ? "うまを えらんでね"
              : bet > data.coins
              ? "コインが たりないよ"
              : "スタートゲートへ！ 🏁"}
          </button>

          {ready && data.coins < BET_OPTIONS[0] && (
            <p className="hint">
              コインが すくないよ。<Link href="/study">べんきょう</Link>して あつめよう！
            </p>
          )}
        </>
      )}

      {/* ════════ けっか ════════ */}
      {phase === "result" && outcome && (
        <div className="result-wrap">
          {outcome.photoFinish && <p className="photo-tag">📸 しゃしんはんてい の せっせん！</p>}

          {/* ひょうしょうだい */}
          <div className="podium">
            {[1, 0, 2].map((slot) => {
              const idx = simRef.current?.finishOrder[slot];
              if (idx === undefined) return null;
              const h = field[idx];
              return (
                <div key={h.key} className={`podium-col p${slot} ${h.isPlayer ? "you" : ""}`}>
                  <div className="podium-emoji">{h.emoji}</div>
                  <div className="podium-name">{h.name}</div>
                  <div className="podium-block">{MEDAL[slot]}</div>
                </div>
              );
            })}
          </div>

          {/* ばけん の けっか */}
          <div className={`celebrate ${outcome.betWon ? "win" : "lose"}`}>
            {outcome.betWon
              ? `🎉 あたり！ にんじんコイン +${outcome.payout}🥕`
              : `ざんねん… ${field[outcome.winnerIndex].name} の かち`}
          </div>

          {/* あいば の せいせき */}
          {outcome.placing !== null && (
            <div className="horse-result">
              <div className="hr-line">
                🐴 あなたの あいばは <b>{outcome.placing}ちゃくゴール！</b>
                <span className="hr-prize">しょうきん +{outcome.prize}🥕</span>
              </div>
              <div className="hr-line exp">けいけんち +{outcome.expGain} ✨</div>
              {outcome.leveledTo !== null && (
                <div className="levelup-banner">⭐ レベルアップ！ Lv.{outcome.leveledTo} になった！</div>
              )}
            </div>
          )}

          <button className="gobtn" onClick={rebuild}>もう いっかい ▶</button>
          <div className="result-links">
            {data.myHorse ? (
              <Link href="/stable" className="minilink">🏡 ぼくじょうで そだてる</Link>
            ) : (
              <Link href="/stable" className="minilink">🐣 あいばを むかえる</Link>
            )}
            <Link href="/study" className="minilink">✏️ べんきょうで コイン</Link>
          </div>
        </div>
      )}
    </main>
  );
}
