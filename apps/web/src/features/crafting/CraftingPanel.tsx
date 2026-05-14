import { useEffect, useMemo, useRef, useState } from "react";
import type { InventoryState, ItemStack } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import {
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

type CraftableEntry = {
  id: string;
  stationId: CraftingStationId;
  kind: "recipe" | "building";
  targetId: string;
  outputItemId: string;
  name: string;
  tier: ProgressionTier;
  category: RecipeCategory;
  inputs: ItemStack[];
  outputs: ItemStack[];
  craftTimeMs: number;
  description: string;
  metaLabel: string;
};

type CraftQueueJob = CraftableEntry & {
  jobId: string;
  startedAt: number;
  finishesAt: number;
};

type CraftQueueState = Partial<Record<CraftingStationId, CraftQueueJob[]>>;

function getOwnedAmount(inventory: InventoryState | null, itemId: string) {
  return inventory?.items.find((item) => item.itemId === itemId)?.amount ?? 0;
}

function canAfford(inventory: InventoryState | null, stacks: ItemStack[]) {
  return stacks.every((stack) => getOwnedAmount(inventory, stack.itemId) >= stack.amount);
}

function formatCraftTime(ms: number) {
  if (ms <= 0) return "즉시";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.ceil(ms / 1000)}초`;
}

function formatRemainingTime(ms: number) {
  if (ms <= 0) return "완료 처리 중";
  return `${Math.ceil(ms / 1000)}초 남음`;
}

function formatStacks(stacks: ItemStack[]) {
  return stacks.map((stack) => `${getItemLabel(stack.itemId)} ${stack.amount}`).join(" · ");
}

function toCraftableEntries(station: CraftingStationDefinition): CraftableEntry[] {
  const recipeEntries = getRecipesByStation(station.id).map<CraftableEntry>((recipe) => ({
    id: `recipe:${recipe.id}`,
    stationId: station.id,
    kind: "recipe",
    targetId: recipe.id,
    outputItemId: recipe.outputs[0]?.itemId ?? recipe.id,
    name: recipe.name,
    tier: recipe.tier,
    category: recipe.category,
    inputs: recipe.inputs,
    outputs: recipe.outputs,
    craftTimeMs: recipe.craftTimeMs,
    description: recipe.description,
    metaLabel: `${categoryLabels[recipe.category]} · 시간 ${formatCraftTime(recipe.craftTimeMs)} · 결과 ${formatStacks(recipe.outputs)}`,
  }));

  const buildingEntries = getBuildableBuildingsByStation(station.id).map<CraftableEntry>((building) => {
    const itemId = getBuildingItemId(building.type);
    return {
      id: `building:${building.type}`,
      stationId: station.id,
      kind: "building",
      targetId: building.type,
      outputItemId: itemId,
      name: building.name,
      tier: building.tier,
      category: "building",
      inputs: building.requires,
      outputs: [{ itemId, amount: 1 }],
      craftTimeMs: building.craftTimeMs,
      description: building.description,
      metaLabel: `건설 · 시간 ${formatCraftTime(building.craftTimeMs)} · 결과 ${getItemLabel(itemId)} 1`,
    };
  });

  return [...recipeEntries, ...buildingEntries];
}

function RequirementList({ inventory, stacks }: { inventory: InventoryState | null; stacks: ItemStack[] }) {
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
  return <span className="crafting-card__icon" aria-hidden="true">{icon ? <img src={icon.src} alt="" /> : <span>?</span>}</span>;
}

function ProgressBar({ startedAt, finishesAt, now }: { startedAt: number; finishesAt: number; now: number }) {
  const totalMs = Math.max(1, finishesAt - startedAt);
  const progress = Math.max(0, Math.min(100, Math.round(((now - startedAt) / totalMs) * 100)));
  return <div className="crafting-queue__bar" aria-label={`제작 진행도 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>;
}

