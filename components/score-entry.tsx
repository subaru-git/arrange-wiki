"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { BullMode, OutRule } from "@/lib/types/domain";

const outRuleOptions: Array<{ value: OutRule; label: string }> = [
  { value: "double_out", label: "ダブルアウト" },
  { value: "master_out", label: "マスターアウト" },
  { value: "single_out", label: "シングルアウト" },
];

const bullModeOptions: Array<{ value: BullMode; label: string }> = [
  { value: "separate", label: "セパレートブル" },
  { value: "fat", label: "ファットブル" },
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(701, Math.max(1, Math.trunc(value)));
}

function numericOnly(value: string) {
  return value.replace(/\D/g, "");
}

function scoreHref(score: number, outRule: OutRule, bullMode: BullMode) {
  const params = new URLSearchParams({ out_rule: outRule, bull_mode: bullMode });
  return `/scores/${score}?${params.toString()}`;
}

export function ScoreEntry({ commonScores }: { commonScores: number[] }) {
  const router = useRouter();
  const [score, setScore] = useState("");
  const [outRule, setOutRule] = useState<OutRule>("double_out");
  const [bullMode, setBullMode] = useState<BullMode>("separate");
  const nextScore = score ? clampScore(Number(score)) : null;
  const newPostHref = nextScore
    ? `/new?${new URLSearchParams({
        remaining_score: String(nextScore),
        out_rule: outRule,
        bull_mode: bullMode,
      }).toString()}`
    : "/new";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextScore) return;
    router.push(scoreHref(nextScore, outRule, bullMode));
  }

  return (
    <div className="score-entry">
      <form onSubmit={submit}>
        <label className="score-entry-field">
            <span>残りスコア（1〜701）</span>
          <input
            aria-label="残りスコア 1から701"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={score}
            onChange={(event) => setScore(numericOnly(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            autoFocus
          />
        </label>

        <div className="score-entry-mode">
          <div className="select-field">
            <span>アウトルール</span>
            <CustomSelect
              ariaLabel="アウトルール"
              value={outRule}
              options={outRuleOptions}
              onValueChange={(value) => setOutRule(value as OutRule)}
            />
          </div>
          <div className="select-field">
            <span>ブル</span>
            <CustomSelect
              ariaLabel="ブル"
              value={bullMode}
              options={bullModeOptions}
              onValueChange={(value) => setBullMode(value as BullMode)}
            />
          </div>
        </div>
        <button type="submit" disabled={!score}>
          検索する
        </button>
      </form>

      <section className="score-entry-recommend">
        <p>よく見られるスコア</p>
        <div className="score-entry-shortcuts">
          {commonScores.map((value) => (
            <Link key={value} href={scoreHref(value, outRule, bullMode)}>
              {value}
            </Link>
          ))}
        </div>
        <p className="score-entry-secondary">
          <Link href={newPostHref}>ルートを登録する</Link>
        </p>
      </section>
    </div>
  );
}
