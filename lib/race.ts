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
  deco?: string; // そうしょく（プレイヤーの あいばのみ）
};

// ── ライバルうま（CPU）。それぞれ きゃくしつ・とくせい が ちがう ──
// ステータスは「プレイヤーの あいばの つよさ」に あわせて まいかい きまる（＝つねに きっこう）。
//   edge … ぜんたいの つよさの さ（マイナスほど よわい）。へいきんは すこし マイナスで、
//           プレイヤーが ほんの ちょっと ゆうり（そだてた かいが ある）。
//   bias … どの ステータスに かたよるか（ごうけいは ほぼ 0）。
// ステータスは「プレイヤーの あいばの かくステータス × ばいりつ」で きまる（じょうざん）。
// → どの レベルでも つよさの かんけいが かわらず、つねに きっこう。
// fr … ぜんたいばいりつの さ（マイナスほど よわい。へいきんは すこしマイナス＝プレイヤーゆうり）。
// bias … きゃくしつの かたより（ごうけい ほぼ 0）。
type RivalProfile = {
  key: string;
  name: string;
  emoji: string;
  color: string;
  style: RunStyle;
  fr: number;
  bias: { s: number; t: number; g: number };
};

const RIVALS: RivalProfile[] = [
  { key: "r1", name: "ちゃちゃまる", emoji: "🐎", color: "#a87142", style: "senko", fr: -0.05, bias: { s: 0.06, t: -0.03, g: -0.03 } },
  { key: "r2", name: "しろたん", emoji: "🐴", color: "#d9cdb4", style: "sashi", fr: 0.03, bias: { s: -0.05, t: 0.08, g: -0.03 } },
  { key: "r3", name: "くろっこ", emoji: "🏇", color: "#5a4a42", style: "nige", fr: -0.04, bias: { s: 0.08, t: -0.08, g: 0 } },
  { key: "r4", name: "きいろん", emoji: "🦄", color: "#f2c14e", style: "oikomi", fr: 0.02, bias: { s: -0.05, t: -0.03, g: 0.08 } },
  { key: "r5", name: "ぶちこ", emoji: "🫏", color: "#c98bb9", style: "senko", fr: -0.06, bias: { s: 0, t: 0, g: 0 } },
];

export const DISTANCE = 1000; // コースの ながさ（m）

// みための「1フレームに すすむ きょり」の めやす。
// レースごとに「ばの へいきんそくど」で せいきか するので、レベルや レースが かわっても
// うまの はしる はやさ（フレームすう・1コマの いどうりょう）は つねに いっていに なる。
// （だれが かつかの そうたいかんけいは かわらない）
const PACE_STEP = 15;

// ── ちからの ひょうか（オッズや CPUの きょうさに つかう）──
export function power(r: { speed: number; stamina: number; guts: number }): number {
  return r.speed * 1.0 + r.stamina * 0.55 + r.guts * 0.5;
}

// レースに でる ぜんとうの オッズ（ばいりつ）を、ちからから けいさんする。
// じょうげんを クランプして、1000ばい のような きょくたんな オッズを ふせぐ。
export function computeOdds(field: Racer[]): number[] {
  const powers = field.map(power);
  const T = 4.6; // ばらつきの おおきさ
  const exps = powers.map((p) => Math.exp(p / T));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => {
    const prob = e / sum;
    const odds = (1 / prob) * 0.85;
    return Math.min(9.9, Math.max(1.2, Math.round(odds * 10) / 10));
  });
}

// プレイヤーの あいばを いれた しゅつばひょうを つくる。
// ・ライバルは プレイヤーの せいちょうの 一部しか ついてこない（CATCHUP）ので、
//   そだてるほど あいばが ゆうり（にんき馬）に なる＝「そだてた ぶん かてる」。
// ・レースごとに ライバルの ちからが ランダムに ぶれるので、オッズは まいかい かわる。
// ・つかれの ペナルティは ゆるめ（つかれていても きょくたんに よわくは ならない）。
const RIVAL_BASELINE = 11; // ルーキーすいじゅん
// ライバルが プレイヤーの つよさに どれだけ あわせるか（1に ちかいほど きっこう）。
// 0.94＝よく そだてても あいては すぐ そばまで おいつくので、まいかい きわどい しょうぶに なり、
// オッズも まいかい かわる（1.2に はりつかない）。
const RIVAL_CATCHUP = 0.94;

