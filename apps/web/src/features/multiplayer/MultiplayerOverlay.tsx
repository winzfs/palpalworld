"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
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
  type WorldCreatureRow,
} from "./supabaseWorldCreatures";
import {
  dispatchRemoteResourceState,
  fetchWorldResources,
  subscribeWorldResources,
  upsertWorldResources,
  type WorldResourceRow,
} from "./supabaseWorldResources";
import {
  createOptimisticChatMessage,
  fetchWorldChatMessages,
  isSameChatTile,
  sendWorldChatMessage,
  subscribeWorldChatMessages,
  type WorldChatMessageRow,
} from "./supabaseWorldChat";

type WorldSnapshotEvent = CustomEvent<{ snapshot?: WorldSnapshot; localPlayerId?: string | null }>;
type BuildingDismantledEvent = CustomEvent<{ buildingId?: string; building?: BuildingState }>;

type CameraState = {
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  currentTile: MapTileRef;
};

const emotes = ["👋", "❤️", "⚔️", "🆘"];
const chatBubbleVisibleMs = 12_000;

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

function appendChatMessage(current: WorldChatMessageRow[], message: WorldChatMessageRow) {
  const withoutDuplicate = current.filter((existing) => {
    if (existing.message_id === message.message_id) return false;
    const isLocalEcho = existing.message_id.startsWith("local-")
      && existing.player_id === message.player_id
      && existing.message === message.message
      && Math.abs(new Date(existing.created_at).getTime() - new Date(message.created_at).getTime()) < 10_000;
    return !isLocalEcho;
  });
  return [...withoutDuplicate, message]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-30);
}

function applyRemoteCreatureRows(localCreatures: CreaturePublicState[], rows: WorldCreatureRow[]) {
  if (localCreatures.length === 0 || rows.length === 0) return false;
  const rowById = new Map(rows.map((row) => [row.creature_id, row]));
  let changed = false;
  for (const creature of localCreatures) {
    const row = rowById.get(creature.id);
    if (!row) continue;
    const remoteHp = row.defeated ? 0 : Math.max(0, Math.min(row.hp, row.max_hp));
    if (remoteHp < creature.hp) { creature.hp = remoteHp; changed = true; }
    if (row.defeated && creature.hp !== 0) { creature.hp = 0; changed = true; }
  }
  return changed;
}

function applyRemoteResourceRows(localResources: ResourceNodeState[], rows: WorldResourceRow[]) {
  if (localResources.length === 0 || rows.length === 0) return false;
  const rowById = new Map(rows.map((row) => [row.resource_id, row]));
  let changed = false;
  for (const resource of localResources) {
    const row = rowById.get(resource.id);
    if (!row) continue;
    const remoteAmount = row.depleted ? 0 : Math.max(0, Math.min(row.remaining_amount, row.max_amount));
    if (remoteAmount < resource.remainingAmount) { resource.remainingAmount = remoteAmount; changed = true; }
    if (row.depleted && resource.remainingAmount !== 0) { resource.remainingAmount = 0; changed = true; }
  }
  return changed;
}

function isFreshMessage(message: WorldChatMessageRow) {
  return Date.now() - new Date(message.created_at).getTime() < chatBubbleVisibleMs;
}

