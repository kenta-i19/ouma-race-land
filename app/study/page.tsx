"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "@/lib/storage";
import { makeHiraganaQuiz, HiraganaQuiz, REWARD_PER_CORRECT } from "@/lib/game";
import { sfx } from "@/lib/audio";

type Phase = "answering" | "correct" | "wrong";

export default function StudyPage() {
  const { data, ready, update } = useGame();
  const [quiz, setQuiz] = useState<HiraganaQuiz | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [picked, setPicked] = useState<string | null>(null);

  const newQuiz = useCallback(() => {
    const q = makeHiraganaQuiz();
    setQuiz(q);
    setPhase("answering");
    setPicked(null);
    sfx.select();
  }, []);

  useEffect(() => {
    newQuiz();
  }, [newQuiz]);

  const onPick = (choice: string) => {
    if (!quiz || phase !== "answering") return;
    setPicked(choice);
    if (choice === quiz.word.hiragana) {
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
      <Link href="/" className="backbtn">
        ◀ おうち
      </Link>

      <div className="coinbar">
        <span className="icon">🥕</span>
        <span>{ready ? data.coins : "…"}</span>
      </div>

      <div className="card">
        <div className="quiz-q">これは なに？</div>

        {quiz && <div className="quiz-emoji">{quiz.word.emoji}</div>}

        <div className="choices">
          {quiz?.choices.map((c) => {
            let cls = "choice";
            if (phase !== "answering") {
              if (c === quiz.word.hiragana) cls += " correct";
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
          <div className="result ok">
            🎉 せいかい！ +{REWARD_PER_CORRECT}🥕
          </div>
        )}
        {phase === "wrong" && (
          <div className="result ng">
            ざんねん… こたえは「{quiz?.word.hiragana}」
          </div>
        )}

        {phase !== "answering" && (
          <button className="gobtn" onClick={newQuiz}>
            つぎの もんだい ▶
          </button>
        )}
      </div>

      <p className="hint">せいかいすると にんじんコインが {REWARD_PER_CORRECT}まい もらえるよ！</p>
    </main>
  );
}
