// ゲームのデータとロジックを まとめたファイル。

import { WORDS, Word } from "./words";

// ── にんじんコイン（ゲーム内のおかね）の さいしょのもちぶん ──
export const STARTING_COINS = 30;
// もんだいに せいかいしたときの ごほうび
export const REWARD_PER_CORRECT = 5;

// ────────────────────────────────────────────
// ひらがな もんだいの せいせい
// え（emoji）を みせて、ただしい よみがなを 3つのなかから えらぶ。
// ────────────────────────────────────────────
export type HiraganaQuiz = {
  word: Word;
  choices: string[]; // シャッフルずみの せんたくし（ひらがな）
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeHiraganaQuiz(): HiraganaQuiz {
  const word = pickRandom(WORDS);
  const distractors: string[] = [];
  const pool = WORDS.filter((w) => w.hiragana !== word.hiragana);
  while (distractors.length < 2) {
    const cand = pickRandom(pool).hiragana;
    if (!distractors.includes(cand)) distractors.push(cand);
  }
  const choices = shuffle([word.hiragana, ...distractors]);
  return { word, choices };
}

// ────────────────────────────────────────────
// おうまレース の データ
// strength（つよさ）が おおきいほど かちやすい。
// odds（ばいりつ）は あてたときに もらえる ばいすう。
// ────────────────────────────────────────────
export type Horse = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  strength: number; // かちやすさ（おおきいほど ゆうり）
  odds: number; // あてたら かけたコイン × このばいすう
};

export const HORSES: Horse[] = [
  { id: 1, name: "ちゃちゃまる", emoji: "🐎", color: "#a87142", strength: 5, odds: 2 },
  { id: 2, name: "しろたん", emoji: "🐴", color: "#e8e2d4", strength: 4, odds: 3 },
  { id: 3, name: "くろっこ", emoji: "🏇", color: "#5a4a42", strength: 3, odds: 4 },
  { id: 4, name: "きいろん", emoji: "🦄", color: "#f2c14e", strength: 2, odds: 6 },
  { id: 5, name: "ぶちこ", emoji: "🫏", color: "#c98bb9", strength: 1, odds: 9 },
];

// かけられる コインの せんたくし
export const BET_OPTIONS = [5, 10, 20];

// 1ティックごとに、それぞれのうまが どれだけすすむか を けいさんする。
// strength が おおきいほど へいきんてきに はやいが、ランダムさで まさかの ぎゃくてんも おこる。
export function stepHorse(horse: Horse): number {
  const base = 1.5 + horse.strength * 0.25; // つよさで ベースそくど が きまる
  const jitter = Math.random() * 3.2; // まいかい おおきく ぶれる（＝レースが ドキドキ）
  return base + jitter;
}
