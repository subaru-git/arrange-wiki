import Link from "next/link";
import { cookies } from "next/headers";
import { ModePicker } from "@/components/mode-picker";
import { PostCard } from "@/components/post-card";
import { ScorePicker } from "@/components/score-picker";
import { listPosts, recordScoreView } from "@/lib/repository";
import { hasSupabaseAuthConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BullMode, OutRule } from "@/lib/types/domain";
import { BROWSER_ID_COOKIE } from "@/lib/browser-id";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { remaining_score: string };
  searchParams: {
    out_rule?: string;
    bull_mode?: string;
  };
}

const outRuleOptions: Array<{ value: OutRule; label: string }> = [
  { value: "double_out", label: "Double out" },
  { value: "master_out", label: "Master out" },
  { value: "single_out", label: "Single out" },
];

const bullModeOptions: Array<{ value: BullMode; label: string }> = [
  { value: "separate", label: "Separate bull" },
  { value: "fat", label: "Fat bull" },
];

function normalizeOutRule(value?: string): OutRule {
  return outRuleOptions.some((option) => option.value === value) ? (value as OutRule) : "double_out";
}

function normalizeBullMode(value?: string): BullMode {
  return bullModeOptions.some((option) => option.value === value) ? (value as BullMode) : "separate";
}

function newRouteHref(remainingScore: number, outRule: OutRule, bullMode: BullMode) {
  const params = new URLSearchParams({
    remaining_score: String(remainingScore),
    out_rule: outRule,
    bull_mode: bullMode,
  });
  return `/new?${params.toString()}`;
}

export default async function ScorePage({ params, searchParams }: PageProps) {
  const remainingScore = Number(params.remaining_score);
  const outRule = normalizeOutRule(searchParams.out_rule);
  const bullMode = normalizeBullMode(searchParams.bull_mode);

  const browserId = cookies().get(BROWSER_ID_COOKIE)?.value;
  const supabase = hasSupabaseAuthConfig ? createServerSupabaseClient() : undefined;
  const viewerUserId = supabase ? (await supabase.auth.getUser()).data.user?.id : undefined;
  await recordScoreView(remainingScore, supabase);
  const posts = await listPosts(
    { remainingScore, outRule, bullMode },
    browserId,
    viewerUserId,
    supabase
  );

  return (
    <section className="mx-auto max-w-[760px] space-y-4 py-3">
      <div className="score-page-kicker">
        <span>ルート検討</span>
        <Link href="/scores">条件を変更</Link>
      </div>
      <header className="score-page-header">
        <div className="flex items-end gap-3">
          <span className="pb-2 text-sm font-semibold text-[var(--color-text-secondary)]">残り</span>
          <h1 className="m-0 leading-none">
            <ScorePicker score={remainingScore} />
          </h1>
        </div>
        <div className="pb-2">
          <ModePicker score={remainingScore} outRule={outRule} bullMode={bullMode} />
        </div>
      </header>

      <div className="candidate-summary">
        <h2>検索結果</h2>
        <strong>{posts.length}ルート</strong>
      </div>

      <div className="grid gap-3">
        {posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="candidate-empty">
            <strong>登録されたルートはありません</strong>
          </div>
        )}
        <p className="candidate-contribution">
          <Link href={newRouteHref(remainingScore, outRule, bullMode)} className="new-route-link">
            この点数のアレンジを追加
          </Link>
        </p>
      </div>
    </section>
  );
}
