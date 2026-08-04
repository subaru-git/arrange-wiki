"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPostAction, editPostAction } from "@/app/actions/post-actions";
import { RouteDiagram } from "@/components/route-diagram";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  addTokenToSelectedNode,
  createInitialRouteTree,
  getNodeById,
  getPathNodeIds,
  getRemainingScoreAtNode,
  getThrowsUsedAtNode,
  normalizeRouteTree,
  removeSelectedSubtree,
  tokenScore,
} from "@/lib/route-tree";
import { BullMode, OutRule, RouteTree } from "@/lib/types/domain";

type Multiplier = "S" | "D" | "T";
type MobileInputMode = "flick" | "standard";

const numbers = Array.from({ length: 20 }, (_, i) => i + 1);
const dartsLeftOptions = [1, 2, 3];
const multiplierLabels: Record<Multiplier, string> = {
  S: "シングル",
  D: "ダブル",
  T: "トリプル",
};
const multiplierOptions: Array<{ value: Multiplier; label: string }> = [
  { value: "S", label: multiplierLabels.S },
  { value: "D", label: multiplierLabels.D },
  { value: "T", label: multiplierLabels.T },
];
const newPostDraftKey = "arrange-route:new-post-draft:v1";
const newPostDraftMaxAgeMs = 30 * 60 * 1000;

type NewPostDraft = {
  savedAt: number;
  remainingScore: number;
  remainingScoreInput: string;
  dartsLeft: number;
  outRule: OutRule;
  bullMode: BullMode;
  routeTree: RouteTree;
  selectedNodeId: string;
  comment: string;
};

function numericOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isOutRule(value: unknown): value is OutRule {
  return value === "double_out" || value === "master_out" || value === "single_out";
}

function isBullMode(value: unknown): value is BullMode {
  return value === "separate" || value === "fat";
}

function isRouteTree(value: unknown): value is RouteTree {
  if (!value || typeof value !== "object") return false;
  const tree = value as Partial<RouteTree>;
  return typeof tree.targetNodeId === "string" && Array.isArray(tree.nodes) && Array.isArray(tree.edges);
}

function isNewPostDraft(value: unknown): value is NewPostDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<NewPostDraft>;
  return (
    typeof draft.savedAt === "number" &&
    Number.isFinite(draft.remainingScore) &&
    typeof draft.remainingScoreInput === "string" &&
    Number.isInteger(draft.dartsLeft) &&
    isOutRule(draft.outRule) &&
    isBullMode(draft.bullMode) &&
    isRouteTree(draft.routeTree) &&
    typeof draft.selectedNodeId === "string" &&
    typeof draft.comment === "string"
  );
}

function SaveSubmitButton({ canSubmit, label }: { canSubmit: boolean; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="new-form-submit" disabled={!canSubmit || pending}>
      {pending ? "保存中…" : label}
    </button>
  );
}

interface NewPostFormProps {
  mode?: "create" | "edit";
  postId?: string;
  canSave?: boolean;
  initialRemainingScore?: number;
  originalRemainingScore?: number;
  initialDartsLeft?: number;
  initialOutRule?: OutRule;
  initialBullMode?: BullMode;
  initialRouteTree?: RouteTree;
}

