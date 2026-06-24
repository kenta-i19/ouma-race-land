"use client";

// にんじんコインの ざんだか と せいせきを ブラウザ（localStorage）に ほぞんする。
// アカウントとうろく なしで、おなじ たんまつなら つづきから あそべる。

import { useCallback, useEffect, useState } from "react";
import { STARTING_COINS } from "./game";
import { PlayerHorse } from "./horse";

const KEY = "ouma-race-land:v1";

export type Trophies = { g3: number; g2: number; g1: number };
export type StudyKindCount = { hiragana: number; katakana: number; add: number; sub: number };

export type SaveData = {
  coins: number;
  studyCorrect: number; // せいかいした もんだいかず
  racesWon: number; // かったレースのかず
  racesPlayed: number; // あそんだレースのかず
  myHorse: PlayerHorse | null; // じぶんで そだてる あいば（いなければ null）
  lastBonusDate: string | null; // さいごに デイリーボーナスを うけとった ひ（YYYY-MM-DD）
  loginStreak: number; // れんぞく ログインにっすう
  trophies: Trophies; // ランクべつ ゆうしょうかいすう
  studyKind: StudyKindCount; // きょうかべつ せいかいすう（シールちょう よう）
};

const DEFAULT_DATA: SaveData = {
  coins: STARTING_COINS,
  studyCorrect: 0,
  racesWon: 0,
  racesPlayed: 0,
  myHorse: null,
  lastBonusDate: null,
  loginStreak: 0,
  trophies: { g3: 0, g2: 0, g1: 0 },
  studyKind: { hiragana: 0, katakana: 0, add: 0, sub: 0 },
};

function load(): SaveData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return DEFAULT_DATA;
  }
}

function save(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ほぞんに しっぱいしても ゲームは つづけられる
  }
}

// ゲームぜんたいで つかう セーブデータの フック。
export function useGame() {
  const [data, setData] = useState<SaveData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);

  // さいしょの えがきだしのあとで localStorage から よみこむ（SSRとの くいちがいを ふせぐ）
  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  const update = useCallback((updater: (prev: SaveData) => SaveData) => {
    setData((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const addCoins = useCallback(
    (amount: number) => update((p) => ({ ...p, coins: Math.max(0, p.coins + amount) })),
    [update]
  );

  const reset = useCallback(() => update(() => ({ ...DEFAULT_DATA })), [update]);

  return { data, ready, update, addCoins, reset };
}
