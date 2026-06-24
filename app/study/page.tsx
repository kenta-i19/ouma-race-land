"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/lib/storage";
import { makeQuiz, Quiz, QuizKind, QUIZ_KINDS, REWARD_PER_CORRECT } from "@/lib/game";
import { sfx } from "@/lib/audio";

type Phase = "answering" | "correct" | "wrong";
type Category = QuizKind | "mix";

const ALL_KINDS: QuizKind[] = ["hiragana", "katakana", "add", "sub"];

const STICKERS_PER_KIND = 6; // 1きょうか あたりの シールまいすう
const PER_STICKER = 5; // シール1まいに ひつような せいかいすう
const STICKER_ICON: Record<QuizKind, string> = {
  hiragana: "🌸",
  katakana: "⭐",
  add: "🍎",
  sub: "🐤",
};

// れんぞくせいかいの ばいりつ
function comboMult(combo: number): number {
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export default function StudyPage() {
  const { data, ready, update } = useGame();
  const [category, setCategory] = useState<Category>("mix");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [picked, setPicked] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [gain, setGain] = useState(REWARD_PER_CORRECT);
  const [stickerMsg, setStickerMsg] = useState("");

  const newQuiz = useCallback((cat: Category) => {
    const kind = cat === "mix" ? ALL_KINDS[Math.floor(Math.random() * ALL_KINDS.length)] : cat;
    setQuiz(makeQuiz(kind));
    setPhase("answering");
    setPicked(null);
    setStickerMsg("");
    sfx.select();
  }, []);

  useEffect(() => {
    newQuiz("mix");
  }, [newQuiz]);

  const changeCategory = (cat: Category) => {
    setCategory(cat);
    setCombo(0);
    newQuiz(cat);
  };

  const onPick = (choice: string) => {
    if (!quiz || phase !== "answering") return;
    setPicked(choice);
    if (choice === quiz.answer) {
      const nextCombo = combo + 1;
      const mult = comboMult(nextCombo);
      const reward = REWARD_PER_CORRECT * mult;
      setCombo(nextCombo);
      setGain(reward);
      setPhase("correct");
      if (mult >= 3) sfx.levelUp();
      else sfx.correct();

      // きょうかべつ カウント＋シール かくとく はんてい
      const kind = quiz.kind;
      const before = data.studyKind[kind] ?? 0;
      const after = before + 1;
      const newSticker = after % PER_STICKER === 0 && after / PER_STICKER <= STICKERS_PER_KIND;
      if (newSticker) {
        const label = QUIZ_KINDS.find((k) => k.kind === kind)?.label ?? "";
        setStickerMsg(`${STICKER_ICON[kind]} ${label}の シールを ゲット！`);
      }

      update((p) => ({
        ...p,
        coins: p.coins + reward,
        studyCorrect: p.studyCorrect + 1,
        studyKind: { ...p.studyKind, [kind]: (p.studyKind[kind] ?? 0) + 1 },
      }));
    } else {
      setCombo(0);
      setPhase("wrong");
      sfx.wrong();
    }
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link href="/" className="backbtn">◀ おうち</Link>
        <div className="coinbar small">
          <span className="icon">🥕</span>
          <span>{ready ? data.coins : "…"}</span>
        </div>
      </div>

      {/* カテゴリえらび */}
      <div className="cat-row">
        <button
          className={`cat-chip ${category === "mix" ? "selected" : ""}`}
          onClick={() => changeCategory("mix")}
        >
          おまかせ
        </button>
        {QUIZ_KINDS.map((k) => (
          <button
            key={k.kind}
            className={`cat-chip ${category === k.kind ? "selected" : ""}`}
            onClick={() => changeCategory(k.kind)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* れんぞくせいかい コンボ */}
      {combo >= 2 && (
        <div className={`combo ${comboMult(combo) >= 3 ? "hot" : ""}`}>
          🔥 {combo}れんぞく！ <b>コイン ×{comboMult(combo)}</b>
        </div>
      )}

      <div className="card">
        <div className="quiz-q">{quiz?.question ?? "…"}</div>

        {quiz &&
          (quiz.display === "emoji" ? (
            <div className="quiz-emoji">{quiz.prompt}</div>
          ) : (
            <div className="quiz-expr">
              {quiz.prompt} <span className="eq">＝ ？</span>
            </div>
          ))}

        <div className={`choices ${quiz?.display === "expr" ? "choices-row" : ""}`}>
          {quiz?.choices.map((c) => {
            let cls = "choice";
            if (phase !== "answering") {
              if (c === quiz.answer) cls += " correct";
              else if (c === picked) cls += " wrong";
            }
            return (
              <button
                key={c}
                className={cls}
                disabled={phase !== "answering"}
                onClick={() => onPick(c)}
              >
                {c}
              </button>
            );
          })}
        </div>

        {phase === "correct" && (
          <div className="result ok">🎉 せいかい！ +{gain}🥕</div>
        )}
        {phase === "wrong" && (
          <div className="result ng">ざんねん… こたえは「{quiz?.answer}」</div>
        )}
        {stickerMsg && <div className="sticker-get">{stickerMsg}</div>}

        {phase !== "answering" && (
          <button className="gobtn" onClick={() => newQuiz(category)}>
            つぎの もんだい ▶
          </button>
        )}
      </div>

      {/* シールちょう */}
      {ready && (
        <div className="sticker-book">
          <p className="sb-title">シールちょう</p>
          {QUIZ_KINDS.map((k) => {
            const count = data.studyKind[k.kind] ?? 0;
            const earned = Math.min(STICKERS_PER_KIND, Math.floor(count / PER_STICKER));
            return (
              <div className="sb-row" key={k.kind}>
                <span className="sb-label">{k.label}</span>
                <span className="sb-slots">
                  {Array.from({ length: STICKERS_PER_KIND }).map((_, i) => (
                    <span key={i} className={`sb-slot ${i < earned ? "on" : ""}`}>
                      {i < earned ? STICKER_ICON[k.kind] : ""}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="hint">れんぞくで せいかいすると コインが ふえる！ 5もんで シール1まい もらえるよ</p>
    </main>
  );
}