// ── ライバルの なまえ（じっさいの きょうそうば）──
// ふつうレース（しんば〜G2）よう
const NORMAL_NAMES = [
  "ハルウララ", "ナイスネイチャ", "メイショウドトウ", "ヒシアマゾン", "ミホノブルボン",
  "ビワハヤヒデ", "セイウンスカイ", "アグネスタキオン", "マンハッタンカフェ", "ヒシミラクル",
  "タップダンスシチー", "カンパニー", "ダイワスカーレット", "マヤノトップガン", "サクラバクシンオー",
  "マチカネフクキタル", "ツインターボ", "メジロドーベル",
];
// レジェンドレース（G1・チャンピオンズ）よう
const LEGEND_NAMES = [
  "オルフェーヴル", "キタサンブラック", "ディープインパクト", "シンボリルドルフ", "テイエムオペラオー",
  "ナリタブライアン", "ウオッカ", "ジェンティルドンナ", "アーモンドアイ", "トウカイテイオー",
  "メジロマックイーン", "サイレンススズカ", "ゴールドシップ", "スペシャルウィーク", "エルコンドルパサー",
  "ヴィルシーナ", "ブエナビスタ", "ロードカナロア",
];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildField(player: PlayerHorse | null, rivalBoost = 0, legend = false): Racer[] {
  const ps = player
    ? { s: player.speed, t: player.stamina, g: player.guts }
    : { s: RIVAL_BASELINE, t: RIVAL_BASELINE, g: RIVAL_BASELINE };

  // ライバルの きじゅん＝ベースライン＋プレイヤーせいちょうの CATCHUP ぶん
  const target = {
    s: RIVAL_BASELINE + (ps.s - RIVAL_BASELINE) * RIVAL_CATCHUP + rivalBoost,
    t: RIVAL_BASELINE + (ps.t - RIVAL_BASELINE) * RIVAL_CATCHUP + rivalBoost,
    g: RIVAL_BASELINE + (ps.g - RIVAL_BASELINE) * RIVAL_CATCHUP + rivalBoost,
  };

  // レースごとに なまえも シャッフル（まいかい ちがう あいてに なる）
  const names = shuffled(legend ? LEGEND_NAMES : NORMAL_NAMES);

  const rivals: Racer[] = RIVALS.map((r, i) => {
    const jitter = 0.86 + Math.random() * 0.3; // ← レースごとに ぶれる（オッズが まいかい へんか／たまに きょうてき）
    const mk = (v: number, bias: number) => Math.max(4, Math.round(v * (1 + r.fr + bias) * jitter * 10) / 10);
    return {
      key: r.key,
      name: names[i % names.length],
      emoji: r.emoji,
      color: r.color,
      style: r.style,
      isPlayer: false,
      speed: mk(target.s, r.bias.s),
      stamina: mk(target.t, r.bias.t),
      guts: mk(target.g, r.bias.g),
    };
  });

  if (!player) return rivals;

  // つかれ と なかよし で じっさいの ちからが かわる（つかれは ゆるめ：さいだい -約8%）
  const fatigueMul = 1 - player.fatigue / 1200;
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
    deco: player.deco ?? "none",
  };

  // まんなかの レーンに あいばを いれる
  const field = [...rivals];
  field.splice(2, 0, you);
  return field;
}

// ── レースの ランク（クラス）──
// minPower：しゅつそうに ひつような あいばの そうごうりょく。
// boost：ライバルの つよさ。prizeMul/expMul：しょうきん・けいけんちの ばいりつ。
export type RaceRank = {
  id: "maiden" | "g3" | "g2" | "g1" | "champ";
  label: string;
  trophyKey: "" | "g3" | "g2" | "g1"; // どの トロフィーを ふやすか（うまやどランク よう）
  collectRank: "" | "g3" | "g2" | "g1" | "cup"; // コレクションに のこす しゅるい
  minPower: number;
  boost: number;
  prizeMul: number;
  expMul: number;
  requiresG1?: boolean; // G1せいは が ひつよう（チャンピオンレース）
  legend?: boolean; // レジェンドライバルが でる
};

