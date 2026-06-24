// ────────────────────────────────────────────
// おうまレース の シミュレーションエンジン。
//
// ただ ランダムに すすむ だけでなく、
//   ・きゃくしつ（にげ／せんこう／さし／おいこみ）
//   ・スタミナ（さいごまで もつか）
//   ・こんじょう（ゴールまえの ねばり）
// で じゅんいが いれかわる、ほんかくてきな レースを つくる。
// けっかは フレーム（こま）の はいれつとして かえし、
// がめんがわは それを じゅんばんに さいせいするだけ。
// ────────────────────────────────────────────

import { PlayerHorse } from "./horse";

export type RunStyle = "nige" | "senko" | "sashi" | "oikomi";

export const STYLE_LABEL: Record<RunStyle, string> = {
  nige: "にげ",
  senko: "せんこう",
  sashi: "さし",
  oikomi: "おいこみ",
};

export const STYLE_DESC: Record<RunStyle, string> = {
  nige: "さいしょから とばす せんとうタイプ",
  senko: "まえめで あんてい。バランスがた",
  sashi: "ちゅうばんから グッと のびる",
  oikomi: "さいごに ばくはつ！ こんじょうがた",
};

export const STYLE_EMOJI: Record<RunStyle, string> = {
  nige: "💨",
  senko: "🎯",
  sashi: "📈",
  oikomi: "🔥",
};

export type Racer = {
  key: string;
  name: string;
  emoji: string;
  color: string;
  speed: number;
  stamina: number;
  guts: number;
  style: RunStyle;
  isPlayer: boolean;
};

// ── ライバルうま（CPU）。それぞれ きゃくしつ と とくせいが ちがう ──
// つよさに はばを もたせる（よわい→つよい）。さいしょは まんなかくらいを めざせる。
const RIVAL_BASE: Omit<Racer, "isPlayer">[] = [
  { key: "r1", name: "ちゃちゃまる", emoji: "🐎", color: "#a87142", speed: 11, stamina: 10, guts: 8, style: "senko" }, // よわめ
  { key: "r2", name: "しろたん", emoji: "🐴", color: "#d9cdb4", speed: 13, stamina: 14, guts: 9, style: "sashi" }, // つよめ
  { key: "r3", name: "くろっこ", emoji: "🏇", color: "#5a4a42", speed: 14, stamina: 9, guts: 10, style: "nige" },
  { key: "r4", name: "きいろん", emoji: "🦄", color: "#f2c14e", speed: 9, stamina: 11, guts: 15, style: "oikomi" },
  { key: "r5", name: "ぶちこ", emoji: "🫏", color: "#c98bb9", speed: 12, stamina: 12, guts: 11, style: "senko" },
];

export const DISTANCE = 1000; // コースの ながさ（m）

// ── ちからの ひょうか（オッズや CPUの きょうさに つかう）──
export function power(r: { speed: number; stamina: number; guts: number }): number {
  return r.speed * 1.0 + r.stamina * 0.55 + r.guts * 0.5;
}

// レースに でる ぜんとうの オッズ（ばいりつ）を、ちからから けいさんする。
// つよい うまほど オッズは ひくく（あたりやすいが もうけは すくない）。
export function computeOdds(field: Racer[]): number[] {
  const powers = field.map(power);
  const T = 4.2; // ばらつきの おおきさ
  const exps = powers.map((p) => Math.exp(p / T));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => {
    const prob = e / sum;
    return Math.max(1.2, Math.round((1 / prob) * 0.82 * 10) / 10);
  });
}

// プレイヤーの あいばを いれた しゅつばひょうを つくる。
// ライバルは こていの つよさ。さいしょは ライバルの ほうが つよいので、
// トレーニングで そだてて おいぬく ＝ RPG の せいちょうかん。
export function buildField(player: PlayerHorse | null): Racer[] {
  const rivals: Racer[] = RIVAL_BASE.map((r) => ({ ...r, isPlayer: false }));
  if (!player) return rivals;

  // つかれ と なかよし で じっさいの ちからが かわる
  const fatigueMul = 1 - player.fatigue / 220; // つかれていると おそい（さいだい -45%）
  const bondMul = 1 + player.bond / 500; // なかよしだと やるき UP
  const eff = (v: number) => Math.max(1, v * fatigueMul * bondMul);

  const you: Racer = {
    key: "you",
    name: player.name,
    emoji: player.emoji,
    color: player.color,
    speed: eff(player.speed),
    stamina: eff(player.stamina),
    guts: eff(player.guts),
    style: player.style,
    isPlayer: true,
  };

  // まんなかの レーンに あいばを いれる
  const field = [...rivals];
  field.splice(2, 0, you);
  return field;
}

// きゃくしつごとの ペースはいぶん（しんこうど 0→1 で どれだけ とばすか）。
// レースぜんたいの へいきんは どの きゃくしつも ほぼ おなじ（≒1.02）。
// → かちまけは「きゃくしつ」より「ステータス」で きまるが、てんかいは ちがう。
function paceMul(style: RunStyle, p: number): number {
  switch (style) {
    case "nige":
      return 1.09 - 0.13 * p; // さいしょ はやく、あとで たれぎみ
    case "senko":
      return 1.03 - 0.03 * p; // ほぼ いってい
    case "sashi":
      return 0.95 + 0.12 * p; // ちゅうばんから のびる
    case "oikomi":
      return 0.89 + 0.24 * p; // さいごに ばくはつ
  }
}

