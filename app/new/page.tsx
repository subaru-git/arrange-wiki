import { NewPostForm } from "@/components/new-post-form";
import { hasSupabaseAuthConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BullMode, OutRule } from "@/lib/types/domain";

interface PageProps {
  searchParams: {
    remaining_score?: string;
    out_rule?: string;
    bull_mode?: string;
  };
}

const outRules: OutRule[] = ["double_out", "master_out", "single_out"];
const bullModes: BullMode[] = ["separate", "fat"];

function normalizeScore(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 70;
  return Math.max(1, Math.min(701, Math.trunc(parsed)));
}

function normalizeOutRule(value?: string): OutRule {
  return outRules.includes(value as OutRule) ? (value as OutRule) : "double_out";
}

function normalizeBullMode(value?: string): BullMode {
  return bullModes.includes(value as BullMode) ? (value as BullMode) : "separate";
}

export default async function NewPage({ searchParams }: PageProps) {
  let isSignedIn = false;

  if (hasSupabaseAuthConfig) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    isSignedIn = Boolean(data.user);
  }

  return (
    <section className="new-post-page">
      <NewPostForm
        canSave={isSignedIn}
        initialRemainingScore={normalizeScore(searchParams.remaining_score)}
        initialOutRule={normalizeOutRule(searchParams.out_rule)}
        initialBullMode={normalizeBullMode(searchParams.bull_mode)}
      />
    </section>
  );
}
