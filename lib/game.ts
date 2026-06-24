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
export type QuizKind = "hiragana" | "katakana" | "add" | "sub";

export type Quiz = {
  kind: QuizKind;
  display: "emoji" | "expr"; // おおきく だすのが え か しき か
  prompt: string; // emoji もしくは "3 ＋ 2"
  question: string; // といかけの ラベル
  answer: string;
  choices: string[]; // シャッフルずみ（3つ）
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
  }
}

// カテゴリの ラベル（UI よう）
export const QUIZ_KINDS: { kind: QuizKind; label: string }[] = [
  { kind: "hiragana", label: "ひらがな" },
  { kind: "katakana", label: "カタカナ" },
  { kind: "add", label: "たしざん" },
  { kind: "sub", label: "ひきざん" },
];

// ────────────────────────────────────────────
// おうまレース で かけられる コインの せんたくし。
// うまの データ／レースロジックは lib/race.ts に わけている。
// ────────────────────────────────────────────
export const BET_OPTIONS = [5, 10, 20];