export function NewPostForm({
  mode = "create",
  postId,
  canSave = true,
  initialRemainingScore = 70,
  originalRemainingScore = initialRemainingScore,
  initialDartsLeft = 3,
  initialOutRule = "double_out",
  initialBullMode = "separate",
  initialRouteTree,
}: NewPostFormProps) {
  const [remainingScore, setRemainingScore] = useState(initialRemainingScore);
  const [remainingScoreInput, setRemainingScoreInput] = useState(String(initialRemainingScore));
  const [dartsLeft, setDartsLeft] = useState(initialDartsLeft);
  const [outRule, setOutRule] = useState<OutRule>(initialOutRule);
  const [bullMode, setBullMode] = useState<BullMode>(initialBullMode);
  const [multiplier, setMultiplier] = useState<Multiplier>("T");
  const [mobileInputMode, setMobileInputMode] = useState<MobileInputMode>("flick");
  const [tree, setTree] = useState<RouteTree>(() => initialRouteTree ?? createInitialRouteTree());
  const [selectedNodeId, setSelectedNodeId] = useState<string>("target");
  const [comment, setComment] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(mode !== "create");
  const targetPointerStart = useRef<{ x: number; y: number; number: number } | null>(null);
  const [flickPreview, setFlickPreview] = useState<{ number: number; multiplier: Multiplier } | null>(
    null
  );

  useEffect(() => {
    if (mode !== "create") return;

    try {
      const raw = window.localStorage.getItem(newPostDraftKey);
      if (!raw) {
        setDraftLoaded(true);
        return;
      }

      const draft = JSON.parse(raw) as unknown;
      if (!isNewPostDraft(draft) || Date.now() - draft.savedAt > newPostDraftMaxAgeMs) {
        window.localStorage.removeItem(newPostDraftKey);
        setDraftLoaded(true);
        return;
      }

      setRemainingScore(Math.max(1, Math.min(701, Math.trunc(draft.remainingScore))));
      setRemainingScoreInput(draft.remainingScoreInput);
      setDartsLeft(Math.max(1, Math.min(3, draft.dartsLeft)));
      setOutRule(draft.outRule);
      setBullMode(draft.bullMode);
      setTree(normalizeRouteTree(draft.routeTree));
      setSelectedNodeId(draft.selectedNodeId);
      setComment(draft.comment);
    } catch {
      window.localStorage.removeItem(newPostDraftKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "create" || !draftLoaded) return;

    const draft: NewPostDraft = {
      savedAt: Date.now(),
      remainingScore,
      remainingScoreInput,
      dartsLeft,
      outRule,
      bullMode,
      routeTree: tree,
      selectedNodeId,
      comment,
    };

    window.localStorage.setItem(newPostDraftKey, JSON.stringify(draft));
  }, [
    mode,
    draftLoaded,
    remainingScore,
    remainingScoreInput,
    dartsLeft,
    outRule,
    bullMode,
    tree,
    selectedNodeId,
    comment,
  ]);

  const bullButtons = useMemo(() => {
    if (bullMode === "fat") return [{ label: "BULL", token: "BULL" }];
    if (outRule === "double_out") {
      return [
        { label: "Bull", token: "Bull" },
        { label: "25", token: "25" },
      ];
    }
    return [
      { label: "S-BULL", token: "S-BULL" },
      { label: "D-BULL", token: "D-BULL" },
    ];
  }, [bullMode, outRule]);

  const removeSelected = () => {
    const next = removeSelectedSubtree(tree, selectedNodeId);
    setTree(next.tree);
    setSelectedNodeId(next.selectedNodeId);
  };

  const clearAll = () => {
    setTree(createInitialRouteTree());
    setSelectedNodeId("target");
  };

  const changeMobileInputMode = (mode: MobileInputMode) => {
    targetPointerStart.current = null;
    setFlickPreview(null);
    setMobileInputMode(mode);
  };

  const nodeCount = tree.nodes.length - 1;
  const selectedNode = getNodeById(tree, selectedNodeId);
  const selectedLabel =
    selectedNodeId === "target" ? `スコア ${remainingScore}` : (selectedNode?.token ?? "ルート");
  const selectedRemaining = getRemainingScoreAtNode(tree, remainingScore, selectedNodeId);
  const selectedThrowsUsed = getThrowsUsedAtNode(tree, selectedNodeId);
  const canAddByThrows = selectedThrowsUsed < dartsLeft;
  const canAddByScore = selectedRemaining > 0;
  const canAddToSelected = canAddByThrows && canAddByScore;
  const canAddFromTarget = remainingScore > 0 && dartsLeft > 0;
  const canAddToken = canAddFromTarget;

  const addToken = (token: string) => {
    if (!canAddToken) return;
    const sourceNodeId = canAddToSelected ? selectedNodeId : tree.targetNodeId;
    const next = addTokenToSelectedNode(tree, sourceNodeId, token);
    setTree(next.tree);
    setSelectedNodeId(next.selectedNodeId);
  };

  const addNumberToken = (nextMultiplier: Multiplier, number: number) => {
    addToken(`${nextMultiplier}${number}`);
  };

  const multiplierFromFlick = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): Multiplier | null => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < 24) return "S";
    if (Math.abs(deltaY) > Math.abs(deltaX)) return null;
    return deltaX > 0 ? "T" : "D";
  };

  const startTargetFlick = (event: PointerEvent<HTMLButtonElement>, number: number) => {
    targetPointerStart.current = { x: event.clientX, y: event.clientY, number };
    setFlickPreview({ number, multiplier: "S" });
  };

  const previewTargetFlick = (event: PointerEvent<HTMLButtonElement>, number: number) => {
    const start = targetPointerStart.current;
    if (!start || start.number !== number) return;

    const nextMultiplier = multiplierFromFlick(start, { x: event.clientX, y: event.clientY });
    setFlickPreview(nextMultiplier ? { number, multiplier: nextMultiplier } : null);
  };

  const finishTargetFlick = (event: PointerEvent<HTMLButtonElement>, number: number) => {
    const start = targetPointerStart.current;
    targetPointerStart.current = null;
    setFlickPreview(null);
    event.currentTarget.blur();

    if (!start || start.number !== number) {
      addNumberToken("S", number);
      return;
    }

    const nextMultiplier = multiplierFromFlick(start, { x: event.clientX, y: event.clientY });
    if (!nextMultiplier) return;
    addNumberToken(nextMultiplier, number);
  };
  const childNodeIds = useMemo(() => new Set(tree.edges.map((edge) => edge.from)), [tree.edges]);
  const leafNodes = useMemo(
    () => tree.nodes.filter((node) => node.id !== tree.targetNodeId && !childNodeIds.has(node.id)),
    [childNodeIds, tree.nodes, tree.targetNodeId]
  );
  const completeLeafCount = leafNodes.filter((node) => {
    const remaining = getRemainingScoreAtNode(tree, remainingScore, node.id);
    const throwsUsed = getThrowsUsedAtNode(tree, node.id);
    return remaining >= 0 && (remaining === 0 || throwsUsed === dartsLeft);
  }).length;
  const routeSummaries = leafNodes
    .slice()
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    })
    .map((node, index) => {
      const pathNodeIds = getPathNodeIds(tree, node.id).slice(1);
      const tokens = pathNodeIds.map((id) => getNodeById(tree, id)?.token ?? "");
      const remaining = remainingScore - tokens.reduce((acc, token) => acc + tokenScore(token), 0);
      const complete = remaining >= 0 && (remaining === 0 || tokens.length >= dartsLeft);
      const status = remaining < 0 ? "バースト" : complete ? "完成" : "編集中";
      return {
        id: node.id,
        index: index + 1,
        label: tokens.join(" -> "),
        remaining,
        complete,
        status,
      };
    });
  const hasBustedLeaves = leafNodes.some((node) => {
    const remaining = getRemainingScoreAtNode(tree, remainingScore, node.id);
    return remaining < 0;
  });
  const routeCanSubmit = nodeCount > 0 && !hasBustedLeaves;
  const canSubmit = routeCanSubmit && canSave;
  const saveMessage =
    nodeCount === 0
      ? "ターゲットを1つ以上追加してください。"
      : hasBustedLeaves
        ? "バーストしたルートを削除してください。"
        : !canSave
          ? "ログインすると保存できます。"
        : "保存できます。";

  let guardMessage = "";
  if (!canAddFromTarget) guardMessage = "残りスコアが0以下のため追加できません。";

  const commitRemainingScore = () => {
    const parsed = Number(remainingScoreInput);
    const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(701, Math.trunc(parsed))) : 70;
    setRemainingScore(safe);
    setRemainingScoreInput(String(safe));
    setSelectedNodeId("target");
  };

  const isEditMode = mode === "edit";
  const formAction = isEditMode ? editPostAction : createPostAction;
  const submitLabel = isEditMode ? "変更を保存" : "このアレンジを保存";
  const handleSubmit = () => {
    if (!isEditMode && canSubmit) {
      window.localStorage.removeItem(newPostDraftKey);
    }
  };

  return (
    <form action={formAction} className="new-form" onSubmit={handleSubmit}>
      {isEditMode ? (
        <>
          <input type="hidden" name="post_id" value={postId ?? ""} />
          <input type="hidden" name="original_remaining_score" value={originalRemainingScore} />
        </>
      ) : null}

      <section className="new-form-section">
        <div className="new-form-grid">
          <label className="new-score-field">
            残りスコア
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="remaining_score"
              value={remainingScoreInput}
              onChange={(e) => {
                const next = numericOnly(e.target.value);
                setRemainingScoreInput(next);
                const parsed = Number(next);
                if (Number.isFinite(parsed)) {
                  const safe = Math.max(1, Math.min(701, Math.trunc(parsed)));
                  setRemainingScore(safe);
                  setSelectedNodeId("target");
                }
              }}
              onBlur={commitRemainingScore}
              required
            />
          </label>

          <input type="hidden" name="darts_left" value={dartsLeft} />

          <div className="select-field">
            <span>残りダーツ</span>
            <CustomSelect
              ariaLabel="残りダーツ"
              value={String(dartsLeft)}
              options={dartsLeftOptions.map((value) => ({ value: String(value), label: String(value) }))}
              onValueChange={(value) => setDartsLeft(Number(value))}
            />
          </div>

          <div className="select-field">
            <span>アウト</span>
            <CustomSelect
              ariaLabel="アウト"
              name="out_rule"
              value={outRule}
              options={[
                { value: "double_out", label: "ダブルアウト" },
                { value: "master_out", label: "マスターアウト" },
                { value: "single_out", label: "シングルアウト" },
              ]}
              onValueChange={(value) => setOutRule(value as OutRule)}
            />
          </div>

          <div className="select-field">
            <span>ブル</span>
            <CustomSelect
              ariaLabel="ブル"
              name="bull_mode"
              value={bullMode}
              options={[
                { value: "separate", label: "セパレート" },
                { value: "fat", label: "ファット" },
              ]}
              onValueChange={(value) => setBullMode(value as BullMode)}
            />
          </div>
        </div>
      </section>

      <input type="hidden" name="route_tree_json" value={JSON.stringify(tree)} />

      <section className="tree-builder">
        <div className="tree-builder-head">
          <strong>アレンジツリー</strong>
          <span> ノードを選び、次のターゲットを追加します</span>
        </div>

        <RouteDiagram
          target={remainingScore}
          tree={tree}
          selectedNodeId={selectedNodeId}
          onNodeClick={setSelectedNodeId}
        />

        <div className="builder-tools">
          <div className="target-toolbar desktop-target-tools">
            <span>追加するターゲット</span>
            <div className="multiplier-segment">
              {multiplierOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={multiplier === option.value ? "active" : ""}
                  onClick={() => setMultiplier(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="token-grid desktop-token-grid">
            {numbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addToken(`${multiplier}${n}`)}
                disabled={!canAddToken}
              >
                {multiplier}
                {n}
              </button>
            ))}
          </div>

          <div className="target-toolbar mobile-target-tools">
            <span>追加するターゲット</span>
            <div className="mobile-input-mode" aria-label="入力方式">
              <button
                type="button"
                className={mobileInputMode === "flick" ? "active" : ""}
                aria-pressed={mobileInputMode === "flick"}
                onClick={() => changeMobileInputMode("flick")}
              >
                フリック
              </button>
              <button
                type="button"
                className={mobileInputMode === "standard" ? "active" : ""}
                aria-pressed={mobileInputMode === "standard"}
                onClick={() => changeMobileInputMode("standard")}
              >
                通常
              </button>
            </div>
          </div>

          <div className="mobile-target-pad">
            {mobileInputMode === "flick" ? (
              <div className="token-grid mobile-token-grid">
                {numbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="flick-token"
                    aria-label={`${n} ${multiplierLabels.S}、左フリックで${multiplierLabels.D}、右フリックで${multiplierLabels.T}`}
                    onPointerDown={(event) => startTargetFlick(event, n)}
                    onPointerMove={(event) => previewTargetFlick(event, n)}
                    onPointerUp={(event) => finishTargetFlick(event, n)}
                    onPointerCancel={() => {
                      targetPointerStart.current = null;
                      setFlickPreview(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        addNumberToken("S", n);
                      }
                    }}
                    disabled={!canAddToken}
                  >
                    <span
                      className={
                        flickPreview?.number === n && flickPreview.multiplier === "D"
                          ? "flick-token-left active"
                          : "flick-token-left"
                      }
                    >
                      D
                    </span>
                    <span className="flick-token-main">{n}</span>
                    <span
                      className={
                        flickPreview?.number === n && flickPreview.multiplier === "T"
                          ? "flick-token-right active"
                          : "flick-token-right"
                      }
                    >
                      T
                    </span>
                    <span
                      className={
                        flickPreview?.number === n && flickPreview.multiplier === "S"
                          ? "flick-token-bottom active"
                          : "flick-token-bottom"
                      }
                    >
                      S
                    </span>
                    {flickPreview?.number === n ? (
                      <span className={`flick-token-preview ${flickPreview.multiplier}`}>
                        {flickPreview.multiplier}
                        {n}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mobile-standard-input">
                <div className="multiplier-segment">
                  {multiplierOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={multiplier === option.value ? "active" : ""}
                      onClick={() => setMultiplier(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="token-grid mobile-token-grid mobile-standard-token-grid">
                  {numbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => addToken(`${multiplier}${n}`)}
                      disabled={!canAddToken}
                    >
                      {multiplier}
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mobile-keypad-side">
              <div className="mobile-bull-targets">
                {bullButtons.map((b) => (
                  <button
                    key={b.token}
                    type="button"
                    onClick={() => addToken(b.token)}
                    disabled={!canAddToken}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="mobile-delete-actions">
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={selectedNodeId === "target"}
                  aria-label="選択以降を削除"
                >
                  削除
                </button>
                <button type="button" onClick={clearAll} disabled={nodeCount === 0}>
                  全消し
                </button>
              </div>
            </div>
          </div>

          <div className="bull-targets desktop-bull-targets">
            {bullButtons.map((b) => (
              <button
                key={b.token}
                type="button"
                onClick={() => addToken(b.token)}
                disabled={!canAddToken}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="route-status-grid">
            <div>
              <span>残り</span>
              <strong>{selectedRemaining}</strong>
            </div>
            <div>
              <span>使用ダーツ</span>
              <strong>
                {selectedThrowsUsed}/{dartsLeft}
              </strong>
            </div>
            <div>
              <span>完成ルート</span>
              <strong>
                {completeLeafCount}/{Math.max(leafNodes.length, 1)}
              </strong>
            </div>
          </div>

          <div className="route-actions desktop-route-actions">
            <button type="button" onClick={removeSelected} disabled={selectedNodeId === "target"}>
              選択以降を削除
            </button>
            <button type="button" onClick={clearAll} disabled={nodeCount === 0}>
              すべてクリア
            </button>
          </div>

          {guardMessage ? <p className="guard-message">{guardMessage}</p> : null}
        </div>
      </section>

      {routeSummaries.length > 0 ? (
        <section className="route-summary" aria-label="ルート一覧">
          {routeSummaries.map((route) => (
            <button
              key={route.id}
              type="button"
              className={[
                "route-summary-item",
                route.complete ? "complete" : "",
                route.status === "バースト" ? "bust" : "",
                selectedNodeId === route.id ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSelectedNodeId(route.id)}
            >
              <span className="route-summary-index">ルート {route.index}</span>
              <span className="route-summary-path">{route.label}</span>
              <span className="route-summary-status">{route.status}</span>
              <strong>{route.remaining}</strong>
            </button>
          ))}
        </section>
      ) : null}

      {!isEditMode ? (
        <details className="new-form-note">
          <summary>メモを追加（任意）</summary>
          <textarea name="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </details>
      ) : null}

      <p className={canSubmit ? "save-status ready" : "save-status"}>{saveMessage}</p>
      <SaveSubmitButton canSubmit={canSubmit} label={submitLabel} />
    </form>
  );
}
