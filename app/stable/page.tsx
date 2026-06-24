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
  TRAIN_COST,
  FEED_COST,
  TRAIN_LABEL,
  TrainKind,
  createHorse,
  trainHorse,
  feedHorse,
  restHorse,
  expToNext,
  statPct,
  totalPower,
} from "@/lib/horse";
import { RunStyle, STYLE_LABEL, STYLE_DESC, STYLE_EMOJI } from "@/lib/race";
import { sfx } from "@/lib/audio";

const STYLES: RunStyle[] = ["nige", "senko", "sashi", "oikomi"];

export default function StablePage() {
  const { data, ready, update } = useGame();

  return (
    <main className="screen">
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
        <Create update={update} />
      )}
    </main>
  );
}

// ════════════════════════════════════════════
// うまを むかえる（さいしょの 1とう を つくる）
// ════════════════════════════════════════════
function Create({ update }: { update: ReturnType<typeof useGame>["update"] }) {
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
        {COAT_COLORS.map((c) => (
          <button
            key={c.color}
            className={`coat-cell ${color === c.color ? "selected" : ""}`}
            onClick={() => setColor(c.color)}
          >
            <span className="coat-swatch" style={{ background: c.color }} />
            <span className="coat-name">{c.name}</span>
          </button>
        ))}
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
  const [msg, setMsg] = useState<string>("");
  const [flash, setFlash] = useState<string>("");
  const [confirmReset, setConfirmReset] = useState(false);

  const doTrain = (kind: TrainKind) => {
    if (data.coins < TRAIN_COST) {
      setMsg("コインが たりないよ。べんきょうで あつめよう！");
      return;
    }
    const res = trainHorse(h, kind, Math.random);
    update((p) => ({ ...p, coins: p.coins - TRAIN_COST, myHorse: res.horse }));
    if (res.leveledTo !== null) {
      setMsg(`⭐ レベルアップ！ Lv.${res.leveledTo} になった！`);
      setFlash("levelup");
      sfx.levelUp();
    } else {
      setMsg(`${TRAIN_LABEL[kind]} が +${res.gain} のびた！ ✨`);
      setFlash("train");
      sfx.train();
    }
    setTimeout(() => setFlash(""), 600);
  };

  const doFeed = () => {
    if (data.coins < FEED_COST) {
      setMsg("コインが たりないよ。");
      return;
    }
    update((p) => ({ ...p, coins: p.coins - FEED_COST, myHorse: feedHorse(h) }));
    setMsg("もぐもぐ… げんき と なかよし度 アップ！ 🥕");
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

  return (
    <>
      <div className={`horse-card ${flash}`}>
        <div className="hc-top">
          <div className="hc-portrait"><HorseSVG color={h.color} size={88} deco={h.deco} /></div>
          <div className="hc-id">
            <div className="hc-name">{h.name}</div>
            <div className="hc-meta">
              <span className="lv">Lv.{h.level}</span>
              <span className="style-pill">{STYLE_EMOJI[h.style]} {STYLE_LABEL[h.style]}</span>
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

      {msg && <p className={`train-msg ${flash}`}>{msg}</p>}
      {h.fatigue >= 70 && (
        <p className="hint warn">つかれすぎ！ ごはん か おやすみで かいふくしよう（トレーニングの ききめ ダウンちゅう）</p>
      )}

      <p className="field-label">💪 トレーニング（{TRAIN_COST}🥕）</p>
      <div className="train-grid">
        <button className="train-btn speed" disabled={data.coins < TRAIN_COST} onClick={() => doTrain("speed")}>
          ⚡<span>すばやさ</span>
        </button>
        <button className="train-btn stam" disabled={data.coins < TRAIN_COST} onClick={() => doTrain("stamina")}>
          🫁<span>スタミナ</span>
        </button>
        <button className="train-btn guts" disabled={data.coins < TRAIN_COST} onClick={() => doTrain("guts")}>
          🔥<span>こんじょう</span>
        </button>
      </div>

      <div className="care-row">
        <button className="care-btn feed" disabled={data.coins < FEED_COST} onClick={doFeed}>
          🥕 ごはん<span>{FEED_COST}🥕</span>
        </button>
        <button className="care-btn rest" onClick={doRest}>
          😴 おやすみ<span>むりょう</span>
        </button>
      </div>

      <p className="field-label">🎀 そうしょく（メンコ など）</p>
      <div className="deco-row">
        {DECOS.map((d) => (
          <button
            key={d.id}
            className={`deco-chip ${(h.deco ?? "none") === d.id ? "selected" : ""}`}
            onClick={() => setDeco(d.id)}
          >
            {d.label}
          </button>
        ))}
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