function CraftQueueView({ station, jobs, now, onCancel }: { station: CraftingStationDefinition; jobs: CraftQueueJob[]; now: number; onCancel: (job: CraftQueueJob) => void }) {
  const activeJobs = jobs.filter((job) => now < job.finishesAt);
  return (
    <section className="crafting-queue">
      <div className="feature-panel__section-title">제작 큐 {activeJobs.length}/{station.queueSize}</div>
      {jobs.length === 0 ? <div className="feature-panel__hint">진행 중인 제작이 없습니다.</div> : (
        <div className="crafting-queue-list">
          {jobs.map((job) => {
            const done = now >= job.finishesAt;
            return (
              <div key={job.jobId} className="crafting-card crafting-card--queue">
                <div className="crafting-card__main">
                  <CraftIcon itemId={job.outputItemId} />
                  <span className="crafting-card__text">
                    <b>{job.name}</b>
                    <span>{formatStacks(job.outputs)}</span>
                    <small>{done ? "제작 완료 · 지급 중" : formatRemainingTime(job.finishesAt - now)}</small>
                  </span>
                </div>
                <ProgressBar startedAt={job.startedAt} finishesAt={job.finishesAt} now={now} />
                {!done ? <button className="crafting-card__button crafting-card__button--ghost" onClick={() => onCancel(job)}>취소</button> : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StationCraftingSection({ station, inventory, queueJobs, now, onStartJob, onCancelJob }: {
  station: CraftingStationDefinition;
  inventory: InventoryState | null;
  queueJobs: CraftQueueJob[];
  now: number;
  onStartJob: (entry: CraftableEntry) => void;
  onCancelJob: (job: CraftQueueJob) => void;
}) {
  const entries = useMemo(() => toCraftableEntries(station), [station]);
  const activeJobs = queueJobs.filter((job) => now < job.finishesAt);
  const queueFull = activeJobs.length >= station.queueSize;

  return (
    <section className="crafting-station-section">
      <div className="crafting-station-section__intro">
        <strong>{station.name}</strong>
        <span>{station.description} · 일반 아이템과 건설물 모두 같은 제작 큐로 처리됩니다.</span>
      </div>

      <CraftQueueView station={station} jobs={queueJobs} now={now} onCancel={onCancelJob} />
      {entries.length === 0 ? <div className="feature-panel__hint">이 제작소에는 아직 등록된 레시피가 없습니다.</div> : null}

      {tiers.map((tier) => {
        const tierEntries = entries.filter((entry) => entry.tier === tier);
        if (tierEntries.length === 0) return null;
        return (
          <section key={`${station.id}-${tier}`} className="crafting-tier">
            <div className="feature-panel__section-title">{tier} 제작</div>
            <div className="crafting-recipe-grid">
              {tierEntries.map((entry) => {
                const affordable = canAfford(inventory, entry.inputs);
                const runningJob = activeJobs.find((job) => job.id === entry.id);
                const disabled = Boolean(runningJob) || !affordable || (queueFull && !runningJob);
                const buttonLabel = runningJob
                  ? `제작 중 · ${formatRemainingTime(runningJob.finishesAt - now)}`
                  : !affordable
                    ? "재료 부족"
                    : queueFull
                      ? "큐 가득참"
                      : "제작 시작";
                return (
                  <article key={entry.id} className={runningJob ? "crafting-card crafting-card--working" : disabled ? "crafting-card crafting-card--disabled" : "crafting-card"}>
                    <div className="crafting-card__main">
                      <CraftIcon itemId={entry.outputItemId} />
                      <span className="crafting-card__text">
                        <b>{entry.name}</b>
                        <span>{entry.description}</span>
                        <small>{entry.metaLabel}</small>
                      </span>
                    </div>
                    <RequirementList inventory={inventory} stacks={entry.inputs} />
                    {runningJob ? <ProgressBar startedAt={runningJob.startedAt} finishesAt={runningJob.finishesAt} now={now} /> : null}
                    <button className="crafting-card__button" onClick={() => onStartJob(entry)} disabled={disabled}>{buttonLabel}</button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function CraftingPanel({ inventory = null, stationId, compact = false, onCraft, onCraftBuildingItem }: {
  inventory?: InventoryState | null;
  stationId?: CraftingStationId;
  compact?: boolean;
  onCraft: (recipeId: string) => void;
  onCraftBuildingItem: (buildingType: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [queueState, setQueueState] = useState<CraftQueueState>({});
  const queueStateRef = useRef<CraftQueueState>({});
  const claimedJobIdsRef = useRef<Set<string>>(new Set());
  const onCraftRef = useRef(onCraft);
  const onCraftBuildingItemRef = useRef(onCraftBuildingItem);
  const stations = useMemo(() => {
    const targetStation = getCraftingStation(stationId ?? "hand");
    return targetStation ? [targetStation] : [];
  }, [stationId]);

  const commitQueueState = (next: CraftQueueState) => {
    queueStateRef.current = next;
    setQueueState(next);
  };

  useEffect(() => {
    onCraftRef.current = onCraft;
    onCraftBuildingItemRef.current = onCraftBuildingItem;
  }, [onCraft, onCraftBuildingItem]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const tickNow = Date.now();
      const current = queueStateRef.current;
      const next: CraftQueueState = {};
      const completedJobs: CraftQueueJob[] = [];
      let changed = false;

      for (const [stationKey, jobs] of Object.entries(current) as [CraftingStationId, CraftQueueJob[]][]) {
        const remainingJobs: CraftQueueJob[] = [];
        for (const job of jobs) {
          if (tickNow >= job.finishesAt) {
            changed = true;
            if (!claimedJobIdsRef.current.has(job.jobId)) {
              claimedJobIdsRef.current.add(job.jobId);
              completedJobs.push(job);
            }
          } else {
            remainingJobs.push(job);
          }
        }
        next[stationKey] = remainingJobs;
      }

      setNow(tickNow);
      if (changed) commitQueueState(next);

      if (completedJobs.length > 0) {
        window.setTimeout(() => {
          for (const job of completedJobs) {
            if (job.kind === "recipe") onCraftRef.current(job.targetId);
            else onCraftBuildingItemRef.current(job.targetId);
          }
        }, 0);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const startJob = (entry: CraftableEntry) => {
    const station = getCraftingStation(entry.stationId);
    if (!station) return;

    const tickNow = Date.now();
    const current = queueStateRef.current;
    const jobs = current[entry.stationId] ?? [];
    const activeJobs = jobs.filter((job) => tickNow < job.finishesAt);
    if (activeJobs.length >= station.queueSize) {
      commitQueueState({ ...current, [entry.stationId]: activeJobs });
      return;
    }

    const job: CraftQueueJob = {
      ...entry,
      jobId: `${entry.id}-${tickNow}-${Math.floor(Math.random() * 1_000_000)}`,
      startedAt: tickNow,
      finishesAt: tickNow + Math.max(250, entry.craftTimeMs),
    };
    commitQueueState({ ...current, [entry.stationId]: [...activeJobs, job] });
  };

  const removeJob = (job: CraftQueueJob) => {
    const current = queueStateRef.current;
    commitQueueState({ ...current, [job.stationId]: (current[job.stationId] ?? []).filter((queuedJob) => queuedJob.jobId !== job.jobId) });
  };

  return (
    <div className={compact ? "feature-panel feature-panel--crafting feature-panel--crafting-compact" : "feature-panel feature-panel--crafting"}>
      {!compact ? <div className="feature-panel__hint">손 제작은 건설물 없이 가능한 기본 제작만 표시합니다. 작업대, 모닥불, 화로 등은 설치 후 해당 건물을 상호작용해야 전용 제작 목록이 열립니다.</div> : null}
      {stations.map((station) => (
        <StationCraftingSection
          key={station.id}
          station={station}
          inventory={inventory}
          queueJobs={queueState[station.id] ?? []}
          now={now}
          onStartJob={startJob}
          onCancelJob={removeJob}
        />
      ))}
    </div>
  );
}
