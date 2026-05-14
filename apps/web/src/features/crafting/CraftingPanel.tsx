import { useEffect, useMemo, useState } from "react";
import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import {
  CRAFTING_STATIONS,
  getBuildableBuildingsByStation,
  getBuildingItemId,
  getCraftingStation,
  getRecipesByStation,
  type CraftingStationDefinition,
  type CraftingStationId,
  type ProgressionTier,
  type RecipeCategory,
} from "./progressionCatalog";

const tiers: ProgressionTier[] = ["초반", "초중반", "중반", "중후반"];
const categoryLabels: Record<RecipeCategory, string> = {
  material: "재료",
  tool: "도구",
  weapon: "무기",
  armor: "방어구",
  food: "음식",
  building: "건설",
  pal: "펄",
  quest: "진행",
};

type CraftQueueJob = {
  id: string;
  stationId: CraftingStationId;
  kind: "recipe" | "building";
  targetId: string;
  name: string;
  outputsLabel: string;
  startedAt: number;
  finishesAt: number;
};

type CraftQueueState = Partial<Record<CraftingStationId, CraftQueueJob[]>>;

function getOwnedAmount(inventory: InventoryState | null, itemId: string) {
  return inventory?.items.find((item) => item.itemId === itemId)?.amount ?? 0;
}

function canAfford(inventory: InventoryState | null, stacks: { itemId: string; amount: number }[]) {
  return stacks.every((stack) => getOwnedAmount(inventory, stack.itemId) >= stack.amount);
}