// boost は すべて 0：ライバルは つねに あいばの つよさに あわせるので、
// どの ランクでも・レベルを いくら あげても きっこう（≒ごぶごぶ）。
// ランクの ちがいは「しゅつそうじょうけん・しょうきん・けいけんち・トロフィー・レースめい」。
export const RACE_RANKS: RaceRank[] = [
  { id: "maiden", label: "しんば", trophyKey: "", collectRank: "", minPower: 0, boost: 0, prizeMul: 1, expMul: 1 },
  { id: "g3", label: "G3", trophyKey: "g3", collectRank: "g3", minPower: 33, boost: 0, prizeMul: 1.8, expMul: 1.4 },
  { id: "g2", label: "G2", trophyKey: "g2", collectRank: "g2", minPower: 45, boost: 0, prizeMul: 2.6, expMul: 1.9 },
  { id: "g1", label: "G1", trophyKey: "g1", collectRank: "g1", minPower: 57, boost: 0, prizeMul: 4, expMul: 2.6, legend: true },
  // チャンピオンズ：G1せいは で かいきん。レジェンドライバルが でる とくべつレース。
  { id: "champ", label: "チャンピオンズ", trophyKey: "g1", collectRank: "cup", minPower: 60, boost: 3, prizeMul: 6, expMul: 3.2, requiresG1: true, legend: true },
];

// ── レースめい（ランクごと。G1などは じっさいの レースめいを もとに）──
export const RACE_NAMES: Record<RaceRank["id"], string[]> = {
  maiden: ["メイクデビュー", "しんばせん", "みしょうりせん", "わかば賞", "アイビーステークス"],
  g3: [
    "シンザン記念", "きさらぎ賞", "ファルコンステークス", "たなばた賞", "はこだて記念",
    "アイビスサマーダッシュ", "ラジオNIKKEI賞", "エルムステークス", "シリウスステークス", "カペラステークス",
  ],
  g2: [
    "やよい賞", "スプリングステークス", "きょうと記念", "にっけい賞", "オールカマー",
    "セントライト記念", "アルゼンチンきょうわこくはい", "きんこ賞", "さっぽろ記念", "めぐろ記念",
  ],
  g1: [
    "さつき賞", "にほんダービー", "きくか賞", "てんのうしょう", "ありま記念",
    "ジャパンカップ", "たからづか記念", "やすだ記念", "おうか賞", "オークス",
    "スプリンターズステークス", "マイルチャンピオンシップ", "エリザベスじょおうはい", "おおさか杯", "ホープフルステークス",
  ],
  champ: [
    "ワールドチャンピオンズカップ", "ドリームグランプリ", "レジェンドカップ", "ぎんがダービー", "オールスターズ",
  ],
};