export type RaceEvent = { at: number; text: string; big?: boolean };

export type SimResult = {
  frames: number[][]; // frames[t][i] = うま i の いち（0..DISTANCE）
  finishOrder: number[]; // ゴールじゅん（うまの index）
  finishTime: number[]; // それぞれが ゴールした フレーム（しょうすう）
  events: RaceEvent[]; // じっきょうテロップ
  photoFinish: boolean; // ゴールまえ せっせん だったか
  frameMs: number; // 1フレームの さいせいじかん（ms）
};

// レースを さいごまで けいさんする。rnd は 0..1 の らんすう。
export function simulateRace(field: Racer[], rnd: () => number): SimResult {
  const n = field.length;
  const pos = new Array<number>(n).fill(0);
  const maxEnergy = field.map((r) => 80 + r.stamina * 8);
  const energy = [...maxEnergy];
  // レースごとの「ちょうし」（1とうずつ 1かいだけ きまる）→ ばんくるわせの もと
  const condition = field.map(() => 0.86 + rnd() * 0.28);
  const frames: number[][] = [];
  const events: RaceEvent[] = [{ at: 0, text: "ゲートイン… よーい、ドン！ 🏁", big: true }];
  const finishTime = new Array<number>(n).fill(-1);
  let finishedCount = 0;
  let leaderPrev = -1;
  let lastLeadEventAt = -99;
  let cornerCalled = false;
  let t = 0;
  const MAX = 600;
  const stopAfter = Math.min(3, n); // じょうい3とうが ゴールしたら うちきり（テンポ ゆうせん）

  while (finishedCount < stopAfter && t < MAX) {
    for (let i = 0; i < n; i++) {
      if (pos[i] >= DISTANCE) continue;
      const r = field[i];
      const p = Math.min(1, pos[i] / DISTANCE);

      let spd = (6 + r.speed * 1.2) * paceMul(r.style, p) * condition[i];

      // スタミナぎれ：のこりエネルギーが すくないと そくど ダウン
      const eFrac = energy[i] / maxEnergy[i];
      if (eFrac < 0.3) spd *= 0.6 + (0.4 * eFrac) / 0.3;

      // しゅうばん（のこり 30%）：こんじょうで ラストの のび
      if (p > 0.7) {
        spd *= 1 + r.guts * 0.006 * ((p - 0.7) / 0.3);
      }

      // まいフレーム すこし ぶれる（みための いきおい）
      spd *= 0.93 + rnd() * 0.14;

      // エネルギーを けずる（はやく はしるほど へる）
      energy[i] = Math.max(0, energy[i] - spd * 0.3);

      const prev = pos[i];
      pos[i] = Math.min(DISTANCE, prev + spd);
      if (pos[i] >= DISTANCE && finishTime[i] < 0) {
        // しょうすうの ゴールじかん（しゃしんはんてい よう）
        finishTime[i] = t + (DISTANCE - prev) / spd;
        finishedCount++;
      }
    }
    frames.push(pos.slice());

    const maxPos = Math.max(...pos);
    const progress = maxPos / DISTANCE;
    const leader = pos.indexOf(maxPos);

    // せんとうこうたい の じっきょう（れんぱつ しすぎない）
    if (
      leader !== leaderPrev &&
      progress > 0.1 &&
      progress < 0.92 &&
      t - lastLeadEventAt >= 5
    ) {
      events.push({ at: t, text: `${field[leader].name} が せんとうに たった！` });
      leaderPrev = leader;
      lastLeadEventAt = t;
    }

    // ラストコーナー
    if (!cornerCalled && progress >= 0.7) {
      events.push({ at: t, text: "ラストコーナーを まわった！ さあ ラストスパート！ 🔥", big: true });
      cornerCalled = true;
    }
    t++;
  }

  // まだ ゴールしていない うまは、いまの いちで かりの ゴールじかんを きめる
  // （まえに いるほど はやい じゅんい になる）
  const lastPos = frames[frames.length - 1] ?? pos;
  for (let i = 0; i < n; i++) {
    if (finishTime[i] < 0) finishTime[i] = t + (DISTANCE - lastPos[i]);
  }

  // ゴールじゅんを しょうすうじかんで ならべる
  const finishOrder = field
    .map((_, i) => i)
    .sort((a, b) => {
      const ta = finishTime[a] < 0 ? 1e9 : finishTime[a];
      const tb = finishTime[b] < 0 ? 1e9 : finishTime[b];
      return ta - tb;
    });

  const photoFinish =
    finishOrder.length >= 2 &&
    finishTime[finishOrder[0]] >= 0 &&
    finishTime[finishOrder[1]] >= 0 &&
    Math.abs(finishTime[finishOrder[0]] - finishTime[finishOrder[1]]) < 0.7;

  if (photoFinish) {
    events.push({ at: t, text: "ゴールぜん、はなさ せっせん！ しゃしんはんてい！ 📸", big: true });
  }
  events.push({ at: t + 1, text: `${field[finishOrder[0]].name} が ゴールイン！ 🏆`, big: true });

  return { frames, finishOrder, finishTime, events, photoFinish, frameMs: 72 };
}
