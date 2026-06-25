"use client";

import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/lib/storage";
import HorseSVG from "@/components/HorseSVG";
import {
  COAT_COLORS,
  DECOS,
  Deco,
  NAME_IDEAS,
  TRAININGS,
  TrainingMenu,
  FOODS,
  FoodMenu,
  createHorse,
  trainHorse,
  feedHorse,
  restHorse,
  expToNext,
  statPct,
  totalPower,
  growthStage,
  GROWTH_LABEL,
  horseMood,
  stableInfo,
  NEXT_TIER_HINT,
} from "@/lib/horse";
import { RunStyle, STYLE_LABEL, STYLE_DESC, STYLE_EMOJI } from "@/lib/race";
import { sfx } from "@/lib/audio";

const STYLES: RunStyle[] = ["nige", "senko", "sashi", "oikomi"];

export default function StablePage() {
  const { data, ready, update } = useGame();
  const tier = ready ? stableInfo(data.trophies).tier : 1;

  return (
    <main className={`screen stable-bg tier-${tier}`}>
      <div className="topbar">
        <Link href="/" className="backbtn">◀ おうち</Link>
        <div className="coinbar small">
          <span className="icon">🥕</span>
          <span>{ready ? data.coins : "…"}</span>
        </div>
      </div>

      <h1 className="page-title">🏡 ぼくじょう</h1>

      {!ready ? (
        <p className="hint">よみこみちゅう…</p>
      ) : data.myHorse ? (
        <Manage data={data} update={update} />
      ) : (
        <Create data={data} update={update} />
      )}
    </main>
  );
}

// ════════════════════════════════════════════
// うまを むかえる（さいしょの 1とう を つくる）
// ════════════════════════════════════════════
function Create({
  data,
  update,
}: {
  data: ReturnType<typeof useGame>["data"];
  update: ReturnType<typeof useGame>["update"];
}) {
  const tier = stableInfo(data.trophies).tier;
  const [color, setColor] = useState(COAT_COLORS[0].color);
  const [style, setStyle] = useState<RunStyle>("senko");
  const [name, setName] = useState("");

  const create = () => {
    const horse = createHorse({ name, color, style });
    update((p) => ({ ...p, myHorse: horse }));
    sfx.levelUp();
  };

  return (
    <div className="card">
      <p className="subtitle">あいぼうの あいばを むかえよう！ 🐣</p>

      <div className="preview-horse"><HorseSVG color={color} size={150} /></div>

      <p className="field-label">① けいろ（からだの いろ）を えらぶ</p>
      <div className="coat-grid">
        {COAT_COLORS.map((c) => {
          const locked = tier < c.minTier;
          return (
            <button
              key={c.color}
              className={`coat-cell ${color === c.color ? "selected" : ""} ${locked ? "locked" : ""}`}
              disabled={locked}
              onClick={() => setColor(c.color)}
            >
              <span className="coat-swatch" style={{ background: c.color }} />
              <span className="coat-name">{locked ? "🔒" : c.name}</span>
            </button>
          );
        })}
      </div>

      <p className="field-label">② きゃくしつ（はしりかた）を えらぶ</p>
      <div className="style-grid">
        {STYLES.map((s) => (
          <button
            key={s}
            className={`style-card ${style === s ? "selected" : ""}`}
            onClick={() => setStyle(s)}
          >
            <span className="style-emoji">{STYLE_EMOJI[s]}</span>
            <span className="style-name">{STYLE_LABEL[s]}</span>
            <span className="style-desc">{STYLE_DESC[s]}</span>
          </button>
        ))}
      </div>

      <p className="field-label">③ なまえを つける</p>
      <input
        className="name-input"
        value={name}
        maxLength={8}
        placeholder="なまえを いれてね"
        onChange={(e) => setName(e.target.value)}
      />
      <div className="name-ideas">
        {NAME_IDEAS.map((n) => (
          <button key={n} className="name-chip" onClick={() => setName(n)}>{n}</button>
        ))}
      </div>

      <button className="gobtn" onClick={create}>このうまを むかえる！ 🎀</button>
    </div>
  );
}

