import { useMemo, useState } from "react";
import type { BuildingState, InventoryState, ItemStack } from "@palpalworld/shared";
import { addInventoryStack, getInventoryAmount, removeInventoryStack } from "../inventory/inventoryStore";
import { getItemLabel } from "../items/itemLabels";
import { getProgressionBuilding } from "../crafting/progressionCatalog";

type BuildingSpecificPanelProps = {
  building: BuildingState;
  inventory: InventoryState;
  onInventoryChange: (inventory: InventoryState) => void;
};

type FarmCropType = "berry" | "herb";
type FarmState = {
  cropType: FarmCropType | null;
  plantedAt: number;
  harvests: number;
};
type GeneratorState = {
  storedPower: number;
  lastChargedAt: number;
};
type GuardTowerState = {
  mode: "passive" | "watch" | "defense";
};

type BaseCoreState = {
  baseName: string;
  spawnBound: boolean;
  workerSlots: number;
};

const farmStoragePrefix = "palpalworld.building.farm.";
const generatorStoragePrefix = "palpalworld.building.generator.";
const guardTowerStoragePrefix = "palpalworld.building.guardTower.";
const baseCoreStoragePrefix = "palpalworld.building.baseCore.";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readFarmState(buildingId: string): FarmState {
  return readJson<FarmState>(`${farmStoragePrefix}${buildingId}`, { cropType: null, plantedAt: 0, harvests: 0 });
}

function writeFarmState(buildingId: string, state: FarmState) {
  writeJson(`${farmStoragePrefix}${buildingId}`, state);
}

function readGeneratorState(buildingId: string): GeneratorState {
  return readJson<GeneratorState>(`${generatorStoragePrefix}${buildingId}`, { storedPower: 0, lastChargedAt: 0 });
}

function writeGeneratorState(buildingId: string, state: GeneratorState) {
  writeJson(`${generatorStoragePrefix}${buildingId}`, state);
}

function readGuardTowerState(buildingId: string): GuardTowerState {
  return readJson<GuardTowerState>(`${guardTowerStoragePrefix}${buildingId}`, { mode: "watch" });
}

function writeGuardTowerState(buildingId: string, state: GuardTowerState) {
  writeJson(`${guardTowerStoragePrefix}${buildingId}`, state);
}

function readBaseCoreState(buildingId: string): BaseCoreState {
  return readJson<BaseCoreState>(`${baseCoreStoragePrefix}${buildingId}`, { baseName: "나의 거점", spawnBound: false, workerSlots: 0 });
}

function writeBaseCoreState(buildingId: string, state: BaseCoreState) {
  writeJson(`${baseCoreStoragePrefix}${buildingId}`, state);
}

