// ゲームのデータとロジックを まとめたファイル。

import { WORDS, Word } from "./words";

// ── にんじんコイン（ゲーム内のおかね）の さいしょのもちぶん ──
export const STARTING_COINS = 30;
// もんだいに せいかいしたときの ごほうび
export const REWARD_PER_CORRECT = 5;

// ────────────────────────────────────────────
// べんきょう もんだいの せいせい
//   ひらがな・カタカナ … え(emoji)を みて ただしい よみを 3つから えらぶ
//   たしざん・ひきざん … しきを みて こたえを 3つから えらぶ
// ────────────────────────────────────────────
export type QuizKind = "hiragana" | "katakana" | "add" | "sub" | "shape" | "count" | "color";

export type Quiz = {
  kind: QuizKind;
  // emoji=え / expr=しき / shape=ずけい / count=かぞえる / color=いろ
  display: "emoji" | "expr" | "shape" | "count" | "color";
  prompt: string; // え・しき・ずけいID・ならんだ emoji・いろコード
  question: string; // といかけの ラベル
  answer: string;
  choices: string[]; // シャッフルずみ（3つ）
};

// ── ずけい（図形）──
export const SHAPES: { id: string; name: string }[] = [
  { id: "circle", name: "まる" },
  { id: "triangle", name: "さんかく" },
  { id: "square", name: "しかく" },
  { id: "star", name: "ほし" },
  { id: "heart", name: "ハート" },
  { id: "diamond", name: "ひしがた" },
  { id: "oval", name: "だえん" },
  { id: "rect", name: "ながしかく" },
];

// ── いろ ──
export const COLORS: { name: string; hex: string }[] = [
  { name: "あか", hex: "#e0573f" },
  { name: "あお", hex: "#4a76d6" },
  { name: "きいろ", hex: "#f1c232" },
  { name: "みどり", hex: "#4caf72" },
  { name: "ピンク", hex: "#ef7fa6" },
  { name: "むらさき", hex: "#9b6fc0" },
  { name: "オレンジ", hex: "#e8822e" },
  { name: "ちゃいろ", hex: "#8a5a2b" },
];

// かぞえる もんだいの え
const COUNT_EMOJIS = ["🍎", "⭐", "🐤", "🍓", "🌸", "🐶", "🚗", "⚽"];

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

// ひらがな → カタカナ へんかん
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function kanaQuiz(kata: boolean): Quiz {
  const word = pickRandom(WORDS);
  const read = (w: Word) => (kata ? toKatakana(w.hiragana) : w.hiragana);
  const answer = read(word);
  const distractors: string[] = [];
  const pool = WORDS.filter((w) => w.hiragana !== word.hiragana);
  while (distractors.length < 2) {
    const cand = read(pickRandom(pool));
    if (cand !== answer && !distractors.includes(cand)) distractors.push(cand);
  }
  return {
    kind: kata ? "katakana" : "hiragana",
    display: "emoji",
    prompt: word.emoji,
    question: kata ? "カタカナで どれ？" : "これは なに？",
    answer,
    choices: shuffle([answer, ...distractors]),
  };
}

function mathQuiz(sub: boolean): Quiz {
  let a: number;
  let b: number;
  let ans: number;
  if (sub) {
    a = 2 + Math.floor(Math.random() * 11); // 2..12
    b = 1 + Math.floor(Math.random() * a); // 1..a（こたえが マイナスに ならない）
    ans = a - b;
  } else {
    a = 1 + Math.floor(Math.random() * 9); // 1..9
    b = 1 + Math.floor(Math.random() * 9); // 1..9
    ans = a + b;
  }

  const choiceSet = new Set<number>([ans]);
  while (choiceSet.size < 3) {
    const delta = Math.floor(Math.random() * 7) - 3; // -3..+3
    const cand = ans + delta;
    if (cand >= 0 && cand !== ans) choiceSet.add(cand);
  }

  return {
    kind: sub ? "sub" : "add",
    display: "expr",
    prompt: `${a} ${sub ? "−" : "＋"} ${b}`,
    question: "こたえは なに？",
    answer: String(ans),
    choices: shuffle([...choiceSet].map(String)),
  };
}

// ずけい：かたちを みて なまえを 3つから えらぶ
function shapeQuiz(): Quiz {
  const sh = pickRandom(SHAPES);
  const distractors: string[] = [];
  const pool = SHAPES.filter((s) => s.id !== sh.id);
  while (distractors.length < 2) {
    const cand = pickRandom(pool).name;
    if (!distractors.includes(cand)) distractors.push(cand);
  }
  return {
    kind: "shape",
    display: "shape",
    prompt: sh.id,
    question: "これは どんな かたち？",
    answer: sh.name,
    choices: shuffle([sh.name, ...distractors]),
  };
}

// かぞえる：ならんだ えの かずを 3つから えらぶ
function countQuiz(): Quiz {
  const emoji = pickRandom(COUNT_EMOJIS);
  const n = 1 + Math.floor(Math.random() * 9); // 1..9
  const choiceSet = new Set<number>([n]);
  while (choiceSet.size < 3) {
    const cand = Math.max(1, n + (Math.floor(Math.random() * 5) - 2));
    if (cand !== n) choiceSet.add(cand);
  }
  return {
    kind: "count",
    display: "count",
    prompt: emoji.repeat(n),
    question: "いくつ あるかな？",
    answer: String(n),
    choices: shuffle([...choiceSet].map(String)),
  };
}

// いろ：いろを みて なまえを 3つから えらぶ
function colorQuiz(): Quiz {
  const c = pickRandom(COLORS);
  const distractors: string[] = [];
  const pool = COLORS.filter((x) => x.name !== c.name);
  while (distractors.length < 2) {
    const cand = pickRandom(pool).name;
    if (!distractors.includes(cand)) distractors.push(cand);
  }
  return {
    kind: "color",
    display: "color",
    prompt: c.hex,
    question: "なに いろ？",
    answer: c.name,
    choices: shuffle([c.name, ...distractors]),
  };
}

export function makeQuiz(kind: QuizKind): Quiz {
  switch (kind) {
    case "hiragana":
      return kanaQuiz(false);
    case "katakana":
      return kanaQuiz(true);
    case "add":
      return mathQuiz(false);
    case "sub":
      return mathQuiz(true);
    case "shape":
      return shapeQuiz();
    case "count":
      return countQuiz();
    case "color":
      return colorQuiz();
  }
}

// カテゴリの ラベル（UI よう）
export const QUIZ_KINDS: { kind: QuizKind; label: string }[] = [
  { kind: "hiragana", label: "ひらがな" },
  { kind: "katakana", label: "カタカナ" },
  { kind: "add", label: "たしざん" },
  { kind: "sub", label: "ひきざん" },
  { kind: "shape", label: "ずけい" },
  { kind: "count", label: "かぞえる" },
  { kind: "color", label: "いろ" },
];

// ────────────────────────────────────────────
// おうまレース で かけられる コインの せんたくし。
// うまの データ／レースロジックは lib/race.ts に わけている。
// ────────────────────────────────────────────
export const BET_OPTIONS = [5, 10, 20];