// レースめいを ひとつ えらぶ（rnd は 0..1）
export function pickRaceName(rankId: RaceRank["id"], rnd: () => number): string {
  const list = RACE_NAMES[rankId];
  return list[Math.floor(rnd() * list.length)];
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
  // エネルギー（スタミナ）は「ばの へいきんスタミナ ひ」で せいきか。
  // → スタミナぎれ（しゅうばんの たれ）の おきかたが レベルに よらず いっていになり、
  //   みための はやさも かわらない。あいたいの スタミナさ は そのまま いきる。
  const avgStamina = field.reduce((sum, r) => sum + r.stamina, 0) / n || 1;
  const maxEnergy = field.map((r) => 95 + 70 * (r.stamina / avgStamina));
  const energy = [...maxEnergy];
  // レースごとの「ちょうし」（1とうずつ 1かいだけ きまる）→ ばんくるわせの もと。
  // ブレを すこし おおきめにして、ぎゃくてん・ばんくるわせ を おきやすく。
  const condition = field.map(() => 0.84 + rnd() * 0.32);
  // ── みための はやさを いっていに する せいきか ──
  // ばの さいそく馬 を きじゅんに、せんとうの すすむ はやさ（フレームすう）が
  // レベル・レースに かかわらず つねに いっていに なるよう そろえる。
  const maxSpeed = Math.max(...field.map((r) => r.speed));
  const norm = PACE_STEP / (6 + maxSpeed * 1.2);
  const frames: number[][] = [];
  const events: RaceEvent[] = [{ at: 0, text: "ゲートイン… よーい、ドン！ 🏁", big: true }];
  const finishTime = new Array<number>(n).fill(-1);
  let finishedCount = 0;
  let leaderPrev = -1;
  let lastLeadEventAt = -99;
  let cornerCalled = false;
  let battleCalled = false;
  let t = 0;
  const MAX = 600;
  const stopAfter = Math.min(3, n); // じょうい3とうが ゴールしたら うちきり（テンポ ゆうせん）

  while (finishedCount < stopAfter && t < MAX) {
    const leadPos = Math.max(...pos); // このフレームかいしじの せんとういち
    for (let i = 0; i < n; i++) {
      if (pos[i] >= DISTANCE) continue;
      const r = field[i];
      const p = Math.min(1, pos[i] / DISTANCE);

      let spd = (6 + r.speed * 1.2) * paceMul(r.style, p) * condition[i];

      // スタミナぎれ：のこりエネルギーが すくないと そくど ダウン
      const eFrac = energy[i] / maxEnergy[i];
      if (eFrac < 0.3) spd *= 0.6 + (0.4 * eFrac) / 0.3;

      // しゅうばん（のこり 22%）：おくれている うまほど くいさがる＝ゴールまえ せっせんに
      if (p > 0.78) {
        const behind = leadPos - pos[i];
        if (behind > 0) spd *= 1 + Math.min(0.13, (behind / DISTANCE) * 0.5);
      }

      // しゅうばん（のこり 30%）：こんじょうで ラストの のび
      if (p > 0.7) {
        spd *= 1 + r.guts * 0.006 * ((p - 0.7) / 0.3);
      }

      // まいフレーム すこし ぶれる（みための いきおい）
      spd *= 0.93 + rnd() * 0.14;

      // 1フレームに すすむ きょり（せいきかずみ＝みための はやさ いってい）
      const moveDist = spd * norm;

      // エネルギーを けずる（すすんだ きょりに ひれい。レースぜんたいの しょうひは いってい）
      energy[i] = Math.max(0, energy[i] - moveDist * 0.3);

      const prev = pos[i];
      pos[i] = Math.min(DISTANCE, prev + moveDist);
      if (pos[i] >= DISTANCE && finishTime[i] < 0) {
        // しょうすうの ゴールじかん（しゃしんはんてい よう）
        finishTime[i] = t + (DISTANCE - prev) / moveDist;
        finishedCount++;
      }
    }
    frames.push(pos.slice());

    // じゅんいと「1ちゃく・2ちゃくの さ」を だす
    const sorted = pos.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
    const maxPos = sorted[0].p;
    const progress = maxPos / DISTANCE;
    const leader = sorted[0].i;
    const gap = sorted.length > 1 ? maxPos - sorted[1].p : 999;

    // せんとうこうたい の じっきょう（しゅうばんは こまかく・ねっきょうてきに）
    const throttle = progress > 0.75 ? 3 : 6;
    if (leader !== leaderPrev && progress > 0.1 && progress < 0.97 && t - lastLeadEventAt >= throttle) {
      const txt =
        progress > 0.75
          ? `${field[leader].name} が さいごに ぬけだす！ 🔥`
          : `${field[leader].name} が せんとうに たった！`;
      events.push({ at: t, text: txt, big: progress > 0.85 });
      leaderPrev = leader;
      lastLeadEventAt = t;
    }

    // ラストコーナー
    if (!cornerCalled && progress >= 0.68) {
      events.push({ at: t, text: "ラストコーナー！ ここから ラストスパート！ 🔥", big: true });
      cornerCalled = true;
    }

    // ゴールまえ せっせん（1ちゃく・2ちゃくが ほぼ よこならび）
    if (!battleCalled && progress > 0.8 && progress < 0.96 && gap < 22) {
      events.push({ at: t, text: "ゴールまえ、大せっせん！ どうなる！？ 🔥", big: true });
      battleCalled = true;
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

  return { frames, finishOrder, finishTime, events, photoFinish, frameMs: 68 };
}
