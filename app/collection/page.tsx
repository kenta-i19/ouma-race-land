"use client";

import Link from "next/link";
import { useGame } from "@/lib/storage";
import CoinIcon from "@/components/CoinIcon";

const RANK_LABEL: Record<"cup" | "g1" | "g2" | "g3", string> = { cup: "チャンピオンズ", g1: "G1", g2: "G2", g3: "G3" };
const RANK_ORDER: ("cup" | "g1" | "g2" | "g3")[] = ["cup", "g1", "g2", "g3"];

export default function CollectionPage() {
  const { data, ready } = useGame();

  return (
    <main className="screen">
      <div className="topbar">
        <Link href="/" className="backbtn">◀ おうち</Link>
        <div className="coinbar small">
          <CoinIcon size={17} />
          <span>{ready ? data.coins : "…"}</span>
        </div>
      </div>

      <h1 className="page-title">じゅうしょうコレクション</h1>

      {/* トロフィー だな */}
      <div className="coll-trophies">
        <span className="coll-tcell g1">👑 G1 <b>{ready ? data.trophies.g1 : 0}</b></span>
        <span className="coll-tcell">🏆 G2 <b>{ready ? data.trophies.g2 : 0}</b></span>
        <span className="coll-tcell">🏆 G3 <b>{ready ? data.trophies.g3 : 0}</b></span>
      </div>

      {!ready ? (
        <p className="hint">よみこみちゅう…</p>
      ) : data.wonRaces.length === 0 ? (
        <div className="card">
          <p className="subtitle">まだ じゅうしょうを かっていないよ</p>
          <p className="hint">あいばを そだてて、G3・G2・G1レースで ゆうしょうすると ここに あつまるよ！</p>
          <Link href="/race" className="gobtn aslink">レースへ いく 🏇</Link>
        </div>
      ) : (
        <>
          {RANK_ORDER.map((rk) => {
            const list = data.wonRaces.filter((w) => w.rank === rk);
            if (list.length === 0) return null;
            return (
              <div key={rk} className="coll-group">
                <p className="coll-grouptitle">{RANK_LABEL[rk]}</p>
                <div className="coll-grid">
                  {list.map((w) => (
                    <div key={w.name} className={`coll-card rk-${rk}`}>
                      <span className="coll-flag">{rk === "cup" ? "👑" : rk === "g1" ? "🚩" : "🏆"}</span>
                      <span className="coll-name">{w.name}</span>
                      <span className="coll-rank">{RANK_LABEL[rk]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="hint">かった レースの たねるいは {data.wonRaces.length}しゅるい！ ぜんG1せいはを めざそう 👑</p>
        </>
      )}
    </main>
  );
}
