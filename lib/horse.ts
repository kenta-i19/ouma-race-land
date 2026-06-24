// ────────────────────────────────────────────
// 「じぶんの あいば」を そだてる RPGパート の ロジック。
//
//   ・トレーニング … にんじんコインを つかって すばやさ／スタミナ／こんじょう を のばす
//   ・ごはん（にんじん）… つかれを とって なかよし度 UP
//   ・おやすみ … つかれを たっぷり とる
//   ・けいけんち が たまると レベルアップ（ぜんステータス すこし UP）
//   ・つかれ が たまると トレーニングの ききめ ダウン → やすませる たいせつさ
// ────────────────────────────────────────────

import { RunStyle } from "./race";

export type PlayerHorse = {
  name: string;
  emoji: string;
  color: string;
  speed: number; // すばやさ
  stamina: number; // スタミナ
  guts: number; // こんじょう
  style: RunStyle;
  level: number;
  exp: number; // つぎの レベルまでの けいけんち
  fatigue: number; // つかれ 0..100
  bond: number; // なかよし度 0..100
  wins: number; // ゆうしょうかいすう
  races: number; // しゅつそうかいすう
};

// うまの みために えらべる えもじ
export const HORSE_EMOJIS = ["🐴", "🐎", "🦄", "🏇", "🫏", "🦓"];

// なまえの こうほ（タップで えらべる。じぶんで にゅうりょくも OK）
export const NAME_IDEAS = [
  "カゼマル", "ニンジン", "ホシゾラ", "ハヤテ", "クッキー",
  "サクラ", "イナズマ", "モフモフ", "チャンピオ", "ダイヤ",
];

const STAT_MAX = 30; // バーひょうじの さいだいめやす

export function statPct(v: number): number {
  return Math.min(100, Math.round((v / STAT_MAX) * 100));
}

// つぎの レベルまでに ひつような けいけんち
export function expToNext(level: number): number {
  return 50 + level * 30;
}

// あたらしい あいばを つくる。きゃくしつで しょきステータスが かわる。
export function createHorse(opts: { name: string; emoji: string; style: RunStyle }): PlayerHorse {
  const s = { speed: 9, stamina: 9, guts: 9 };
  switch (opts.style) {
    case "nige":
      s.speed += 3; s.guts += 1; break;
    case "senko":
      s.speed += 2; s.stamina += 2; break;
    case "sashi":
      s.stamina += 3; s.speed += 1; break;
    case "oikomi":
      s.guts += 3; s.stamina += 1; break;
  }
  return {
    name: opts.name.trim() || "あいば",
    emoji: opts.emoji,
    color: "#c98b5e",
    speed: s.speed,
    stamina: s.stamina,
    guts: s.guts,
    style: opts.style,
    level: 1,
    exp: 0,
    fatigue: 0,
    bond: 30,
    wins: 0,
    races: 0,
  };
}

// けいけんちを くわえ、レベルアップしたら そのレベルを かえす（しなければ null）。
// h を じかに かきかえる（よびだしがわで コピーしてから わたす）。
function gainExp(h: PlayerHorse, amount: number): number | null {
  h.exp += amount;
  let leveledTo: number | null = null;
  while (h.exp >= expToNext(h.level)) {
    h.exp -= expToNext(h.level);
    h.level += 1;
    h.speed = round1(h.speed + 0.4);
    h.stamina = round1(h.stamina + 0.4);
    h.guts = round1(h.guts + 0.4);
    h.bond = Math.min(100, h.bond + 3);
    leveledTo = h.level;
  }
  return leveledTo;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export type TrainKind = "speed" | "stamina" | "guts";

export const TRAIN_COST = 10; // トレーニング 1かいの コイン
export const FEED_COST = 6; // ごはん 1かいの コイン

export const TRAIN_LABEL: Record<TrainKind, string> = {
  speed: "すばやさ",
  stamina: "スタミナ",
  guts: "こんじょう",
};

export type TrainResult = {
  horse: PlayerHorse;
  gain: number; // のびた ぶん
  leveledTo: number | null;
};

// トレーニングする。つかれていると ききめが おちる。なかよしだと よく のびる。
export function trainHorse(h: PlayerHorse, kind: TrainKind, rnd: () => number): TrainResult {
  const fatigueFactor = h.fatigue >= 80 ? 0.35 : h.fatigue >= 50 ? 0.7 : 1;
  const bondFactor = 1 + h.bond / 250; // さいだい +40%
  let gain = (1.2 + rnd() * 1.5) * fatigueFactor * bondFactor;
  gain = round1(gain);

  const next: PlayerHorse = { ...h };
  next[kind] = round1(next[kind] + gain);
  next.fatigue = Math.min(100, next.fatigue + 16);
  next.bond = Math.min(100, next.bond + 1);
  const leveledTo = gainExp(next, Math.round(8 * fatigueFactor + gain * 4));
  return { horse: next, gain, leveledTo };
}

// ごはん（にんじん）を あげる：つかれ ダウン＋なかよし UP
export function feedHorse(h: PlayerHorse): PlayerHorse {
  return {
    ...h,
    fatigue: Math.max(0, h.fatigue - 34),
    bond: Math.min(100, h.bond + 8),
  };
}

// おやすみ：つかれを たっぷり とる（むりょう）
export function restHorse(h: PlayerHorse): PlayerHorse {
  return { ...h, fatigue: Math.max(0, h.fatigue - 55) };
}

export type RaceReward = {
  horse: PlayerHorse;
  expGain: number;
  leveledTo: number | null;
};

// レースの けっかを あいばに はんえいする（placing は 1ばんから）。
export function applyRaceResult(h: PlayerHorse, placing: number, fieldSize: number): RaceReward {
  const next: PlayerHorse = { ...h };
  next.races += 1;
  if (placing === 1) next.wins += 1;
  next.fatigue = Math.min(100, next.fatigue + 22);
  next.bond = Math.min(100, next.bond + (placing === 1 ? 6 : 3));
  const expGain = Math.max(8, (fieldSize - placing + 1) * 12);
  const leveledTo = gainExp(next, expGain);
  return { horse: next, expGain, leveledTo };
}

// あいばの そうごうりょく（みための めやす）
export function totalPower(h: PlayerHorse): number {
  return Math.round(h.speed + h.stamina + h.guts);
}