function formatCraftTime(ms: number) {
  if (ms <= 0) return "즉시";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.ceil(ms / 1000)}초`;
}

function formatRemainingTime(ms: number) {
  if (ms <= 0) return "완료";
  return `${Math.ceil(ms / 1000)}초 남음`;
}

function formatStacks(stacks: { itemId: string; amount: number }[]) {
  return stacks.map((stack) => `${getItemLabel(stack.itemId)} ${stack.amount}`).join(" · ");
}

function RequirementList({ inventory, stacks }: { inventory: InventoryState | null; stacks: { itemId: string; amount: number }[] }) {
  return (
    <span className="crafting-card__requirements">
      {stacks.map((stack) => {
        const owned = getOwnedAmount(inventory, stack.itemId);
        const enough = owned >= stack.amount;
        return (
          <span key={stack.itemId} className={enough ? "crafting-card__requirement crafting-card__requirement--enough" : "crafting-card__requirement crafting-card__requirement--missing"}>
            {getItemLabel(stack.itemId)} {owned}/{stack.amount}
          </span>
        );
      })}
    </span>
  );
}

function CraftIcon({ itemId }: { itemId: string }) {
  const icon = getIconAsset(itemId);
  return (
    <span className="crafting-card__icon" aria-hidden="true">
      {icon ? <img src={icon.src} alt="" /> : <span>?</span>}
    </span>
  );
}

function CraftQueueView({
  station,
  jobs,
  now,
  onClaim,
  onCancel,
}: {
  station: CraftingStationDefinition;
  jobs: CraftQueueJob[];
  now: number;
  onClaim: (job: CraftQueueJob) => void;
  onCancel: (job: CraftQueueJob) => void;
}) {
  return (
    <section className="crafting-queue">
      <div className="feature-panel__section-title">제작 큐 {jobs.length}/{station.queueSize}</div>
      {jobs.length === 0 ? (
        <div className="feature-panel__hint">진행 중인 제작이 없습니다.</div>
      ) : (
        <div className="crafting-queue-list">
          {jobs.map((job) => {
            const totalMs = Math.max(1, job.finishesAt - job.startedAt);
            const progress = Math.max(0, Math.min(100, Math.round(((now - job.startedAt) / totalMs) * 100)));
            const done = now >= job.finishesAt;
            return (
              <div key={job.id} className="crafting-card crafting-card--queue">
                <div className="crafting-card__main">
                  <CraftIcon itemId={job.kind === "building" ? job.targetId : job.targetId} />
                  <span className="crafting-card__text">
                    <b>{job.name}</b>
                    <span>{job.outputsLabel}</span>
                    <small>{done ? "제작 완료" : formatRemainingTime(job.finishesAt - now)}</small>
                  </span>
                </div>
                <div className="crafting-queue__bar" aria-label={`제작 진행도 ${progress}%`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                {done ? (
                  <button className="crafting-card__button" onClick={() => onClaim(job)}>수령</button>
                ) : (
                  <button className="crafting-card__button crafting-card__button--ghost" onClick={() => onCancel(job)}>취소</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StationCraftingSection({
  station,
  inventory,
  queueJobs,
  now,
  onStartJob,
  onClaimJob,
  onCancelJob,
}: {
  station: CraftingStationDefinition;
  inventory: InventoryState | null;
  queueJobs: CraftQueueJob[];
  now: number;
  onStartJob: (job: Omit<CraftQueueJob, "id" | "startedAt" | "finishesAt">, craftTimeMs: number) => void;
  onClaimJob: (job: CraftQueueJob) => void;
  onCancelJob: (job: CraftQueueJob) => void;
}) {
  const recipes = getRecipesByStation(station.id);
  const buildableBuildings = getBuildableBuildingsByStation(station.id);
  const hasRecipes = recipes.length > 0;
  const hasBuildings = buildableBuildings.length > 0;
  const queueFull = queueJobs.length >= station.queueSize;

  return (
    <section className="crafting-station-section">
      <div className="crafting-station-section__intro">
        <strong>{station.name}</strong>
        <span>{station.description} · 제작 큐 {station.queueSize}칸</span>
      </div>

      <CraftQueueView station={station} jobs={queueJobs} now={now} onClaim={onClaimJob} onCancel={onCancelJob} />

      {!hasRecipes && !hasBuildings ? (
        <div className="feature-panel__hint">이 제작소에는 아직 등록된 레시피가 없습니다.</div>
      ) : null}

      {tiers.map((tier) => {
        const tierRecipes = recipes.filter((recipe) => recipe.tier === tier);
        const tierBuildings = buildableBuildings.filter((building) => building.tier === tier);
        if (tierRecipes.length === 0 && tierBuildings.length === 0) return null;

        return (
          <section key={`${station.id}-${tier}`} className="crafting-tier">
            {tierRecipes.length > 0 ? (
              <>
                <div className="feature-panel__section-title">{tier} 제작</div>
                <div className="crafting-recipe-grid">
                  {tierRecipes.map((recipe) => {
                    const affordable = canAfford(inventory, recipe.inputs);
                    const outputsLabel = formatStacks(recipe.outputs);
                    const outputItemId = recipe.outputs[0]?.itemId ?? recipe.id;
                    return (
                      <article key={recipe.id} className={affordable && !queueFull ? "crafting-card" : "crafting-card crafting-card--disabled"}>
                        <div className="crafting-card__main">
                          <CraftIcon itemId={outputItemId} />
                          <span className="crafting-card__text">
                            <b>{recipe.name}</b>
                            <span>{recipe.description}</span>
                            <small>{categoryLabels[recipe.category]} · 시간 {formatCraftTime(recipe.craftTimeMs)} · 결과 {outputsLabel}</small>
                          </span>
                        </div>
                        <RequirementList inventory={inventory} stacks={recipe.inputs} />
                        <button
                          className="crafting-card__button"
                          onClick={() => onStartJob({ stationId: station.id, kind: "recipe", targetId: recipe.id, name: recipe.name, outputsLabel }, recipe.craftTimeMs)}
                          disabled={!affordable || queueFull}
                        >
                          제작
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}

            {tierBuildings.length > 0 ? (
              <>
                <div className="feature-panel__section-title">{tier} 건설</div>
                <div className="crafting-recipe-grid">
                  {tierBuildings.map((building) => {
                    const affordable = canAfford(inventory, building.requires);
                    const itemId = getBuildingItemId(building.type);
                    const outputsLabel = `${getItemLabel(itemId)} 1`;
                    return (
                      <article key={building.type} className={affordable && !queueFull ? "crafting-card" : "crafting-card crafting-card--disabled"}>
                        <div className="crafting-card__main">
                          <CraftIcon itemId={itemId} />
                          <span className="crafting-card__text">
                            <b>{building.name}</b>
                            <span>{building.description}</span>
                            <small>Lv.{building.unlockLevel} · {building.category} · 결과 {outputsLabel}</small>
                          </span>
                        </div>
                        <RequirementList inventory={inventory} stacks={building.requires} />
                        <button
                          className="crafting-card__button"
                          onClick={() => onStartJob({ stationId: station.id, kind: "building", targetId: building.type, name: building.name, outputsLabel }, 2000)}
                          disabled={!affordable || queueFull}
                        >
                          제작
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}

export function CraftingPanel({
  inventory = null,
  stationId,
  compact = false,
  onCraft,
  onCraftBuildingItem,
}: {
  inventory?: InventoryState | null;
  stationId?: CraftingStationId;
  compact?: boolean;
  onCraft: (recipeId: string) => void;
  onCraftBuildingItem: (buildingType: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [queueState, setQueueState] = useState<CraftQueueState>({});
  const stations = useMemo(
    () => stationId ? [getCraftingStation(stationId)].filter(Boolean) as CraftingStationDefinition[] : CRAFTING_STATIONS,
    [stationId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const startJob = (jobInput: Omit<CraftQueueJob, "id" | "startedAt" | "finishesAt">, craftTimeMs: number) => {
    const station = getCraftingStation(jobInput.stationId);
    if (!station) return;

    setQueueState((current) => {
      const jobs = current[jobInput.stationId] ?? [];
      if (jobs.length >= station.queueSize) return current;
      const startedAt = Date.now();
      const job: CraftQueueJob = {
        ...jobInput,
        id: `${jobInput.kind}-${jobInput.targetId}-${startedAt}`,
        startedAt,
        finishesAt: startedAt + Math.max(0, craftTimeMs),
      };
      return { ...current, [jobInput.stationId]: [...jobs, job] };
    });
  };

  const removeJob = (job: CraftQueueJob) => {
    setQueueState((current) => ({
      ...current,
      [job.stationId]: (current[job.stationId] ?? []).filter((queuedJob) => queuedJob.id !== job.id),
    }));
  };

  const claimJob = (job: CraftQueueJob) => {
    if (Date.now() < job.finishesAt) return;
    removeJob(job);
    if (job.kind === "recipe") onCraft(job.targetId);
    else onCraftBuildingItem(job.targetId);
  };

  return (
    <div className={compact ? "feature-panel feature-panel--crafting feature-panel--crafting-compact" : "feature-panel feature-panel--crafting"}>
      {!compact ? (
        <div className="feature-panel__hint">
          제작은 제작소 데이터 기준으로 자동 분류됩니다. 제작 버튼을 누르면 큐에 등록되고 완료 후 수령할 수 있습니다.
        </div>
      ) : null}
      {stations.map((station) => (
        <StationCraftingSection
          key={station.id}
          station={station}
          inventory={inventory}
          queueJobs={queueState[station.id] ?? []}
          now={now}
          onStartJob={startJob}
          onClaimJob={claimJob}
          onCancelJob={removeJob}
        />
      ))}
    </div>
  );
}
