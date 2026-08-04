import { ArrangeWorkspaceTabs } from "@/components/arrange-workspace-tabs";
import { NewPostForm } from "@/components/new-post-form";
import { ScoreEntry } from "@/components/score-entry";
import { listCommonScores } from "@/lib/repository";
import { hasSupabaseAuthConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ScoresIndexPage() {
  const commonScores = await listCommonScores();
  let isSignedIn = false;

  if (hasSupabaseAuthConfig) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    isSignedIn = Boolean(data.user);
  }

  return (
    <section className="workspace-page">
      <ArrangeWorkspaceTabs
        buildPanel={<NewPostForm canSave={isSignedIn} />}
        searchPanel={<ScoreEntry commonScores={commonScores} />}
      />
    </section>
  );
}
