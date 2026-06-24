"use client";

// ────────────────────────────────────────────
// こうかおん ＆ BGM エンジン（Web Audio API で プログラムせいせい）。
// おんせい よみあげは つかわず、すべて この エンジンで おとを ならす。
// オフラインでも うごき、おんせいファイルも いらない。
// ピアノ／ベルふうの やわらかい おとで、おしゃれな ふんいきに。
// ────────────────────────────────────────────

type Bgm = "menu" | "race" | null;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let delaySend: GainNode | null = null;
let muted = false;
let inited = false;

const MUTE_KEY = "ouma:soundMuted";

function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function makeCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();

  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0.0; // BGM は フェードインで あげる
  musicBus.connect(master);

  // やわらかい ひろがり（フィードバックディレイ）
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.28;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(master);
  delaySend = ctx.createGain();
  delaySend.gain.value = 0.25;
  delaySend.connect(delay);

  master.gain.value = muted ? 0 : 1;
  return ctx;
}

// 1おん ならす（target に つなぐ）
function note(
  target: AudioNode,
  opts: {
    freq: number;
    type?: OscillatorType;
    t: number;
    dur: number;
    vol: number;
    attack?: number;
    glideTo?: number;
    detune?: number;
    send?: boolean;
  }
) {
  if (!ctx) return;
  const { freq, type = "sine", t, dur, vol, attack = 0.006, glideTo, detune = 0, send = false } = opts;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.value = detune;
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // やわらかさの ために ローパス
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4200;
  o.connect(g);
  g.connect(lp);
  lp.connect(target);
  if (send && delaySend) lp.connect(delaySend);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// ノイズ（くつおと・ホイッスル・かんせい よう）
function noise(
  target: AudioNode,
  opts: { t: number; dur: number; vol: number; type?: BiquadFilterType; freq?: number; q?: number }
) {
  if (!ctx) return;
  const { t, dur, vol, type = "bandpass", freq = 1800, q = 0.8 } = opts;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(target);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function now(): number {
  return ctx ? ctx.currentTime : 0;
}

// ── こうかおん ──
function arp(notes: number[], step: number, type: OscillatorType, vol: number) {
  if (!ctx || !sfxBus) return;
  const t0 = now();
  notes.forEach((m, i) => {
    note(sfxBus!, { freq: midi(m), type, t: t0 + i * step, dur: step + 0.18, vol, send: true });
  });
}

export const sfx = {
  tap() {
    if (!sfxBus) return;
    note(sfxBus, { freq: midi(74), type: "sine", t: now(), dur: 0.08, vol: 0.18 });
  },
  select() {
    if (!sfxBus) return;
    arp([76, 81], 0.06, "triangle", 0.16);
  },
  correct() {
    arp([72, 76, 79, 84], 0.075, "triangle", 0.2); // ドミソド
  },
  coin() {
    arp([88, 95], 0.05, "square", 0.12);
  },
  wrong() {
    if (!sfxBus) return;
    const t = now();
    note(sfxBus, { freq: midi(64), type: "sine", t, dur: 0.16, vol: 0.18, glideTo: midi(59) });
    note(sfxBus, { freq: midi(57), type: "sine", t: t + 0.13, dur: 0.22, vol: 0.16, glideTo: midi(53) });
  },
  levelUp() {
    arp([67, 72, 76, 79, 84], 0.08, "triangle", 0.2);
  },
  train() {
    if (!sfxBus) return;
    const t = now();
    note(sfxBus, { freq: 150, type: "sine", t, dur: 0.12, vol: 0.28, glideTo: 90 });
    noise(sfxBus, { t, dur: 0.06, vol: 0.1, type: "highpass", freq: 2000 });
  },
  feed() {
    if (!sfxBus) return;
    note(sfxBus, { freq: midi(72), type: "triangle", t: now(), dur: 0.12, vol: 0.18, glideTo: midi(79) });
  },
  count() {
    if (!sfxBus) return;
    note(sfxBus, { freq: midi(69), type: "square", t: now(), dur: 0.14, vol: 0.16 });
  },
  go() {
    if (!sfxBus) return;
    const t = now();
    // ホイッスル＋ゲートが ひらく いきおい
    note(sfxBus, { freq: midi(81), type: "square", t, dur: 0.3, vol: 0.2, glideTo: midi(88) });
    noise(sfxBus, { t, dur: 0.35, vol: 0.14, type: "bandpass", freq: 2600, q: 2 });
  },
  win() {
    arp([72, 76, 79, 84, 88], 0.1, "triangle", 0.22);
  },
  lose() {
    if (!sfxBus) return;
    const t = now();
    note(sfxBus, { freq: midi(64), type: "sine", t, dur: 0.3, vol: 0.18, glideTo: midi(60) });
    note(sfxBus, { freq: midi(60), type: "sine", t: t + 0.2, dur: 0.5, vol: 0.16, glideTo: midi(55) });
  },
  photo() {
    if (!sfxBus) return;
    // しゃしんはんてい：カメラの シャッターふう
    noise(sfxBus, { t: now(), dur: 0.06, vol: 0.16, type: "highpass", freq: 4000 });
  },
};

// ── くつおと ループ（レースちゅう）──
let hoofTimer: ReturnType<typeof setInterval> | null = null;
export function startHoofbeats() {
  if (!ctx || hoofTimer) return;
  const clop = () => {
    if (!ctx || !sfxBus) return;
    const t = now();
    noise(sfxBus, { t, dur: 0.05, vol: 0.06, type: "lowpass", freq: 380, q: 1 });
    noise(sfxBus, { t: t + 0.09, dur: 0.05, vol: 0.05, type: "lowpass", freq: 320, q: 1 });
  };
  clop();
  hoofTimer = setInterval(clop, 300);
}
export function stopHoofbeats() {
  if (hoofTimer) {
    clearInterval(hoofTimer);
    hoofTimer = null;
  }
}

// ── BGM（ステップシーケンサー）──
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let bgmTheme: Bgm = null;
let nextStepTime = 0;
let stepIndex = 0;

type Track = {
  tempo: number;
  steps: number;
  chords: number[][]; // 1コードあたり 8ステップ
  arp: number[]; // コードないの どの おんを じゅんに ひくか（index）
  bass: boolean;
  kick: boolean;
};

const TRACKS: Record<"menu" | "race", Track> = {
  // しずかで うえひん（ラウンジふう）
  menu: {
    tempo: 74,
    steps: 32,
    chords: [
      [48, 60, 64, 67, 71], // Cmaj7
      [45, 57, 60, 64, 67], // Am7
      [41, 60, 65, 69, 72], // Fmaj7(9)
      [43, 59, 62, 67, 71], // G
    ],
    arp: [1, 2, 3, 4, 3, 2],
    bass: true,
    kick: false,
  },
  // すこし はずむ、レースの たかなり
  race: {
    tempo: 124,
    steps: 32,
    chords: [
      [45, 57, 60, 64], // Am
      [41, 60, 65, 69], // F
      [48, 60, 64, 67], // C
      [43, 59, 62, 67], // G
    ],
    arp: [1, 2, 3, 2, 1, 2, 3, 2],
    bass: true,
    kick: true,
  },
};

function playStep(track: Track, step: number, t: number) {
  if (!ctx || !musicBus) return;
  const chordIdx = Math.floor(step / 8) % track.chords.length;
  const chord = track.chords[chordIdx];
  const inBar = step % 8;

  // コードあたまで パッド（ながめ）
  if (inBar === 0) {
    const dur = (60 / track.tempo) * 4 * 0.98;
    chord.slice(1).forEach((m, i) => {
      note(musicBus!, { freq: midi(m), type: "sine", t, dur, vol: 0.05, attack: 0.5, detune: i % 2 ? 4 : -4 });
    });
  }
  // ベース
  if (track.bass && inBar % (track.kick ? 2 : 4) === 0) {
    note(musicBus!, { freq: midi(chord[0]), type: "triangle", t, dur: 0.5, vol: 0.12 });
  }
  // キック（レースのみ）
  if (track.kick && inBar % 2 === 0) {
    note(musicBus!, { freq: 120, type: "sine", t, dur: 0.12, vol: 0.18, glideTo: 50 });
  }
  // アルペジオ（ベル）
  const arpDeg = track.arp[step % track.arp.length];
  const m = chord[Math.min(arpDeg, chord.length - 1)] + 12;
  note(musicBus!, { freq: midi(m), type: "triangle", t, dur: 0.4, vol: 0.06, send: true });
}

function scheduler() {
  if (!ctx || !bgmTheme || bgmTheme === null) return;
  const track = TRACKS[bgmTheme];
  const spb = 60 / track.tempo;
  const stepDur = spb / 2; // 8ぶおんぷ
  while (nextStepTime < ctx.currentTime + 0.12) {
    playStep(track, stepIndex, nextStepTime);
    nextStepTime += stepDur;
    stepIndex = (stepIndex + 1) % track.steps;
  }
}

export function playBgm(theme: Bgm) {
  if (!ctx || !musicBus) return;
  if (theme === bgmTheme) return;
  bgmTheme = theme;
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  const target = theme === "race" ? 0.16 : 0.13;
  const t = now();
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  if (!theme) {
    musicBus.gain.linearRampToValueAtTime(0, t + 0.6);
    return;
  }
  stepIndex = 0;
  nextStepTime = t + 0.08;
  musicBus.gain.linearRampToValueAtTime(muted ? 0 : target, t + 1.2);
  bgmTimer = setInterval(scheduler, 25);
}

// ── しょきか／ミュート ──
export function initAudio() {
  const c = makeCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  if (!inited) {
    inited = true;
    try {
      muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
    if (master) master.gain.value = muted ? 0 : 1;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return muted;
  }
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* むし */
  }
  if (master && ctx) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.15);
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