function formatRemaining(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds <= 0) return "완료";
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}분 ${rest}초` : `${minutes}분`;
}

function mergeStacks(items: ItemStack[], stack: ItemStack) {
  const next = items.map((item) => ({ ...item }));
  const found = next.find((item) => item.itemId === stack.itemId);
  if (found) found.amount += stack.amount;
  else next.push({ ...stack });
  return next;
}

function addInventoryStacks(inventory: InventoryState, stacks: ItemStack[]) {
  return stacks.reduce((next, stack) => addInventoryStack(next, stack.itemId, stack.amount), inventory);
}

function getBuildingDisplayName(building: BuildingState) {
  return getProgressionBuilding(String(building.type))?.name ?? String(building.type);
}

function FarmPlotPanel({ building, inventory, onInventoryChange }: BuildingSpecificPanelProps) {
  const [farmState, setFarmState] = useState(() => readFarmState(building.id));
  const now = Date.now();
  const growMs = farmState.cropType === "herb" ? 90_000 : 60_000;
  const progress = farmState.cropType ? Math.min(100, Math.floor(((now - farmState.plantedAt) / growMs) * 100)) : 0;
  const ready = Boolean(farmState.cropType && now - farmState.plantedAt >= growMs);
  const cropLabel = farmState.cropType ? getItemLabel(farmState.cropType) : "없음";

  const plant = (cropType: FarmCropType) => {
    const requiredItemId = cropType;
    if (farmState.cropType) return;
    if (getInventoryAmount(inventory, requiredItemId) <= 0) return;
    onInventoryChange(removeInventoryStack(inventory, requiredItemId, 1));
    const nextState = { cropType, plantedAt: Date.now(), harvests: farmState.harvests };
    setFarmState(nextState);
    writeFarmState(building.id, nextState);
  };

  const harvest = () => {
    if (!farmState.cropType || !ready) return;
    const outputAmount = farmState.cropType === "herb" ? 4 : 8;
    onInventoryChange(addInventoryStack(inventory, farmState.cropType, outputAmount));
    const nextState = { cropType: null, plantedAt: 0, harvests: farmState.harvests + 1 };
    setFarmState(nextState);
    writeFarmState(building.id, nextState);
  };

  const cancelCrop = () => {
    if (!farmState.cropType) return;
    const nextState = { cropType: null, plantedAt: 0, harvests: farmState.harvests };
    setFarmState(nextState);
    writeFarmState(building.id, nextState);
  };

  return (
    <div className="building-specific-panel building-specific-panel--farm">
      <div className="building-specific-panel__summary">
        <span>재배 작물</span><b>{cropLabel}</b>
        <span>성장률</span><b>{progress}%</b>
        <span>수확 횟수</span><b>{farmState.harvests}</b>
      </div>
      {farmState.cropType ? (
        <>
          <div className="building-specific-progress"><i style={{ width: `${progress}%` }} /></div>
          <p className="feature-panel__hint">{ready ? "수확할 수 있습니다." : `남은 시간: ${formatRemaining(growMs - (now - farmState.plantedAt))}`}</p>
          <div className="building-specific-panel__actions">
            <button className="building-interaction__action" disabled={!ready} onClick={harvest}>수확</button>
            <button className="building-specific-panel__ghost-button" onClick={cancelCrop}>작물 정리</button>
          </div>
        </>
      ) : (
        <div className="building-specific-panel__actions">
          <button className="building-interaction__action" disabled={getInventoryAmount(inventory, "berry") <= 0} onClick={() => plant("berry")}>열매 심기</button>
          <button className="building-interaction__action" disabled={getInventoryAmount(inventory, "herb") <= 0} onClick={() => plant("herb")}>약초 심기</button>
        </div>
      )}
    </div>
  );
}

function BaseCorePanel({ building }: BuildingSpecificPanelProps) {
  const [baseState, setBaseState] = useState(() => readBaseCoreState(building.id));
  const [draftName, setDraftName] = useState(baseState.baseName);

  const saveName = () => {
    const next = { ...baseState, baseName: draftName.trim() || "나의 거점" };
    setBaseState(next);
    writeBaseCoreState(building.id, next);
  };

  const bindSpawn = () => {
    const next = { ...baseState, spawnBound: true };
    setBaseState(next);
    writeBaseCoreState(building.id, next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("palpalworld.base.spawnBuildingId", building.id);
      window.localStorage.setItem("palpalworld.base.spawnPosition", JSON.stringify(building.position));
    }
  };

  const addWorkerSlot = () => {
    const next = { ...baseState, workerSlots: Math.min(6, baseState.workerSlots + 1) };
    setBaseState(next);
    writeBaseCoreState(building.id, next);
  };

  return (
    <div className="building-specific-panel building-specific-panel--base-core">
      <label className="building-specific-panel__field">
        <span>거점 이름</span>
        <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={16} />
      </label>
      <div className="building-specific-panel__summary">
        <span>귀환 지점</span><b>{baseState.spawnBound ? "등록됨" : "미등록"}</b>
        <span>작업 슬롯</span><b>{baseState.workerSlots} / 6</b>
        <span>위치</span><b>{Math.round(building.position.x)}, {Math.round(building.position.y)}</b>
      </div>
      <div className="building-specific-panel__actions">
        <button className="building-interaction__action" onClick={saveName}>이름 저장</button>
        <button className="building-interaction__action" onClick={bindSpawn}>귀환 지점 등록</button>
        <button className="building-interaction__action" disabled={baseState.workerSlots >= 6} onClick={addWorkerSlot}>작업 슬롯 확장</button>
      </div>
      <p className="feature-panel__hint">추후 거점 몬스터 배치, 공유 권한, 자동화 전력망을 이 코어에 연결할 수 있습니다.</p>
    </div>
  );
}

function GeneratorPanel({ building, inventory, onInventoryChange }: BuildingSpecificPanelProps) {
  const [generatorState, setGeneratorState] = useState(() => readGeneratorState(building.id));
  const chargeWithCoal = () => {
    if (getInventoryAmount(inventory, "coal") <= 0) return;
    onInventoryChange(removeInventoryStack(inventory, "coal", 1));
    const next = {
      storedPower: Math.min(100, generatorState.storedPower + 25),
      lastChargedAt: Date.now(),
    };
    setGeneratorState(next);
    writeGeneratorState(building.id, next);
  };

  const consumePower = () => {
    const next = { ...generatorState, storedPower: Math.max(0, generatorState.storedPower - 10) };
    setGeneratorState(next);
    writeGeneratorState(building.id, next);
  };

  return (
    <div className="building-specific-panel building-specific-panel--generator">
      <div className="building-specific-panel__summary">
        <span>전력</span><b>{generatorState.storedPower} / 100</b>
        <span>연료</span><b>{getInventoryAmount(inventory, "coal")} {getItemLabel("coal")}</b>
      </div>
      <div className="building-specific-progress building-specific-progress--power"><i style={{ width: `${generatorState.storedPower}%` }} /></div>
      <div className="building-specific-panel__actions">
        <button className="building-interaction__action" disabled={getInventoryAmount(inventory, "coal") <= 0 || generatorState.storedPower >= 100} onClick={chargeWithCoal}>석탄 투입</button>
        <button className="building-specific-panel__ghost-button" disabled={generatorState.storedPower <= 0} onClick={consumePower}>전력 테스트</button>
      </div>
      <p className="feature-panel__hint">현재는 전력 저장량을 관리합니다. 다음 단계에서 냉장고, 조립대, 자동화 시설과 연결할 수 있습니다.</p>
    </div>
  );
}

function GuardTowerPanel({ building }: BuildingSpecificPanelProps) {
  const [towerState, setTowerState] = useState(() => readGuardTowerState(building.id));
  const updateMode = (mode: GuardTowerState["mode"]) => {
    const next = { mode };
    setTowerState(next);
    writeGuardTowerState(building.id, next);
  };

  return (
    <div className="building-specific-panel building-specific-panel--guard-tower">
      <div className="building-specific-panel__summary">
        <span>현재 모드</span><b>{towerState.mode === "passive" ? "대기" : towerState.mode === "watch" ? "감시" : "방어"}</b>
        <span>감시 범위</span><b>주변 320</b>
      </div>
      <div className="building-specific-panel__actions">
        <button className="building-interaction__action" onClick={() => updateMode("passive")}>대기</button>
        <button className="building-interaction__action" onClick={() => updateMode("watch")}>감시</button>
        <button className="building-interaction__action" onClick={() => updateMode("defense")}>방어</button>
      </div>
      <p className="feature-panel__hint">현재는 감시탑 상태를 저장합니다. 이후 몬스터 접근 알림, 거점 습격, 자동 사격으로 확장할 수 있습니다.</p>
    </div>
  );
}

function PalBedPanel({ building }: BuildingSpecificPanelProps) {
  return (
    <div className="building-specific-panel building-specific-panel--comfort">
      <div className="building-specific-panel__summary">
        <span>상태</span><b>휴식 가능</b>
        <span>건물</span><b>{getBuildingDisplayName(building)}</b>
      </div>
      <p className="feature-panel__hint">펄 침대는 거점 몬스터 회복/피로도 시스템이 추가되면 회복 슬롯 UI로 확장됩니다.</p>
    </div>
  );
}

function StructurePanel({ building }: BuildingSpecificPanelProps) {
  return (
    <div className="building-specific-panel building-specific-panel--structure">
      <div className="building-specific-panel__summary">
        <span>구조물</span><b>{getBuildingDisplayName(building)}</b>
        <span>좌표</span><b>{Math.round(building.position.x)}, {Math.round(building.position.y)}</b>
      </div>
      <p className="feature-panel__hint">바닥/벽은 건축 편집 모드에서 회전, 스냅, 일괄 철거 기능과 함께 확장하는 것이 좋습니다.</p>
    </div>
  );
}

function UnknownBuildingPanel({ building }: BuildingSpecificPanelProps) {
  return (
    <div className="building-specific-panel">
      <div className="building-specific-panel__summary">
        <span>건물 타입</span><b>{String(building.type)}</b>
      </div>
      <p className="feature-panel__hint">아직 전용 상호작용이 없는 건설물입니다.</p>
    </div>
  );
}

export function BuildingSpecificPanel(props: BuildingSpecificPanelProps) {
  switch (String(props.building.type)) {
    case "base_core": return <BaseCorePanel {...props} />;
    case "farm_plot": return <FarmPlotPanel {...props} />;
    case "power_generator": return <GeneratorPanel {...props} />;
    case "guard_tower": return <GuardTowerPanel {...props} />;
    case "pal_bed": return <PalBedPanel {...props} />;
    case "wood_floor":
    case "wood_wall": return <StructurePanel {...props} />;
    default: return <UnknownBuildingPanel {...props} />;
  }
}
