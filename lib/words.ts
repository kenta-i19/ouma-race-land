// ひらがな学習につかう ことばデータ。
// emoji（え）と よみがな（ひらがな）の ペア。
// 4さい〜小学生むけ。みぢかで わかりやすい ことばを えらんでいる。

export type Word = {
  emoji: string;
  hiragana: string;
};

export const WORDS: Word[] = [
  { emoji: "🍎", hiragana: "りんご" },
  { emoji: "🐶", hiragana: "いぬ" },
  { emoji: "🐱", hiragana: "ねこ" },
  { emoji: "🐴", hiragana: "うま" },
  { emoji: "🐰", hiragana: "うさぎ" },
  { emoji: "🐘", hiragana: "ぞう" },
  { emoji: "🦁", hiragana: "らいおん" },
  { emoji: "🐸", hiragana: "かえる" },
  { emoji: "🐟", hiragana: "さかな" },
  { emoji: "🐤", hiragana: "ひよこ" },
  { emoji: "🍌", hiragana: "ばなな" },
  { emoji: "🍓", hiragana: "いちご" },
  { emoji: "🍇", hiragana: "ぶどう" },
  { emoji: "🍉", hiragana: "すいか" },
  { emoji: "🍅", hiragana: "とまと" },
  { emoji: "🥕", hiragana: "にんじん" },
  { emoji: "🌽", hiragana: "とうもろこし" },
  { emoji: "🚗", hiragana: "くるま" },
  { emoji: "🚌", hiragana: "ばす" },
  { emoji: "✈️", hiragana: "ひこうき" },
  { emoji: "🚀", hiragana: "ろけっと" },
  { emoji: "🌸", hiragana: "はな" },
  { emoji: "🌳", hiragana: "き" },
  { emoji: "☀️", hiragana: "たいよう" },
  { emoji: "🌙", hiragana: "つき" },
  { emoji: "⭐", hiragana: "ほし" },
  { emoji: "☂️", hiragana: "かさ" },
  { emoji: "👒", hiragana: "ぼうし" },
  { emoji: "👟", hiragana: "くつ" },
  { emoji: "🎂", hiragana: "けーき" },
  { emoji: "🍙", hiragana: "おにぎり" },
  { emoji: "🍦", hiragana: "あいす" },
  { emoji: "🦋", hiragana: "ちょうちょ" },
  { emoji: "🐞", hiragana: "てんとうむし" },
  { emoji: "🐢", hiragana: "かめ" },
  { emoji: "🐧", hiragana: "ぺんぎん" },
];
