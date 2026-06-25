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

// うまに つける そうしょく（メンコ など）
export type Deco = "none" | "menko" | "ribbon" | "cap" | "flower";

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
  deco?: Deco; // そうしょく（メンコ・リボン など）
};

// そうしょくの せんたくし
export const DECOS: { id: Deco; label: string }[] = [
  { id: "none", label: "なし" },
  { id: "menko", label: "メンコ" },
  { id: "ribbon", label: "リボン" },
  { id: "cap", label: "ぼうし" },
  { id: "flower", label: "おはな" },
];

// うまの けいろ（コート）。えらぶと SVGの うまの いろが かわる。
export const COAT_COLORS: { name: string; color: string }[] = [
  { name: "かげ", color: "#7a4a2b" }, // 鹿毛
  { name: "くりげ", color: "#b5652f" }, // 栗毛
  { name: "あおげ", color: "#3c3530" }, // 青毛
  { name: "あしげ", color: "#cfc8bb" }, // 芦毛
  { name: "つきげ", color: "#d6a64e" }, // 月毛
  { name: "かわらげ", color: "#a98c63" }, // 河原毛
];

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
export function createHorse(opts: { name: string; color: string; style: RunStyle }): PlayerHorse {
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
    emoji: "🐎",
    color: opts.color,
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
    deco: "none",
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

export type TrainKind = "speed" | "stamina" | "guts" | "all";

export const TRAIN_LABEL: Record<TrainKind, string> = {
  speed: "すばやさ",
  stamina: "スタミナ",
  guts: "こんじょう",
  all: "がっしゅく",
};

// ── うまやどランク（じゅうしょうトロフィーで しょうかく）──
// かてば かつほど、けいけんち・トレーニングこうか UP、できる ことが ふえる。
export type StableInfo = {
  tier: number;
  label: string;
  expMul: number; // トレーニングで もらえる けいけんち ばいりつ
  gainMul: number; // ステータスの のび ばいりつ
};

export function stableInfo(t: { g1: number; g2: number; g3: number }): StableInfo {
  if (t.g1 >= 1) return { tier: 4, label: "チャンピオン", expMul: 2, gainMul: 1.5 };
  const pts = t.g2 * 2 + t.g3;
  if (pts >= 4) return { tier: 3, label: "オープン", expMul: 1.5, gainMul: 1.3 };
  if (pts >= 1) return { tier: 2, label: "じゅうしょう", expMul: 1.2, gainMul: 1.15 };
  return { tier: 1, label: "ビギナー", expMul: 1, gainMul: 1 };
}

// つぎの ランクの かいきん じょうけん（UIの ヒントよう）
export const NEXT_TIER_HINT: Record<number, string> = {
  1: "G3レースに かつと「じゅうしょう」に しょうかく！",
  2: "G2に かつ（or G3を いくつか）で「オープン」に！",
  3: "G1レースを せいはして「チャンピオン」に！",
  4: "さいこうランク！ ぜんG1せいはを めざそう 👑",
};

// ── トレーニングメニュー（minTier で かいきん）──
export type TrainingMenu = { kind: TrainKind; label: string; emoji: string; cost: number; minTier: number };
export const TRAININGS: TrainingMenu[] = [
  { kind: "speed", label: "すばやさ", emoji: "⚡", cost: 10, minTier: 1 },
  { kind: "stamina", label: "スタミナ", emoji: "🫁", cost: 10, minTier: 1 },
  { kind: "guts", label: "こんじょう", emoji: "🔥", cost: 10, minTier: 1 },
  { kind: "all", label: "がっしゅく", emoji: "🏕️", cost: 28, minTier: 3 },
];

// ── ごはんメニュー（minTier で かいきん。かつほど ごうかに）──
export type FoodMenu = { id: string; label: string; emoji: string; cost: number; minTier: number; fatigue: number; bond: number };
export const FOODS: FoodMenu[] = [
  { id: "carrot", label: "にんじん", emoji: "🥕", cost: 6, minTier: 1, fatigue: 34, bond: 8 },
  { id: "apple", label: "りんご", emoji: "🍎", cost: 10, minTier: 2, fatigue: 55, bond: 6 },
  { id: "cake", label: "にんじんケーキ", emoji: "🍰", cost: 18, minTier: 3, fatigue: 72, bond: 14 },
  { id: "dinner", label: "ごうかディナー", emoji: "🍽️", cost: 30, minTier: 4, fatigue: 100, bond: 20 },
];

export type TrainResult = {
  horse: PlayerHorse;
  gain: number; // のびた ぶん（がっしゅくは ごうけい）
  leveledTo: number | null;
};

// トレーニングする。つかれていると ききめが おちる。なかよし＆うまやどランクで よく のびる。
export function trainHorse(
  h: PlayerHorse,
  kind: TrainKind,
  rnd: () => number,
  gainMul = 1,
  expMul = 1
): TrainResult {
  const fatigueFactor = h.fatigue >= 80 ? 0.35 : h.fatigue >= 50 ? 0.7 : 1;
  const bondFactor = 1 + h.bond / 250; // さいだい +40%
  const next: PlayerHorse = { ...h };
  let gain: number;
  let expBase: number;

  if (kind === "all") {
    // がっしゅく：3ステータスを まとめて すこしずつ＋おおきな けいけんち
    const each = () => round1((0.7 + rnd() * 0.9) * fatigueFactor * bondFactor * gainMul);
    const gs = each();
    const gt = each();
    const gg = each();
    next.speed = round1(next.speed + gs);
    next.stamina = round1(next.stamina + gt);
    next.guts = round1(next.guts + gg);
    next.fatigue = Math.min(100, next.fatigue + 26);
    gain = round1(gs + gt + gg);
    expBase = 16 * fatigueFactor + gain * 4;
  } else {
    gain = round1((1.2 + rnd() * 1.5) * fatigueFactor * bondFactor * gainMul);
    next[kind] = round1(next[kind] + gain);
    next.fatigue = Math.min(100, next.fatigue + 16);
    expBase = 8 * fatigueFactor + gain * 4;
  }

  next.bond = Math.min(100, next.bond + 1);
  const leveledTo = gainExp(next, Math.round(expBase * expMul));
  return { horse: next, gain, leveledTo };
}

// ごはんを あげる：つかれ ダウン＋なかよし UP（フードで こうか・コストが ちがう）
export function feedHorse(h: PlayerHorse, food: FoodMenu): PlayerHorse {
  return {
    ...h,
    fatigue: Math.max(0, h.fatigue - food.fatigue),
    bond: Math.min(100, h.bond + food.bond),
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

// レースの けっかを あいばに はんえいする（placing は 1ばんから、expMul は ランクばいりつ）。
export function applyRaceResult(h: PlayerHorse, placing: number, fieldSize: number, expMul = 1): RaceReward {
  const next: PlayerHorse = { ...h };
  next.races += 1;
  if (placing === 1) next.wins += 1;
  next.fatigue = Math.min(100, next.fatigue + 22);
  next.bond = Math.min(100, next.bond + (placing === 1 ? 6 : 3));
  const expGain = Math.round(Math.max(8, (fieldSize - placing + 1) * 12) * expMul);
  const leveledTo = gainExp(next, expGain);
  return { horse: next, expGain, leveledTo };
}

// ── せいちょうだんかい（レベルで みためが かわる）──
export type Growth = "foal" | "young" | "adult";
export function growthStage(level: number): Growth {
  if (level <= 3) return "foal"; // こうま
  if (level <= 7) return "young"; // せいちょうき
  return "adult"; // おとな
}
export const GROWTH_LABEL: Record<Growth, string> = {
  foal: "こうま",
  young: "せいちょうき",
  adult: "おとな",
};

// ── ごきげん（つかれ・なかよし から）──
export type Mood = { face: string; label: string };
export function horseMood(h: PlayerHorse): Mood {
  if (h.fatigue >= 75) return { face: "😵", label: "ぐったり…" };
  if (h.fatigue >= 50) return { face: "😮‍💨", label: "ちょっと つかれた" };
  if (h.bond >= 70) return { face: "😆", label: "ごきげん！" };
  if (h.bond >= 40) return { face: "😊", label: "げんき！" };
  return { face: "🙂", label: "ふつう" };
}

// あいばの そうごうりょく（みための めやす）
export function totalPower(h: PlayerHorse): number {
  return Math.round(h.speed + h.stamina + h.guts);
}
