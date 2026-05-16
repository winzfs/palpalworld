"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, clampPositionToTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import {
  broadcastCreaturePositions,
  createCreatureBroadcastChannel,
  type CreaturePositionsBroadcastPayload,
} from "../multiplayer/supabaseCreatureBroadcast";
import {
  claimWorldHost,
  fetchOnlinePlayers,
  getOrCreateMultiplayerPlayerId,
  getSupabaseClient,
  isSupabaseMultiplayerEnabled,
  subscribeOnlinePlayers,
  upsertLocalPresence,
} from "../multiplayer/supabaseMultiplayer";
import { fetchWorldBuildings, subscribeWorldBuildings } from "../multiplayer/supabaseWorldBuildings";
import {
  fetchWorldCreatures,
  rowToCreature,
  seedMissingWorldCreatures,
  updateWorldCreaturePositions,
  subscribeWorldCreatures,
} from "../multiplayer/supabaseWorldCreatures";
import {
  fetchWorldResources,
  subscribeWorldResources,
  upsertWorldResources,
  type WorldResourceRow,
} from "../multiplayer/supabaseWorldResources";
import { createTileBasedDemoCreatures, createTileBasedDemoResources } from "./demoWorldSpawns";
import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";
import { PixiGameCanvas } from "./pixi/PixiGameCanvas";

const localPlayerMoveSpeed = 180;
const presencePublishMs = 450;
const hostClaimMs = 2200;
const creatureBroadcastMs = 250;
const creatureSnapshotSaveMs = 8000;
const simulationMs = 50;
const creatureMapMin = 120;
const creatureMapMax = 2880;
const creatureMapSize = creatureMapMax - creatureMapMin;

type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };
const creatureWanderTargets = new Map<string, CreatureWanderTarget>();

