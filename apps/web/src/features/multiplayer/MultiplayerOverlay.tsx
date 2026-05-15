"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuildingState, CreaturePublicState, PlayerPublicState, WorldSnapshot } from "@palpalworld/shared";
import { MAP_TILE_SIZE, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import {
  fetchOnlinePlayers,
  getOrCreateMultiplayerPlayerId,
  getSupabaseClient,
  isSupabaseMultiplayerEnabled,
  subscribeOnlinePlayers,
  upsertLocalPresence,
} from "./supabaseMultiplayer";
import {
  fetchWorldBuildings,
  markWorldBuildingDeleted,
  subscribeWorldBuildings,
  upsertWorldBuilding,
} from "./supabaseWorldBuildings";
import {
  dispatchRemoteCreatureState,
  fetchWorldCreatures,
  subscribeWorldCreatures,
  upsertWorldCreatures,
} from "./supabaseWorldCreatures";

type WorldSnapshotEvent = CustomEvent<{ snapshot?: WorldSnapshot; localPlayerId?: string | null }>;
type BuildingDismantledEvent = CustomEvent<{ buildingId?: string; building?: BuildingState }>;

type CameraState = {
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  currentTile: MapTileRef;
};

function computeCamera(player: PlayerPublicState): CameraState {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const height = typeof window === "undefined" ? 720 : window.innerHeight;
  return {
    width,
    height,
    cameraX: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - width), player.position.x - width / 2)),
    cameraY: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - height), player.position.y - height / 2)),
    currentTile: player.currentTile as MapTileRef,
  };
}

function shouldShareBuilding(building: BuildingState) {
  return building.id.startsWith("demo-building-");
}

function getSharedBuildingIcon(type: string) {
  if (type === "storage_box") return "📦";
  if (type === "workbench") return "🛠";
  if (type === "campfire") return "🔥";
  if (type === "base_core") return "🏠";
  if (type === "farm_plot") return "🌱";
  if (type === "cold_storage") return "🧊";
  return "🏗";
}