export function MultiplayerOverlay() {
  const [enabled] = useState(() => isSupabaseMultiplayerEnabled());
  const [playerId] = useState(() => getOrCreateMultiplayerPlayerId());
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPublicState[]>([]);
  const [worldBuildings, setWorldBuildings] = useState<BuildingState[]>([]);
  const [chatMessages, setChatMessages] = useState<WorldChatMessageRow[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");
  const latestLocalPlayerRef = useRef<PlayerPublicState | null>(null);
  const latestTileRef = useRef<MapTileRef | null>(null);
  const latestCreaturesRef = useRef<CreaturePublicState[]>([]);
  const latestResourcesRef = useRef<ResourceNodeState[]>([]);
  const onlinePlayersRef = useRef<PlayerPublicState[]>([]);
  const localBuildingIdsRef = useRef(new Set<string>());
  const publishedBuildingIdsRef = useRef(new Set<string>());
  const lastCreaturePublishAtRef = useRef(0);
  const lastResourcePublishAtRef = useRef(0);
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
    setWorldBuildings(await fetchWorldBuildings(client, latestTileRef.current));
  }, [client]);

  const refreshCreatures = useCallback(async () => {
    if (!client) return;
    const rows = await fetchWorldCreatures(client, latestTileRef.current);
    const changed = applyRemoteCreatureRows(latestCreaturesRef.current, rows);
    dispatchRemoteCreatureState(rows);
    if (changed) window.dispatchEvent(new CustomEvent("palpalworld:remote-creatures-applied"));
  }, [client]);

  const refreshResources = useCallback(async () => {
    if (!client) return;
    const rows = await fetchWorldResources(client, latestTileRef.current);
    const changed = applyRemoteResourceRows(latestResourcesRef.current, rows);
    dispatchRemoteResourceState(rows);
    if (changed) window.dispatchEvent(new CustomEvent("palpalworld:remote-resources-applied"));
  }, [client]);

  const refreshChat = useCallback(async () => {
    if (!client) return;
    const messages = await fetchWorldChatMessages(client, latestTileRef.current);
    setChatMessages(messages.slice(-30));
  }, [client]);

  const sendChat = useCallback(async (message: string, messageType: "chat" | "emote" = "chat") => {
    if (!client) return;
    const localPlayer = latestLocalPlayerRef.current;
    const tile = latestTileRef.current;
    if (!localPlayer || !tile) return;
    const input = {
      playerId,
      nickname: localPlayer.nickname,
      message,
      messageType,
      position: localPlayer.position,
      direction: localPlayer.direction,
      currentTile: tile,
    };
    const optimisticMessage = createOptimisticChatMessage(input);
    setChatMessages((current) => appendChatMessage(current, optimisticMessage));
    const savedMessage = await sendWorldChatMessage(client, input);
    if (savedMessage) setChatMessages((current) => appendChatMessage(current, savedMessage));
  }, [client, playerId]);

  const handleSubmitChat = useCallback((event: FormEvent) => {
    event.preventDefault();
    const next = chatInput.trim();
    if (!next) return;
    setChatInput("");
    void sendChat(next, "chat");
  }, [chatInput, sendChat]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshPlayers();
    const playerChannel = subscribeOnlinePlayers(client, refreshPlayers);
    const interval = window.setInterval(refreshPlayers, 2500);
    return () => { window.clearInterval(interval); client.removeChannel(playerChannel); };
  }, [client, enabled, refreshPlayers]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshBuildings();
    const buildingChannel = subscribeWorldBuildings(client, refreshBuildings);
    const interval = window.setInterval(refreshBuildings, 3000);
    return () => { window.clearInterval(interval); client.removeChannel(buildingChannel); };
  }, [client, enabled, refreshBuildings]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshCreatures();
    const creatureChannel = subscribeWorldCreatures(client, refreshCreatures);
    const interval = window.setInterval(refreshCreatures, 1800);
    return () => { window.clearInterval(interval); client.removeChannel(creatureChannel); };
  }, [client, enabled, refreshCreatures]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshResources();
    const resourceChannel = subscribeWorldResources(client, refreshResources);
    const interval = window.setInterval(refreshResources, 1800);
    return () => { window.clearInterval(interval); client.removeChannel(resourceChannel); };
  }, [client, enabled, refreshResources]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshChat();
    const chatChannel = subscribeWorldChatMessages(client, (message) => {
      if (!isSameChatTile(message, latestTileRef.current)) return;
      setChatMessages((current) => appendChatMessage(current, message));
    });
    const interval = window.setInterval(refreshChat, 12_000);
    return () => { window.clearInterval(interval); client.removeChannel(chatChannel); };
  }, [client, enabled, refreshChat]);

  useEffect(() => {
    if (!client || !enabled) return;
    const publish = async () => {
      const localPlayer = latestLocalPlayerRef.current;
      if (!localPlayer) return;
      await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef });
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
    if (!client || !enabled) return;
    const publishResources = async () => {
      const now = performance.now();
      if (now - lastResourcePublishAtRef.current < 1000) return;
      lastResourcePublishAtRef.current = now;
      const resources = latestResourcesRef.current;
      if (resources.length === 0) return;
      await upsertWorldResources(client, resources);
    };
    const interval = window.setInterval(publishResources, 1000);
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
      const previousTile = latestTileRef.current;
      latestTileRef.current = localPlayer.currentTile as MapTileRef;
      latestCreaturesRef.current = snapshot.creatures;
      latestResourcesRef.current = snapshot.resources;
      setCamera(computeCamera(localPlayer));
      if (previousTile && !isSameTile(previousTile, latestTileRef.current)) {
        void refreshBuildings();
        void refreshCreatures();
        void refreshResources();
        void refreshChat();
      }
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
    return () => { window.removeEventListener("palpalworld:world_snapshot", handleSnapshot); window.removeEventListener("resize", handleResize); };
  }, [client, enabled, refreshBuildings, refreshChat, refreshCreatures, refreshResources]);

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

  const bubbleMessages = useMemo(() => chatMessages.filter(isFreshMessage).slice(-8), [chatMessages]);

  if (!enabled || !camera) return null;

  return (
    <div className="multiplayer-overlay" aria-label="멀티플레이어 오버레이">
      <div className="multiplayer-status">{status}</div>
      {visibleSharedBuildings.map((building) => {
        const left = building.position.x - camera.cameraX;
        const top = building.position.y - camera.cameraY;
        if (left < -100 || left > camera.width + 100 || top < -120 || top > camera.height + 100) return null;
        return <div key={building.id} className="multiplayer-building" style={{ left, top }}><div className="multiplayer-building__sprite">{getSharedBuildingIcon(String(building.type))}</div><div className="multiplayer-building__label">공유 건물</div></div>;
      })}
      {bubbleMessages.map((message) => {
        const left = message.x - camera.cameraX;
        const top = message.y - camera.cameraY;
        if (left < -120 || left > camera.width + 120 || top < -140 || top > camera.height + 100) return null;
        return <div key={message.message_id} className={`world-chat-bubble world-chat-bubble--${message.message_type}`} style={{ left, top }}>{message.message}</div>;
      })}
      {visiblePlayers.map((player) => {
        const left = player.position.x - camera.cameraX;
        const top = player.position.y - camera.cameraY;
        if (left < -80 || left > camera.width + 80 || top < -100 || top > camera.height + 80) return null;
        return <div key={player.id} className="multiplayer-player" style={{ left, top }}><div className={`multiplayer-player__avatar multiplayer-player__avatar--${player.direction ?? "down"}`}><span className="multiplayer-player__head" /><span className="multiplayer-player__body" /></div><div className="multiplayer-player__name">{player.nickname}</div></div>;
      })}
      <section className="world-chat-panel" aria-label="근처 채팅">
        <div className="world-chat-log">
          {chatMessages.slice(-5).map((message) => <div key={message.message_id} className="world-chat-log__line"><b>{message.nickname}</b><span>{message.message}</span></div>)}
        </div>
        <div className="world-chat-emotes">{emotes.map((emote) => <button key={emote} type="button" onClick={() => void sendChat(emote, "emote")}>{emote}</button>)}</div>
        <form className="world-chat-form" onSubmit={handleSubmitChat}>
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={80} placeholder="근처 채팅" />
          <button type="submit">전송</button>
        </form>
      </section>
    </div>
  );
}