// ════════════════════════════════════════════
// うまを そだてる（トレーニング）
// ════════════════════════════════════════════
function Manage({
  data,
  update,
}: {
  data: ReturnType<typeof useGame>["data"];
  update: ReturnType<typeof useGame>["update"];
}) {
  const h = data.myHorse!;
  const info = stableInfo(data.trophies);
  const [msg, setMsg] = useState<string>("");
  const [flash, setFlash] = useState<string>("");
  const [confirmReset, setConfirmReset] = useState(false);

  const doTrain = (menu: TrainingMenu) => {
    if (info.tier < menu.minTier) return;
    if (data.coins < menu.cost) {
      setMsg("コインが たりないよ。べんきょうで あつめよう！");
      return;
    }
    const res = trainHorse(h, menu.kind, Math.random, info.gainMul, info.expMul);
    update((p) => ({ ...p, coins: p.coins - menu.cost, myHorse: res.horse }));
    if (res.leveledTo !== null) {
      setMsg(`⭐ レベルアップ！ Lv.${res.leveledTo} になった！`);
      setFlash("levelup");
      sfx.levelUp();
    } else if (menu.kind === "all") {
      setMsg(`🏕️ がっしゅく！ ステータス ぜんぶで +${res.gain} のびた！ ✨`);
      setFlash("levelup");
      sfx.train();
    } else {
      setMsg(`${menu.label} が +${res.gain} のびた！ ✨`);
      setFlash("train");
      sfx.train();
    }
    setTimeout(() => setFlash(""), 600);
  };

  const doFeed = (food: FoodMenu) => {
    if (info.tier < food.minTier) return;
    if (data.coins < food.cost) {
      setMsg("コインが たりないよ。");
      return;
    }
    update((p) => ({ ...p, coins: p.coins - food.cost, myHorse: feedHorse(h, food) }));
    setMsg(`${food.emoji} ${food.label}！ げんき と なかよし度 アップ！`);
    sfx.feed();
  };

  const doRest = () => {
    update((p) => ({ ...p, myHorse: restHorse(h) }));
    setMsg("ぐっすり… つかれが とれた！ 😴");
    sfx.select();
  };

  // あいばを はじめから（リセット）。myHorse を けして、むかえる がめんに もどる。
  // コインや べんきょうの きろくは のこる。
  const doReset = () => {
    update((p) => ({ ...p, myHorse: null }));
    sfx.select();
  };

  // そうしょくを かえる
  const setDeco = (d: Deco) => {
    update((p) => ({ ...p, myHorse: p.myHorse ? { ...p.myHorse, deco: d } : p.myHorse }));
    sfx.select();
  };

  const expMax = expToNext(h.level);
  const stage = growthStage(h.level);
  const mood = horseMood(h);
  const portraitSize = stage === "foal" ? 70 : stage === "young" ? 84 : 96; // せいちょうで おおきく
  const hearts = Math.min(5, Math.max(1, Math.round(h.bond / 20)));

  return (
    <>
      <div className={`horse-card ${flash}`}>
        <div className="hc-top">
          <div className="hc-portrait" style={{ width: 100, justifyContent: "center", display: "flex" }}>
            <HorseSVG color={h.color} size={portraitSize} deco={h.deco} />
          </div>
          <div className="hc-id">
            <div className="hc-name">{h.name}</div>
            <div className="hc-meta">
              <span className="lv">Lv.{h.level}</span>
              <span className="style-pill">{STYLE_EMOJI[h.style]} {STYLE_LABEL[h.style]}</span>
              <span className="growth-pill">{GROWTH_LABEL[stage]}</span>
            </div>
            <div className="hc-mood">
              <span className="mood-face">{mood.face}</span>
              <span className="mood-label">{mood.label}</span>
              <span className="mood-hearts">{"♥".repeat(hearts)}<span className="heart-off">{"♥".repeat(5 - hearts)}</span></span>
            </div>
            <div className="hc-record">そうごうりょく {totalPower(h)}・{h.wins}しょう / {h.races}せん</div>
          </div>
        </div>

        {/* けいけんち */}
        <Bar label="けいけんち" value={(h.exp / expMax) * 100} text={`${h.exp}/${expMax}`} color="#9b7bff" />

        {/* ステータス */}
        <Bar label="⚡ すばやさ" value={statPct(h.speed)} text={`${Math.round(h.speed)}`} color="#ff7e6b" />
        <Bar label="🫁 スタミナ" value={statPct(h.stamina)} text={`${Math.round(h.stamina)}`} color="#4ea8ff" />
        <Bar label="🔥 こんじょう" value={statPct(h.guts)} text={`${Math.round(h.guts)}`} color="#ff9e2c" />

        {/* じょうたい */}
        <Bar label="😮‍💨 つかれ" value={h.fatigue} text={`${Math.round(h.fatigue)}`} color="#9aa0a6" warn={h.fatigue >= 70} />
        <Bar label="💞 なかよし" value={h.bond} text={`${Math.round(h.bond)}`} color="#ff7eb6" />
      </div>

      {/* うまやどランク（かつほど リッチに）*/}
      <div className={`stable-rank tier-${info.tier}`}>
        <div className="sr-top">
          <span className="sr-badge">うまやど {info.label}</span>
          <span className="sr-bonus">けいけんち ×{info.expMul} ・ せいちょう ×{info.gainMul}</span>
        </div>
        <p className="sr-hint">{NEXT_TIER_HINT[info.tier]}</p>
      </div>

      {msg && <p className={`train-msg ${flash}`}>{msg}</p>}
      {h.fatigue >= 70 && (
        <p className="hint warn">つかれすぎ！ ごはん か おやすみで かいふくしよう（トレーニングの ききめ ダウンちゅう）</p>
      )}

      <p className="field-label">💪 トレーニング</p>
      <div className="train-grid">
        {TRAININGS.map((m) => {
          const locked = info.tier < m.minTier;
          const poor = !locked && data.coins < m.cost;
          return (
            <button
              key={m.kind}
              className={`train-btn t-${m.kind} ${locked ? "locked" : ""}`}
              disabled={locked || poor}
              onClick={() => doTrain(m)}
            >
              {m.emoji}
              <span>{m.label}</span>
              <span className="t-cost">{locked ? `🔒 G${m.minTier === 3 ? "2" : ""}いじょう` : `${m.cost}🥕`}</span>
            </button>
          );
        })}
      </div>

      <p className="field-label">🍽️ ごはん（かつほど メニューが ふえる）</p>
      <div className="food-grid">
        {FOODS.map((f) => {
          const locked = info.tier < f.minTier;
          const poor = !locked && data.coins < f.cost;
          return (
            <button
              key={f.id}
              className={`food-btn ${locked ? "locked" : ""}`}
              disabled={locked || poor}
              onClick={() => doFeed(f)}
            >
              <span className="food-emoji">{f.emoji}</span>
              <span className="food-name">{f.label}</span>
              <span className="food-cost">{locked ? "🔒" : `${f.cost}🥕`}</span>
            </button>
          );
        })}
        <button className="food-btn rest" onClick={doRest}>
          <span className="food-emoji">😴</span>
          <span className="food-name">おやすみ</span>
          <span className="food-cost">むりょう</span>
        </button>
      </div>

      <p className="field-label">🎀 そうしょく（かつほど ふえる）</p>
      <div className="deco-row">
        {DECOS.map((d) => {
          const locked = info.tier < d.minTier;
          return (
            <button
              key={d.id}
              className={`deco-chip ${(h.deco ?? "none") === d.id ? "selected" : ""} ${locked ? "locked" : ""}`}
              disabled={locked}
              onClick={() => setDeco(d.id)}
            >
              {locked ? `🔒 ${d.label}` : d.label}
            </button>
          );
        })}
      </div>

      <Link href="/race" className="gobtn aslink">レースに しゅつそう！ 🏇</Link>
      <Link href="/study" className="minilink center">✏️ べんきょうして コインを あつめる</Link>

      {/* ── リセット（あいばを はじめから）── */}
      <div className="reset-zone">
        {!confirmReset ? (
          <button className="reset-link" onClick={() => setConfirmReset(true)}>
            🔄 うまを はじめから（リセット）
          </button>
        ) : (
          <div className="reset-confirm">
            <p className="reset-q">
              いまの あいば「{h.name}」と さよならして、<br />
              あたらしい うまを むかえる？
            </p>
            <p className="reset-note">※ にんじんコインや べんきょうの きろくは そのままです</p>
            <div className="reset-actions">
              <button className="reset-yes" onClick={doReset}>はい、リセットする</button>
              <button className="reset-no" onClick={() => setConfirmReset(false)}>やめる</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Bar({
  label,
  value,
  text,
  color,
  warn,
}: {
  label: string;
  value: number;
  text: string;
  color: string;
  warn?: boolean;
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-track">
        <span
          className={`stat-fill ${warn ? "warn" : ""}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        />
      </span>
      <span className="stat-val">{text}</span>
    </div>
  );
}