export function MultiplayerOverlay() {
  const [enabled] = useState(() => isSupabaseMultiplayerEnabled());
  const [playerId] = useState(() => getOrCreateMultiplayerPlayerId());
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPublicState[]>([]);
  const [worldBuildings, setWorldBuildings] = useState<BuildingState[]>([]);
  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");
  const latestLocalPlayerRef = useRef<PlayerPublicState | null>(null);
  const latestTileRef = useRef<MapTileRef | null>(null);
  const latestCreaturesRef = useRef<CreaturePublicState[]>([]);
  const onlinePlayersRef = useRef<PlayerPublicState[]>([]);
  const localBuildingIdsRef = useRef(new Set<string>());
  const publishedBuildingIdsRef = useRef(new Set<string>());
  const lastCreaturePublishAtRef = useRef(0);
  const client = useMemo(() => getSupabaseClient(), []);

  const refreshPlayers = useCallback(async () => {
    if (!client) return;
    const players = await fetchOnlinePlayers(client, playerId);
    onlinePlayersRef.current = players;
    setOnlinePlayers(players);
    setStatus(players.length > 0 ? `온라인 ${players.length + 1}명` : "온라인 1명");
  }, [client, playerId]);

  const refreshBuildings = useCallback(async () => {
    if (!client) return;
    const buildings = await fetchWorldBuildings(client, latestTileRef.current);
    setWorldBuildings(buildings);
  }, [client]);

  const refreshCreatures = useCallback(async () => {
    if (!client) return;
    const rows = await fetchWorldCreatures(client, latestTileRef.current);
    dispatchRemoteCreatureState(rows);
  }, [client]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshPlayers();
    const playerChannel = subscribeOnlinePlayers(client, refreshPlayers);
    const interval = window.setInterval(refreshPlayers, 2500);
    return () => {
      window.clearInterval(interval);
      client.removeChannel(playerChannel);
    };
  }, [client, enabled, refreshPlayers]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshBuildings();
    const buildingChannel = subscribeWorldBuildings(client, refreshBuildings);
    const interval = window.setInterval(refreshBuildings, 3000);
    return () => {
      window.clearInterval(interval);
      client.removeChannel(buildingChannel);
    };
  }, [client, enabled, refreshBuildings]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshCreatures();
    const creatureChannel = subscribeWorldCreatures(client, refreshCreatures);
    const interval = window.setInterval(refreshCreatures, 1800);
    return () => {
      window.clearInterval(interval);
      client.removeChannel(creatureChannel);
    };
  }, [client, enabled, refreshCreatures]);

  useEffect(() => {
    if (!client || !enabled) return;
    const publish = async () => {
      const localPlayer = latestLocalPlayerRef.current;
      if (!localPlayer) return;
      await upsertLocalPresence(client, {
        playerId,
        nickname: localPlayer.nickname,
        position: localPlayer.position,
        direction: localPlayer.direction,
        currentTile: localPlayer.currentTile as MapTileRef,
      });
    };
    const interval = window.setInterval(publish, 450);
    return () => window.clearInterval(interval);
  }, [client, enabled, playerId]);

  useEffect(() => {
    if (!client || !enabled) return;
    const publishCreatures = async () => {
      const now = performance.now();
      if (now - lastCreaturePublishAtRef.current < 1000) return;
      lastCreaturePublishAtRef.current = now;
      const creatures = latestCreaturesRef.current;
      if (creatures.length === 0) return;
      await upsertWorldCreatures(client, creatures);
    };
    const interval = window.setInterval(publishCreatures, 1000);
    return () => window.clearInterval(interval);
  }, [client, enabled]);

  useEffect(() => {
    const handleSnapshot = (event: Event) => {
      const customEvent = event as WorldSnapshotEvent;
      const snapshot = customEvent.detail?.snapshot;
      if (!snapshot) return;
      const localPlayer = snapshot.players[0];
      if (!localPlayer) return;
      latestLocalPlayerRef.current = localPlayer;
      latestTileRef.current = localPlayer.currentTile as MapTileRef;
      latestCreaturesRef.current = snapshot.creatures;
      setCamera(computeCamera(localPlayer));

      if (client && enabled) {
        for (const building of snapshot.buildings) {
          if (!shouldShareBuilding(building)) continue;
          localBuildingIdsRef.current.add(building.id);
          if (publishedBuildingIdsRef.current.has(building.id)) continue;
          publishedBuildingIdsRef.current.add(building.id);
          void upsertWorldBuilding(client, building);
        }
      }
    };
    const handleResize = () => {
      const localPlayer = latestLocalPlayerRef.current;
      if (localPlayer) setCamera(computeCamera(localPlayer));
    };
    window.addEventListener("palpalworld:world_snapshot", handleSnapshot);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("palpalworld:world_snapshot", handleSnapshot);
      window.removeEventListener("resize", handleResize);
    };
  }, [client, enabled]);

  useEffect(() => {
    if (!client || !enabled) return;
    const handleDismantled = (event: Event) => {
      const customEvent = event as BuildingDismantledEvent;
      const buildingId = customEvent.detail?.buildingId;
      if (!buildingId) return;
      localBuildingIdsRef.current.delete(buildingId);
      publishedBuildingIdsRef.current.delete(buildingId);
      setWorldBuildings((current) => current.filter((building) => building.id !== buildingId));
      void markWorldBuildingDeleted(client, buildingId).then(refreshBuildings);
    };
    window.addEventListener("palpalworld:building-dismantled", handleDismantled);
    return () => window.removeEventListener("palpalworld:building-dismantled", handleDismantled);
  }, [client, enabled, refreshBuildings]);

  const visiblePlayers = useMemo(() => {
    if (!camera) return [];
    return onlinePlayers.filter((player) => isSameTile(player.currentTile as MapTileRef, camera.currentTile));
  }, [camera, onlinePlayers]);

  const visibleSharedBuildings = useMemo(() => {
    if (!camera) return [];
    return worldBuildings.filter((building) => {
      if (localBuildingIdsRef.current.has(building.id)) return false;
      const tile = (building as { currentTile?: MapTileRef }).currentTile;
      return isSameTile(tile, camera.currentTile);
    });
  }, [camera, worldBuildings]);

  if (!enabled || !camera) return null;

  return (
    <div className="multiplayer-overlay" aria-label="멀티플레이어 오버레이">
      <div className="multiplayer-status">{status}</div>
      {visibleSharedBuildings.map((building) => {
        const left = building.position.x - camera.cameraX;
        const top = building.position.y - camera.cameraY;
        if (left < -100 || left > camera.width + 100 || top < -120 || top > camera.height + 100) return null;
        return (
          <div key={building.id} className="multiplayer-building" style={{ left, top }}>
            <div className="multiplayer-building__sprite">{getSharedBuildingIcon(String(building.type))}</div>
            <div className="multiplayer-building__label">공유 건물</div>
          </div>
        );
      })}
      {visiblePlayers.map((player) => {
        const left = player.position.x - camera.cameraX;
        const top = player.position.y - camera.cameraY;
        if (left < -80 || left > camera.width + 80 || top < -100 || top > camera.height + 80) return null;
        return (
          <div key={player.id} className="multiplayer-player" style={{ left, top }}>
            <div className={`multiplayer-player__avatar multiplayer-player__avatar--${player.direction ?? "down"}`}>
              <span className="multiplayer-player__head" />
              <span className="multiplayer-player__body" />
            </div>
            <div className="multiplayer-player__name">{player.nickname}</div>
          </div>
        );
      })}
    </div>
  );
}