function createClientNickname() {
  if (typeof window === "undefined") return "Player";
  const key = "palpalworld.nickname";
  const savedNickname = window.localStorage.getItem(key);
  if (savedNickname) return savedNickname;
  const nextNickname = `Pal-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem(key, nextNickname);
  return nextNickname;
}

function directionFromMovement(input: Vector2, fallback: Direction): Direction {
  if (Math.abs(input.x) < 0.08 && Math.abs(input.y) < 0.08) return fallback;
  if (Math.abs(input.x) >= Math.abs(input.y)) return input.x >= 0 ? "right" : "left";
  return input.y >= 0 ? "down" : "up";
}

function hashId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100_000;
  return hash;
}

function random01(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getCreatureMoveSpeed(speciesId: string) {
  if (speciesId === "breezewing") return 74;
  if (speciesId === "sparkit") return 46;
  if (speciesId === "leafbun") return 38;
  if (speciesId === "droplet") return 24;
  if (speciesId === "moleminer") return 28;
  if (speciesId === "mossboar") return 34;
  if (speciesId === "rockturtle") return 14;
  return 26;
}

function clampCreaturePosition(position: Vector2): Vector2 {
  return {
    x: Math.max(creatureMapMin, Math.min(creatureMapMax, position.x)),
    y: Math.max(creatureMapMin, Math.min(creatureMapMax, position.y)),
  };
}

function createWanderTarget(creature: CreaturePublicState, now: number): CreatureWanderTarget {
  const seed = hashId(creature.id);
  const retargetIndex = Math.floor(now / (7200 + (seed % 5200)));
  const angleSeed = seed + retargetIndex * 7919 + creature.level * 97;
  const radiusSeed = seed * 3 + retargetIndex * 3571 + creature.level * 131;
  const angle = random01(angleSeed) * Math.PI * 2;
  const radius = Math.sqrt(random01(radiusSeed));
  const orbit = 0.5 + radius * 0.5;
  return {
    x: Math.max(creatureMapMin, Math.min(creatureMapMax, 1500 + Math.cos(angle) * creatureMapSize * 0.5 * orbit)),
    y: Math.max(creatureMapMin, Math.min(creatureMapMax, 1500 + Math.sin(angle) * creatureMapSize * 0.5 * orbit)),
    nextRetargetAt: now + 7800 + (seed % 9000),
  };
}

function getWanderTarget(creature: CreaturePublicState, now: number): CreatureWanderTarget {
  const current = creatureWanderTargets.get(creature.id);
  const distanceToTarget = current ? Math.hypot(current.x - creature.position.x, current.y - creature.position.y) : Number.POSITIVE_INFINITY;
  if (!current || now >= current.nextRetargetAt || distanceToTarget < 64) {
    const next = createWanderTarget(creature, now);
    creatureWanderTargets.set(creature.id, next);
    return next;
  }
  return current;
}

function moveHostCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2) {
  for (const creature of creatures) {
    if (creature.hp <= 0) continue;
    const target = getWanderTarget(creature, now);
    const speed = getCreatureMoveSpeed(creature.speciesId);
    const dxToTarget = target.x - creature.position.x;
    const dyToTarget = target.y - creature.position.y;
    const dxFromPlayer = creature.position.x - playerPosition.x;
    const dyFromPlayer = creature.position.y - playerPosition.y;
    const playerDistance = Math.hypot(dxFromPlayer, dyFromPlayer);
    let moveX = dxToTarget;
    let moveY = dyToTarget;
    if (playerDistance > 0 && playerDistance < 130) {
      const fleeStrength = (130 - playerDistance) / 130;
      moveX += (dxFromPlayer / playerDistance) * 520 * fleeStrength;
      moveY += (dyFromPlayer / playerDistance) * 520 * fleeStrength;
    }
    const drift = Math.sin(now / 1200 + hashId(creature.id)) * 0.12;
    const angle = Math.atan2(moveY, moveX) + drift;
    const next = clampCreaturePosition(clampPositionToTile({
      x: creature.position.x + Math.cos(angle) * speed * deltaSeconds,
      y: creature.position.y + Math.sin(angle) * speed * deltaSeconds,
    }));
    creature.position.x = next.x;
    creature.position.y = next.y;
  }
}

function rowToResource(row: WorldResourceRow): ResourceNodeState {
  return {
    id: row.resource_id,
    resourceType: row.resource_type,
    position: { x: row.x, y: row.y },
    currentTile: { regionId: row.region_id, tileX: row.tile_x, tileY: row.tile_y },
    remainingAmount: row.depleted ? 0 : row.remaining_amount,
    maxAmount: row.max_amount,
  } as ResourceNodeState;
}

function createLocalPlayer(playerId: string, nickname: string, position: Vector2, direction: Direction, currentTile: MapTileRef): PlayerPublicState {
  return {
    id: playerId,
    nickname,
    position: { ...position },
    direction,
    currentTile: { ...currentTile },
    hp: 100,
    maxHp: 100,
  } as PlayerPublicState;
}

function createWorldSnapshot({
  playerId,
  nickname,
  position,
  direction,
  currentTile,
  onlinePlayers,
  creatures,
  resources,
  buildings,
}: {
  playerId: string;
  nickname: string;
  position: Vector2;
  direction: Direction;
  currentTile: MapTileRef;
  onlinePlayers: PlayerPublicState[];
  creatures: CreaturePublicState[];
  resources: ResourceNodeState[];
  buildings: BuildingState[];
}): WorldSnapshot {
  return {
    worldId: "supabase-world",
    serverTime: Date.now(),
    players: [createLocalPlayer(playerId, nickname, position, direction, currentTile), ...onlinePlayers],
    creatures,
    resources,
    buildings,
  };
}

function isSameTile(a: MapTileRef, b: MapTileRef) {
  return a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY;
}

export function GameClientSupabaseWorld() {
  const client = useMemo(() => getSupabaseClient(), []);
  const enabled = Boolean(client) && isSupabaseMultiplayerEnabled();
  const [playerId] = useState(getOrCreateMultiplayerPlayerId);
  const [nickname] = useState(createClientNickname);
  const [currentTile, setCurrentTile] = useState<MapTileRef>({ ...DEFAULT_PLAYER_TILE });
  const [playerPosition, setPlayerPosition] = useState<Vector2>({ x: 1500, y: 1500 });
  const [playerDirection, setPlayerDirection] = useState<Direction>("down");
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPublicState[]>([]);
  const [resources, setResources] = useState<ResourceNodeState[]>([]);
  const [creatures, setCreatures] = useState<CreaturePublicState[]>([]);
  const [buildings, setBuildings] = useState<BuildingState[]>([]);
  const [status, setStatus] = useState(enabled ? "Supabase Broadcast 월드 연결 중" : "Supabase 설정 없음");
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const positionRef = useRef<Vector2>({ x: 1500, y: 1500 });
  const directionRef = useRef<Direction>("down");
  const tileRef = useRef<MapTileRef>({ ...DEFAULT_PLAYER_TILE });
  const creaturesRef = useRef<CreaturePublicState[]>([]);
  const isHostRef = useRef(false);
  const lastHostClaimAtRef = useRef(0);
  const lastBroadcastAtRef = useRef(0);
  const lastSnapshotSaveAtRef = useRef(0);

  const snapshot = useMemo(() => createWorldSnapshot({
    playerId,
    nickname,
    position: playerPosition,
    direction: playerDirection,
    currentTile,
    onlinePlayers,
    creatures,
    resources,
    buildings,
  }), [buildings, creatures, currentTile, nickname, onlinePlayers, playerDirection, playerId, playerPosition, resources]);

  const applySnapshot = useCallback((nextSnapshot: WorldSnapshot) => {
    sceneRef.current?.applySnapshot(nextSnapshot, playerId);
    window.dispatchEvent(new CustomEvent("palpalworld:world_snapshot", { detail: { snapshot: nextSnapshot, localPlayerId: playerId } }));
  }, [playerId]);

  useEffect(() => {
    creaturesRef.current = creatures;
    applySnapshot(snapshot);
  }, [applySnapshot, creatures, snapshot]);

  const refreshWorld = useCallback(async () => {
    if (!client) return;
    const tile = tileRef.current;
    const [resourceRows, creatureRows, worldBuildings, players] = await Promise.all([
      fetchWorldResources(client, tile),
      fetchWorldCreatures(client, tile),
      fetchWorldBuildings(client, tile),
      fetchOnlinePlayers(client, playerId),
    ]);

    if (resourceRows.length <= 0) {
      const seedResources = createTileBasedDemoResources().filter((resource) => {
        const resourceTile = (resource as { currentTile?: MapTileRef }).currentTile;
        return resourceTile && isSameTile(resourceTile, tile);
      });
      await upsertWorldResources(client, seedResources);
      const seededRows = await fetchWorldResources(client, tile);
      setResources(seededRows.map(rowToResource));
    } else {
      setResources(resourceRows.map(rowToResource));
    }

    if (creatureRows.length <= 0) {
      const seedCreatures = createTileBasedDemoCreatures().filter((creature) => {
        const creatureTile = (creature as { currentTile?: MapTileRef }).currentTile;
        return creatureTile && isSameTile(creatureTile, tile);
      });
      await seedMissingWorldCreatures(client, seedCreatures);
      const seededRows = await fetchWorldCreatures(client, tile);
      const nextCreatures = seededRows.map(rowToCreature);
      creaturesRef.current = nextCreatures;
      setCreatures(nextCreatures);
    } else {
      const nextCreatures = creatureRows.map(rowToCreature);
      creaturesRef.current = nextCreatures;
      setCreatures(nextCreatures);
    }

    setBuildings(worldBuildings as BuildingState[]);
    setOnlinePlayers(players);
    setStatus(`${isHostRef.current ? "HOST" : "CLIENT"} · 자원 ${resourceRows.length} · 몬스터 ${creatureRows.length} · 건물 ${worldBuildings.length}`);
  }, [client, playerId]);

  const handleCreatureBroadcast = useCallback((payload: CreaturePositionsBroadcastPayload) => {
    if (payload.hostId === playerId) return;
    if (!isSameTile(payload.tile, tileRef.current)) return;
    const byId = new Map(creaturesRef.current.map((creature) => [creature.id, creature]));
    let changed = false;
    for (const packet of payload.creatures) {
      const creature = byId.get(packet.id);
      if (!creature) continue;
      creature.position.x = packet.x;
      creature.position.y = packet.y;
      creature.hp = packet.hp;
      creature.maxHp = packet.maxHp;
      changed = true;
    }
    if (!changed) return;
    const nextCreatures = [...creaturesRef.current];
    creaturesRef.current = nextCreatures;
    setCreatures(nextCreatures);
  }, [playerId]);

  useEffect(() => {
    if (!client || !enabled) return;
    void refreshWorld();
    const creatureChannel = subscribeWorldCreatures(client, () => void refreshWorld());
    const resourceChannel = subscribeWorldResources(client, () => void refreshWorld());
    const buildingChannel = subscribeWorldBuildings(client, () => void refreshWorld());
    const playerChannel = subscribeOnlinePlayers(client, () => void refreshWorld());
    const broadcastChannel = createCreatureBroadcastChannel(client, tileRef.current, handleCreatureBroadcast);
    const refreshInterval = window.setInterval(() => void refreshWorld(), 5000);
    return () => {
      window.clearInterval(refreshInterval);
      client.removeChannel(creatureChannel);
      client.removeChannel(resourceChannel);
      client.removeChannel(buildingChannel);
      client.removeChannel(playerChannel);
      client.removeChannel(broadcastChannel);
    };
  }, [client, enabled, handleCreatureBroadcast, refreshWorld]);

  useEffect(() => {
    if (!client || !enabled) return;
    const publishPresence = () => {
      void upsertLocalPresence(client, {
        playerId,
        nickname,
        position: positionRef.current,
        direction: directionRef.current,
        currentTile: tileRef.current,
      });
    };
    publishPresence();
    const interval = window.setInterval(publishPresence, presencePublishMs);
    return () => window.clearInterval(interval);
  }, [client, enabled, nickname, playerId]);

  useEffect(() => {
    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      const input = inputRef.current;
      const length = Math.hypot(input.x, input.y) || 1;
      const normalized = length > 1 ? { x: input.x / length, y: input.y / length } : input;
      const nextDirection = directionFromMovement(normalized, directionRef.current);
      const nextPosition = clampPositionToTile({
        x: positionRef.current.x + normalized.x * localPlayerMoveSpeed * deltaSeconds,
        y: positionRef.current.y + normalized.y * localPlayerMoveSpeed * deltaSeconds,
      });
      directionRef.current = nextDirection;
      positionRef.current = nextPosition;
      setPlayerDirection(nextDirection);
      setPlayerPosition(nextPosition);

      if (!client || !enabled) return;
      if (now - lastHostClaimAtRef.current >= hostClaimMs) {
        lastHostClaimAtRef.current = now;
        void claimWorldHost(client, playerId, tileRef.current).then((result) => {
          isHostRef.current = result.isHost;
          setStatus(`${result.isHost ? "HOST" : "CLIENT"} · host ${result.hostPlayerId ?? "none"}`);
        });
      }

      if (!isHostRef.current) return;
      moveHostCreatures(creaturesRef.current, deltaSeconds, now, positionRef.current);
      const nextCreatures = [...creaturesRef.current];
      creaturesRef.current = nextCreatures;
      setCreatures(nextCreatures);

      if (now - lastBroadcastAtRef.current >= creatureBroadcastMs) {
        lastBroadcastAtRef.current = now;
        const channel = createCreatureBroadcastChannel(client, tileRef.current, () => undefined);
        void broadcastCreaturePositions({ channel, hostId: playerId, tile: tileRef.current, creatures: creaturesRef.current })
          .finally(() => client.removeChannel(channel));
      }
      if (now - lastSnapshotSaveAtRef.current >= creatureSnapshotSaveMs) {
        lastSnapshotSaveAtRef.current = now;
        void updateWorldCreaturePositions(client, creaturesRef.current);
      }
    }, simulationMs);
    return () => window.clearInterval(interval);
  }, [client, enabled, playerId]);

  const handleSceneReady = useCallback((scene: GameWorldScene) => {
    sceneRef.current = scene;
    scene.applySnapshot(snapshot, playerId);
  }, [playerId, snapshot]);

  const handleInputChange = useCallback((input: GameSceneInput) => {
    inputRef.current = input;
  }, []);

  const handleInteract = useCallback(() => {
    setStatus("채집/상호작용은 Supabase RPC 연결 단계에서 진행 예정");
  }, []);

  const handleWorldClick = useCallback((target: WorldClickTarget) => {
    if (target.kind === "creature") setStatus("공격은 Supabase RPC 연결 단계에서 진행 예정");
  }, []);

  return (
    <main className="game-shell game-shell--pixi-stage game-shell--supabase-world">
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleInteract} onWorldClick={handleWorldClick} />
      <PixiGameCanvas enabled={true} snapshot={snapshot} localPlayerId={playerId} />
      <div className="supabase-world-status" aria-label="Supabase world status">{status}</div>
    </main>
  );
}
