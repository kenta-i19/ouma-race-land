"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/lib/storage";
import { makeQuiz, Quiz, QuizKind, QUIZ_KINDS, REWARD_PER_CORRECT } from "@/lib/game";
import { sfx } from "@/lib/audio";

type Phase = "answering" | "correct" | "wrong";
type Category = QuizKind | "mix";

const ALL_KINDS: QuizKind[] = ["hiragana", "katakana", "add", "sub"];

export default function StudyPage() {
  const { data, ready, update } = useGame();
  const [category, setCategory] = useState<Category>("mix");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [picked, setPicked] = useState<string | null>(null);

  const newQuiz = useCallback((cat: Category) => {
    const kind = cat === "mix" ? ALL_KINDS[Math.floor(Math.random() * ALL_KINDS.length)] : cat;
    setQuiz(makeQuiz(kind));
    setPhase("answering");
    setPicked(null);
    sfx.select();
  }, []);

  useEffect(() => {
    newQuiz("mix");
  }, [newQuiz]);

  const changeCategory = (cat: Category) => {
    setCategory(cat);
    newQuiz(cat);
  };

  const onPick = (choice: string) => {
    if (!quiz || phase !== "answering") return;
    setPicked(choice);
    if (choice === quiz.answer) {
      setPhase("correct");
      sfx.correct();
      update((p) => ({
        ...p,
        coins: p.coins + REWARD_PER_CORRECT,
        studyCorrect: p.studyCorrect + 1,
      }));
    } else {
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
          <div className="result ok">🎉 せいかい！ +{REWARD_PER_CORRECT}🥕</div>
        )}
        {phase === "wrong" && (
          <div className="result ng">ざんねん… こたえは「{quiz?.answer}」</div>
        )}

        {phase !== "answering" && (
          <button className="gobtn" onClick={() => newQuiz(category)}>
            つぎの もんだい ▶
          </button>
        )}
      </div>

      <p className="hint">せいかいすると にんじんコインが {REWARD_PER_CORRECT}まい もらえるよ！</p>
    </main>
  );
}
