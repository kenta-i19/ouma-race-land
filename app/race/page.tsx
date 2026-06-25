"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/storage";
import { BET_OPTIONS } from "@/lib/game";
import {
  Racer,
  RaceEvent,
  SimResult,
  RaceRank,
  RACE_RANKS,
  DISTANCE,
  STYLE_LABEL,
  STYLE_EMOJI,
  buildField,
  computeOdds,
  simulateRace,
  pickRaceName,
} from "@/lib/race";
import { applyRaceResult, totalPower } from "@/lib/horse";
import { sfx, startHoofbeats, stopHoofbeats } from "@/lib/audio";
import HorseSVG from "@/components/HorseSVG";

type Phase = "picking" | "countdown" | "racing" | "result";

// コースの よこ/たて ひ（globals.css の .stage.oval の aspect-ratio と そろえる）
const TRACK_AR = 1.5;

// うまの しんこうど（0..1）を、ほんかくてきな オーバルコース（ちょくせん＋はんえんターン＝
// スタジアムがた）じょうの ざひょう（％）に へんかんする。
// ターンが ピクセルえん に なるよう よこはんけいを AR で ほせい。
// スタート／ゴールは した（ホームストレッチ）。はんとけいまわりに 1しゅう。
function ovalPos(progress: number, lane: number, lanes: number) {
  const f = (lane + 0.5) / lanes; // 0(そと)〜1(うち)
  const halfH = 39 - f * 15; // たて はんけい（％）
  const halfW = 46 - f * 15; // よこ はんけい（％）
  const rx = halfH / TRACK_AR; // ターンの よこはんけい（％）
  const sx = Math.max(0, halfW - rx); // ちょくせんの はんぶん（％）
  const cx = 50;
  const cy = 50;

  const straight = sx * TRACK_AR; // ピクセルきんじ の ちょくせんちょう（はんぶん）
  const turn = Math.PI * halfH; // はんえんの ながさ
  const total = 4 * straight + 2 * turn;
  let d = Math.min(1, Math.max(0, progress)) * total;

  // ① した：ちゅうおう→みぎ
  if (d <= straight) {
    return { x: cx + sx * (d / straight), y: cy + halfH };
  }
  d -= straight;
  // ② みぎターン：した→うえ
  if (d <= turn) {
    const a = Math.PI / 2 - (d / turn) * Math.PI;
    return { x: cx + sx + rx * Math.cos(a), y: cy + halfH * Math.sin(a) };
  }
  d -= turn;
  // ③ うえ：みぎ→ひだり
  if (d <= 2 * straight) {
    return { x: cx + sx - 2 * sx * (d / (2 * straight)), y: cy - halfH };
  }
  d -= 2 * straight;
  // ④ ひだりターン：うえ→した
  if (d <= turn) {
    const a = -Math.PI / 2 - (d / turn) * Math.PI;
    return { x: cx - sx + rx * Math.cos(a), y: cy + halfH * Math.sin(a) };
  }
  d -= turn;
  // ⑤ した：ひだり→ちゅうおう（ホームストレッチ＝ゴールへ）
  return { x: cx - sx + sx * Math.min(1, d / straight), y: cy + halfH };
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
  rankLabel: string;
  raceName: string;
  gotTrophy: boolean;
  isG1: boolean;
  isCup: boolean;
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
  const [tweenMs, setTweenMs] = useState<number>(68); // うまの ほかんじかん（フレームかんかくに あわせる）
  const [finalStretch, setFinalStretch] = useState(false); // ゴールまえの えんしゅつ
  const [rankId, setRankId] = useState<RaceRank["id"]>("maiden");
  const [raceName, setRaceName] = useState<string>("");

  const power = data.myHorse ? totalPower(data.myHorse) : 0;
  const rank = RACE_RANKS.find((r) => r.id === rankId) ?? RACE_RANKS[0];

  const simRef = useRef<SimResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spokenRef = useRef<number>(-1);

  // しゅつばひょうを ランクに あわせて つくる
  const buildForRank = (rid: RaceRank["id"]) => {
    const rk = RACE_RANKS.find((r) => r.id === rid) ?? RACE_RANKS[0];
    const f = buildField(data.myHorse, rk.rivalMul, rk.legend);
    setField(f);
    setOdds(computeOdds(f));
    setPositions(f.map(() => 0));
    setBetIndex(null);
    setRaceName(pickRaceName(rid, Math.random));
  };

  // しゅつばひょうを（さい）こうせいする
  const rebuild = () => {
    buildForRank(rankId);
    setCommentary("");
    setOutcome(null);
    setFinalStretch(false);
    setPhase("picking");
  };

  // ランクを かえる（しゅつそうけんり が あれば）
  const changeRank = (rid: RaceRank["id"]) => {
    setRankId(rid);
    buildForRank(rid);
    sfx.select();
  };

  // よみこみ かんりょうで しゅつばひょうを つくる
  useEffect(() => {
    if (ready && field.length === 0) rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // アンマウントで タイマー・くつおとを かたづける
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopHoofbeats();
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

  const canBet = ready && betIndex !== null && bet >= 1 && bet <= data.coins;

  // ── スタート（カウントダウンへ）──
  const startRace = () => {
    if (!canBet || betIndex === null) return;
    update((p) => ({ ...p, coins: p.coins - bet, racesPlayed: p.racesPlayed + 1 }));
    simRef.current = simulateRace(field, Math.random);
    spokenRef.current = -1;
    setPositions(field.map(() => 0));
    setCommentary("");
    setFinalStretch(false);
    setTweenMs(simRef.current.frameMs);
    setCountdown(3);
    setPhase("countdown");
  };

  // ── カウントダウンの しんこう ──
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown > 0) sfx.count();
    if (countdown <= 0) {
      const id = setTimeout(beginPlayback, 650);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 780);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // フレームごとの さいせいかんかく。ゴールに ちかづくほど ゆっくり（スローモーション）に
  // して、ゴールまえの ドキドキを ひきのばす。
  const stepDelay = (lead: number, base: number) =>
    lead > 0.95 ? base * 1.8 : lead > 0.86 ? base * 1.45 : lead > 0.72 ? base * 1.15 : base;

  // ── レースの さいせい（フレームおくり・かわる かんかく）──
  const beginPlayback = () => {
    const sim = simRef.current;
    if (!sim) return;
    setPhase("racing");
    sfx.go();
    startHoofbeats();
    const first = latestEventAt(sim.events, 0);
    if (first) setCommentary(first.text);
    setPositions(sim.frames[0]);
    const base = sim.frameMs;

    const advance = (i: number) => {
      const lead = Math.max(...sim.frames[i]) / DISTANCE;
      const delay = stepDelay(lead, base);
      timerRef.current = setTimeout(() => {
        const next = i + 1;
        setTweenMs(delay); // うごきを かんかくに あわせて なめらかに
        if (next >= sim.frames.length) {
          setPositions(sim.frames[sim.frames.length - 1]);
          setFinalStretch(false);
          finishRace(sim);
          return;
        }
        setPositions(sim.frames[next]);
        const lead2 = Math.max(...sim.frames[next]) / DISTANCE;
        setFinalStretch(lead2 > 0.86);
        const ev = latestEventAt(sim.events, next);
        if (ev) {
          setCommentary(ev.text);
          if (ev.big && spokenRef.current !== ev.at) {
            spokenRef.current = ev.at;
            if (ev.text.includes("📸")) sfx.photo();
          }
        }
        advance(next);
      }, delay);
    };
    advance(0);
  };

  // ── ゴールご の しゅうけい ──
  const finishRace = (sim: SimResult) => {
    stopHoofbeats();
    const winnerIndex = sim.finishOrder[0];
    const betWon = betIndex === winnerIndex;
    const payout = betWon && betIndex !== null ? Math.round(bet * odds[betIndex]) : 0;

    let placing: number | null = null;
    let prize = 0;
    let expGain = 0;
    let leveledTo: number | null = null;
    let gotTrophy = false;

    if (playerIndex >= 0 && data.myHorse) {
      placing = sim.finishOrder.indexOf(playerIndex) + 1;
      prize = Math.round(([20, 12, 7][placing - 1] ?? 3) * rank.prizeMul); // ランクで しょうきん UP
      const reward = applyRaceResult(data.myHorse, placing, field.length, rank.expMul);
      expGain = reward.expGain;
      leveledTo = reward.leveledTo;
      gotTrophy = placing === 1 && rank.trophyKey !== "";
      const collect = placing === 1 ? rank.collectRank : "";
      update((p) => {
        const already = collect ? p.wonRaces.some((w) => w.name === raceName) : true;
        return {
          ...p,
          coins: p.coins + payout + prize,
          racesWon: p.racesWon + (betWon ? 1 : 0),
          myHorse: reward.horse,
          trophies:
            gotTrophy && rank.trophyKey
              ? { ...p.trophies, [rank.trophyKey]: p.trophies[rank.trophyKey] + 1 }
              : p.trophies,
          wonRaces:
            collect && !already
              ? [...p.wonRaces, { name: raceName, rank: collect }]
              : p.wonRaces,
        };
      });
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
      rankLabel: rank.label,
      raceName,
      gotTrophy,
      isG1: gotTrophy && rank.id === "g1",
      isCup: placing === 1 && rank.collectRank === "cup",
    });

    // かち（ばけんてき中 or あいばが1ちゃく）なら ファンファーレ
    if (betWon || placing === 1) sfx.win();
    else sfx.lose();
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

      {/* ── レースめい ── */}
      {raceName && phase !== "result" && (
        <div className={`race-header rk-${rankId}`}>
          <span className="rh-rank">{rank.label}</span>
          <span className="rh-name">{raceName}</span>
        </div>
      )}

      {/* ── ライブじゅんい（レースちゅう）── */}
      {racing && (
        <div className="leaderboard">
          {ranking.slice(0, 3).map((idx, r) => (
            <span key={field[idx].key} className={`lb-item ${field[idx].isPlayer ? "you" : ""}`}>
              <b>{r + 1}</b>
              <span className="lb-dot" style={{ background: field[idx].color }} />
              {field[idx].name}
            </span>
          ))}
        </div>
      )}

      {/* ── レースじょう（だえんコース）── */}
      <div className={`stage oval ${racing ? "running" : ""} ${finalStretch ? "finalstretch" : ""}`}>
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
            // すすむ むきで うまの むきを きめる
            const ahead = ovalPos((pos + 8) / DISTANCE, i, field.length);
            const faceLeft = ahead.x < x - 0.05;
            return (
              <div
                key={h.key}
                className={`oval-runner ${h.isPlayer ? "player" : ""}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  zIndex: Math.round(y) + 5,
                  transition: `left ${tweenMs}ms linear, top ${tweenMs}ms linear`,
                }}
              >
                <span className="horse-shadow" />
                <span
                  className="horse-facing"
                  style={{ transform: faceLeft ? "scaleX(-1)" : undefined }}
                >
                  <span className={`horse-sprite ${racing && !done ? "gallop" : ""}`}>
                    {racing && !done && <span className="dust">💨</span>}
                    <HorseSVG color={h.color} size={46} deco={h.deco} />
                  </span>
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

          {/* ランクえらび */}
          <p className="hint">🏆 ランクを えらぶ（あいばを そだてると じょうい かいほう）</p>
          <div className="rank-row">
            {RACE_RANKS.map((r) => {
              const needG1 = r.requiresG1 && data.trophies.g1 < 1;
              const locked = power < r.minPower || !!needG1;
              return (
                <button
                  key={r.id}
                  className={`rank-chip ${rankId === r.id ? "selected" : ""} ${locked ? "locked" : ""} rk-${r.id}`}
                  disabled={locked}
                  onClick={() => changeRank(r.id)}
                >
                  {r.label}
                  {locked && <span className="rank-lock">{needG1 ? "🔒G1せいは" : `🔒${r.minPower}`}</span>}
                </button>
              );
            })}
          </div>

          <p className="hint">🏇 どの うまが かつ？ 1とう えらんで コインを かけよう</p>

          {field.map((h, i) => (
            <button
              key={h.key}
              className={`horse-pick ${betIndex === i ? "selected" : ""} ${h.isPlayer ? "is-you" : ""}`}
              onClick={() => setBetIndex(i)}
            >
              <span className="num">{i + 1}</span>
              <span className="h-portrait"><HorseSVG color={h.color} size={42} deco={h.deco} /></span>
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
            <button
              className={`bet-chip ${bet === data.coins && data.coins > 0 ? "selected" : ""}`}
              disabled={!ready || data.coins < 1}
              onClick={() => setBet(data.coins)}
            >
              ぜんぶ
            </button>
          </div>

          <div className="bet-input-row">
            <span className="bet-input-label">じぶんで にゅうりょく</span>
            <input
              className="bet-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={ready ? data.coins : 1}
              value={bet}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value) || 0);
                const clamped = Math.max(0, Math.min(v, data.coins));
                setBet(clamped);
              }}
            />
            <span className="bet-input-unit">まい</span>
          </div>

          <button className="gobtn" disabled={!canBet} onClick={startRace}>
            {betIndex === null
              ? "うまを えらんでね"
              : bet < 1
              ? "かける まいすうを いれてね"
              : bet > data.coins
              ? "コインが たりないよ"
              : `${bet}まい かけて スタート！ 🏁`}
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
          <p className="result-racename">
            <span className="rh-rank">{outcome.rankLabel}</span> {outcome.raceName}
          </p>
          {outcome.isCup && <p className="hall-banner cup">👑 チャンピオンズ「{outcome.raceName}」せいは！ レジェンド！ 🏆</p>}
          {outcome.isG1 && <p className="hall-banner">🚩 G1「{outcome.raceName}」せいは！ はたを ゲット！ 👑</p>}
          {outcome.gotTrophy && !outcome.isG1 && !outcome.isCup && (
            <p className="trophy-banner">🏆 {outcome.rankLabel}「{outcome.raceName}」ゆうしょう！ トロフィー ゲット！</p>
          )}
          {outcome.photoFinish && <p className="photo-tag">📸 しゃしんはんてい の せっせん！</p>}

          {/* ひょうしょうだい */}
          <div className="podium">
            {[1, 0, 2].map((slot) => {
              const idx = simRef.current?.finishOrder[slot];
              if (idx === undefined) return null;
              const h = field[idx];
              return (
                <div key={h.key} className={`podium-col p${slot} ${h.isPlayer ? "you" : ""}`}>
                  <div className="podium-horse"><HorseSVG color={h.color} size={48} deco={h.deco} /></div>
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
            <Link href="/collection" className="minilink">🏅 コレクション</Link>
          </div>
        </div>
      )}
    </main>
  );
}
