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
// おうまレース で かけられる コインの せんたくし。
// うまの データ／レースロジックは lib/race.ts に わけている。
// ────────────────────────────────────────────
export const BET_OPTIONS = [5, 10, 20];
