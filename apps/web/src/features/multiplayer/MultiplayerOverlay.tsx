"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from "react";
import type { BuildingState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { MAP_TILE_SIZE, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import { getPetSpeciesDefinition, isFlyingPetSpecies } from "../pets/petCatalog";
import {
  fetchOnlinePlayers,
  getOrCreateMultiplayerPlayerId,
  getSupabaseClient,
  isSupabaseMultiplayerEnabled,
  subscribeOnlinePlayers,
  upsertLocalPresence,
} from "./supabaseMultiplayer";
import {
  dispatchRemoteBuildingState,
  fetchWorldBuildings,
  markWorldBuildingDeleted,
  subscribeWorldBuildings,
  upsertWorldBuilding,
  type SharedBuildingState,
} from "./supabaseWorldBuildings";
import {
  dispatchRemoteCreatureState,
  fetchWorldCreatures,
  subscribeWorldCreatures,
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

type CameraState = { width: number; height: number; cameraX: number; cameraY: number; currentTile: MapTileRef };
type ChatPanelPosition = { x: number; y: number };
type ChatPanelDragState = { pointerId: number; startX: number; startY: number; panelX: number; panelY: number };
type SmoothRemotePlayer = { player: PlayerPublicState; lastSeenAt: number };
type MultiplayerMountedPetInfo = { itemId: string; speciesId: string; label: string; flying: boolean };

const emotes = ["👋", "❤️", "⚔️", "🆘"];
const chatBubbleVisibleMs = 12_000;
const chatPanelStorageKey = "palpalworld.ui.chatPanelPosition";
const chatPanelCollapsedStorageKey = "palpalworld.ui.chatPanelCollapsed";
const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";
const pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";
const chatPanelWidth = 330;
const chatPanelCollapsedWidth = 210;
const chatPanelExpandedHeight = 226;
const chatPanelCollapsedHeight = 48;

function readMountedPetItemId() { if (typeof window === "undefined") return null; return window.localStorage.getItem(mountedPetStorageKey); }
function readPixiStageEnabled() { if (typeof window === "undefined") return false; return window.localStorage.getItem(pixiStageFlagStorageKey) === "true"; }
function getMountedPetInfo(player: PlayerPublicState): MultiplayerMountedPetInfo | null {
  const mountedPetItemId = (player as PlayerPublicState & { mountedPetItemId?: string | null }).mountedPetItemId;
  if (!mountedPetItemId?.startsWith("pet_")) return null;
  const speciesId = mountedPetItemId.slice(4);
  const species = getPetSpeciesDefinition(speciesId);
  return { itemId: mountedPetItemId, speciesId, label: species.name, flying: isFlyingPetSpecies(speciesId) };
}
function getViewportSize() { if (typeof window === "undefined") return { width: 1280, height: 720 }; return { width: window.innerWidth, height: window.innerHeight }; }
function cloneRemotePlayer(player: PlayerPublicState): PlayerPublicState { return { ...player, position: { x: player.position.x, y: player.position.y }, currentTile: { ...(player.currentTile as MapTileRef) } } as PlayerPublicState; }
function distanceBetweenPlayers(a: PlayerPublicState, b: PlayerPublicState) { return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y); }
function interpolateRemotePlayer(current: PlayerPublicState, target: PlayerPublicState) {
  const currentTile = current.currentTile as MapTileRef;
  const targetTile = target.currentTile as MapTileRef;
  if (!isSameTile(currentTile, targetTile) || distanceBetweenPlayers(current, target) > 520) return cloneRemotePlayer(target);
  const alpha = 0.22;
  return { ...target, position: { x: current.position.x + (target.position.x - current.position.x) * alpha, y: current.position.y + (target.position.y - current.position.y) * alpha }, currentTile: { ...targetTile } } as PlayerPublicState;
}
function clampChatPanelPosition(position: ChatPanelPosition, collapsed = false): ChatPanelPosition {
  const viewport = getViewportSize();
  const width = Math.min(collapsed ? chatPanelCollapsedWidth : chatPanelWidth, Math.max(220, viewport.width - 16));
  const height = collapsed ? chatPanelCollapsedHeight : chatPanelExpandedHeight;
  return { x: Math.max(8, Math.min(viewport.width - width - 8, position.x)), y: Math.max(8, Math.min(viewport.height - height - 8, position.y)) };
}
function getDefaultChatPanelPosition(collapsed = false): ChatPanelPosition {
  const viewport = getViewportSize();
  const width = Math.min(collapsed ? chatPanelCollapsedWidth : chatPanelWidth, Math.max(220, viewport.width - 16));
  return clampChatPanelPosition({ x: viewport.width - width - 12, y: viewport.width <= 720 ? Math.max(72, viewport.height - 310) : 256 }, collapsed);
}
function readStoredChatPanelPosition(collapsed = false): ChatPanelPosition {
  if (typeof window === "undefined") return getDefaultChatPanelPosition(collapsed);
  try {
    const raw = window.localStorage.getItem(chatPanelStorageKey);
    if (!raw) return getDefaultChatPanelPosition(collapsed);
    const parsed = JSON.parse(raw) as Partial<ChatPanelPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return getDefaultChatPanelPosition(collapsed);
    return clampChatPanelPosition({ x: parsed.x, y: parsed.y }, collapsed);
  } catch { return getDefaultChatPanelPosition(collapsed); }
}
function readStoredChatCollapsed() { if (typeof window === "undefined") return false; return window.localStorage.getItem(chatPanelCollapsedStorageKey) === "true"; }
function computeCamera(player: PlayerPublicState): CameraState {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const height = typeof window === "undefined" ? 720 : window.innerHeight;
  return { width, height, cameraX: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - width), player.position.x - width / 2)), cameraY: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - height), player.position.y - height / 2)), currentTile: player.currentTile as MapTileRef };
}
function shouldShareBuilding(building: BuildingState) { return building.id.startsWith("demo-building-") && !building.id.includes("starter_meadow") && !building.id.endsWith("-workbench"); }
function appendChatMessage(current: WorldChatMessageRow[], message: WorldChatMessageRow) {
  const withoutDuplicate = current.filter((existing) => {
    if (existing.message_id === message.message_id) return false;
    const isLocalEcho = existing.message_id.startsWith("local-") && existing.player_id === message.player_id && existing.message === message.message && Math.abs(new Date(existing.created_at).getTime() - new Date(message.created_at).getTime()) < 10_000;
    return !isLocalEcho;
  });
  return [...withoutDuplicate, message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-30);
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
function isFreshMessage(message: WorldChatMessageRow) { return Date.now() - new Date(message.created_at).getTime() < chatBubbleVisibleMs; }

export function MultiplayerOverlay() {
  const [enabled] = useState(() => isSupabaseMultiplayerEnabled());
  const [playerId] = useState(() => getOrCreateMultiplayerPlayerId());
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [smoothOnlinePlayers, setSmoothOnlinePlayers] = useState<PlayerPublicState[]>([]);
  const [chatMessages, setChatMessages] = useState<WorldChatMessageRow[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(readStoredChatCollapsed);
  const [chatPanelPosition, setChatPanelPosition] = useState(() => readStoredChatPanelPosition(readStoredChatCollapsed()));
  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");
  const [pixiStageEnabled, setPixiStageEnabled] = useState(readPixiStageEnabled);
  const latestLocalPlayerRef = useRef<PlayerPublicState | null>(null);
  const latestTileRef = useRef<MapTileRef | null>(null);
  const latestResourcesRef = useRef<ResourceNodeState[]>([]);
  const onlinePlayersRef = useRef<PlayerPublicState[]>([]);
  const smoothPlayersRef = useRef(new Map<string, SmoothRemotePlayer>());
  const localBuildingIdsRef = useRef(new Set<string>());
  const publishedBuildingIdsRef = useRef(new Set<string>());
  const lastResourcePublishAtRef = useRef(0);
  const chatDragRef = useRef<ChatPanelDragState | null>(null);
  const client = useMemo(() => getSupabaseClient(), []);

  const refreshPlayers = useCallback(async () => {
    if (!client) return;
    const players = await fetchOnlinePlayers(client, playerId);
    onlinePlayersRef.current = players;
    setStatus(players.length > 0 ? `온라인 ${players.length + 1}명` : "온라인 1명");
  }, [client, playerId]);

  const refreshBuildings = useCallback(async () => {
    if (!client) return;
    const buildings = await fetchWorldBuildings(client, latestTileRef.current);
    const remoteBuildings = buildings.filter((building) => building.ownerPlayerId !== playerId).map((building) => ({ ...building, isRemoteSharedBuilding: true }) as SharedBuildingState);
    dispatchRemoteBuildingState(remoteBuildings);
  }, [client, playerId]);

  const refreshCreatures = useCallback(async () => {
    if (!client) return;
    const rows = await fetchWorldCreatures(client, latestTileRef.current);
    dispatchRemoteCreatureState(rows);
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
    const input = { playerId, nickname: localPlayer.nickname, message, messageType, position: localPlayer.position, direction: localPlayer.direction, currentTile: tile };
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

  const handleChatPanelPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    chatDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panelX: chatPanelPosition.x, panelY: chatPanelPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [chatPanelPosition]);

  const handleChatPanelPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = chatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = clampChatPanelPosition({ x: drag.panelX + event.clientX - drag.startX, y: drag.panelY + event.clientY - drag.startY }, chatCollapsed);
    setChatPanelPosition(next);
    if (typeof window !== "undefined") window.localStorage.setItem(chatPanelStorageKey, JSON.stringify(next));
  }, [chatCollapsed]);

  const stopChatPanelDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = chatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    chatDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const toggleChatCollapsed = useCallback(() => {
    setChatCollapsed((current) => {
      const nextCollapsed = !current;
      if (typeof window !== "undefined") window.localStorage.setItem(chatPanelCollapsedStorageKey, String(nextCollapsed));
      setChatPanelPosition((position) => {
        const nextPosition = clampChatPanelPosition(position, nextCollapsed);
        if (typeof window !== "undefined") window.localStorage.setItem(chatPanelStorageKey, JSON.stringify(nextPosition));
        return nextPosition;
      });
      return nextCollapsed;
    });
  }, []);

  useEffect(() => { const sync = () => setPixiStageEnabled(readPixiStageEnabled()); sync(); const interval = window.setInterval(sync, 700); return () => window.clearInterval(interval); }, []);
  useEffect(() => { if (!client || !enabled) return; refreshPlayers(); const channel = subscribeOnlinePlayers(client, refreshPlayers); const interval = window.setInterval(refreshPlayers, 2500); return () => { window.clearInterval(interval); client.removeChannel(channel); }; }, [client, enabled, refreshPlayers]);

  useEffect(() => {
    let animationFrame = 0;
    const tick = () => {
      const now = performance.now();
      const targets = onlinePlayersRef.current;
      const targetIds = new Set(targets.map((player) => player.id));
      const smoothMap = smoothPlayersRef.current;
      for (const target of targets) {
        const existing = smoothMap.get(target.id);
        if (!existing) { smoothMap.set(target.id, { player: cloneRemotePlayer(target), lastSeenAt: now }); continue; }
        smoothMap.set(target.id, { player: interpolateRemotePlayer(existing.player, target), lastSeenAt: now });
      }
      for (const [id, entry] of smoothMap) if (!targetIds.has(id) && now - entry.lastSeenAt > 6_500) smoothMap.delete(id);
      setSmoothOnlinePlayers(Array.from(smoothMap.values()).map((entry) => entry.player));
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => { window.dispatchEvent(new CustomEvent("palpalworld:remote-players", { detail: { players: smoothOnlinePlayers } })); }, [smoothOnlinePlayers]);
  useEffect(() => { if (!client || !enabled) return; refreshBuildings(); const channel = subscribeWorldBuildings(client, refreshBuildings); const interval = window.setInterval(refreshBuildings, 3000); return () => { window.clearInterval(interval); client.removeChannel(channel); }; }, [client, enabled, refreshBuildings]);
  useEffect(() => { if (!client || !enabled) return; refreshCreatures(); const channel = subscribeWorldCreatures(client, refreshCreatures); const interval = window.setInterval(refreshCreatures, 1800); return () => { window.clearInterval(interval); client.removeChannel(channel); }; }, [client, enabled, refreshCreatures]);
  useEffect(() => { if (!client || !enabled) return; refreshResources(); const channel = subscribeWorldResources(client, refreshResources); const interval = window.setInterval(refreshResources, 1800); return () => { window.clearInterval(interval); client.removeChannel(channel); }; }, [client, enabled, refreshResources]);
  useEffect(() => { if (!client || !enabled) return; refreshChat(); const channel = subscribeWorldChatMessages(client, (message) => { if (!isSameChatTile(message, latestTileRef.current)) return; setChatMessages((current) => appendChatMessage(current, message)); }); const interval = window.setInterval(refreshChat, 12_000); return () => { window.clearInterval(interval); client.removeChannel(channel); }; }, [client, enabled, refreshChat]);
  useEffect(() => { const handleResize = () => setChatPanelPosition((position) => { const next = clampChatPanelPosition(position, chatCollapsed); if (typeof window !== "undefined") window.localStorage.setItem(chatPanelStorageKey, JSON.stringify(next)); return next; }); window.addEventListener("resize", handleResize); return () => window.removeEventListener("resize", handleResize); }, [chatCollapsed]);
  useEffect(() => { if (!client || !enabled) return; const publish = async () => { const localPlayer = latestLocalPlayerRef.current; if (!localPlayer) return; await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef, mountedPetItemId: readMountedPetItemId() }); }; const interval = window.setInterval(publish, 450); return () => window.clearInterval(interval); }, [client, enabled, playerId]);
  useEffect(() => { if (!client || !enabled) return; const publishResources = async () => { const now = performance.now(); if (now - lastResourcePublishAtRef.current < 1000) return; lastResourcePublishAtRef.current = now; const resources = latestResourcesRef.current; if (resources.length === 0) return; await upsertWorldResources(client, resources); }; const interval = window.setInterval(publishResources, 1000); return () => window.clearInterval(interval); }, [client, enabled]);

  useEffect(() => {
    const handleSnapshot = (event: Event) => {
      const snapshot = (event as WorldSnapshotEvent).detail?.snapshot;
      if (!snapshot) return;
      const localPlayer = snapshot.players[0];
      if (!localPlayer) return;
      latestLocalPlayerRef.current = localPlayer;
      const previousTile = latestTileRef.current;
      latestTileRef.current = localPlayer.currentTile as MapTileRef;
      latestResourcesRef.current = snapshot.resources;
      setCamera(computeCamera(localPlayer));
      if (previousTile && !isSameTile(previousTile, latestTileRef.current)) { void refreshBuildings(); void refreshCreatures(); void refreshResources(); void refreshChat(); }
      if (client && enabled) {
        for (const building of snapshot.buildings) {
          if (!shouldShareBuilding(building)) continue;
          localBuildingIdsRef.current.add(building.id);
          if (publishedBuildingIdsRef.current.has(building.id)) continue;
          publishedBuildingIdsRef.current.add(building.id);
          void upsertWorldBuilding(client, { ...building, ownerPlayerId: playerId, ownerNickname: localPlayer.nickname }, localPlayer.nickname);
        }
      }
    };
    const handleResize = () => { const localPlayer = latestLocalPlayerRef.current; if (localPlayer) setCamera(computeCamera(localPlayer)); };
    window.addEventListener("palpalworld:world_snapshot", handleSnapshot);
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("palpalworld:world_snapshot", handleSnapshot); window.removeEventListener("resize", handleResize); };
  }, [client, enabled, playerId, refreshBuildings, refreshChat, refreshCreatures, refreshResources]);

  useEffect(() => {
    if (!client || !enabled) return;
    const handleDismantled = (event: Event) => {
      const customEvent = event as BuildingDismantledEvent;
      const buildingId = customEvent.detail?.buildingId;
      const building = customEvent.detail?.building as SharedBuildingState | undefined;
      if (!buildingId || building?.isRemoteSharedBuilding) return;
      localBuildingIdsRef.current.delete(buildingId);
      publishedBuildingIdsRef.current.delete(buildingId);
      void markWorldBuildingDeleted(client, buildingId).then(refreshBuildings);
    };
    window.addEventListener("palpalworld:building-dismantled", handleDismantled);
    return () => window.removeEventListener("palpalworld:building-dismantled", handleDismantled);
  }, [client, enabled, refreshBuildings]);

  const visiblePlayers = useMemo(() => { if (!camera) return []; return smoothOnlinePlayers.filter((player) => isSameTile(player.currentTile as MapTileRef, camera.currentTile)); }, [camera, smoothOnlinePlayers]);
  const bubbleMessages = useMemo(() => chatMessages.filter(isFreshMessage).slice(-8), [chatMessages]);
  const latestChatMessage = chatMessages[chatMessages.length - 1];
  if (!enabled || !camera) return null;

  return (
    <div className={pixiStageEnabled ? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"} aria-label="멀티플레이어 오버레이">
      <div className="multiplayer-status">{status}</div>
      {bubbleMessages.map((message) => {
        const left = message.x - camera.cameraX;
        const top = message.y - camera.cameraY;
        if (left < -120 || left > camera.width + 120 || top < -140 || top > camera.height + 100) return null;
        return <div key={message.message_id} className={`world-chat-bubble world-chat-bubble--${message.message_type}`} style={{ left, top }}>{message.message}</div>;
      })}
      {!pixiStageEnabled ? visiblePlayers.map((player) => {
        const mountedPet = getMountedPetInfo(player);
        const left = player.position.x - camera.cameraX;
        const top = player.position.y - camera.cameraY;
        if (left < -90 || left > camera.width + 90 || top < -120 || top > camera.height + 100) return null;
        return (
          <div key={player.id} className={`multiplayer-player ${mountedPet ? "multiplayer-player--mounted" : ""} ${mountedPet?.flying ? "multiplayer-player--flying-mounted" : ""}`} style={{ left, top }}>
            {mountedPet ? (
              <div className={`multiplayer-mounted-pet multiplayer-mounted-pet--${mountedPet.speciesId} ${mountedPet.flying ? "multiplayer-mounted-pet--flying" : ""}`} aria-label={`${mountedPet.label} 탑승 중`}>
                <span className="multiplayer-mounted-pet__shadow" />
                <span className="multiplayer-mounted-pet__tail" />
                <span className="multiplayer-mounted-pet__body" />
                <span className="multiplayer-mounted-pet__belly" />
                <span className="multiplayer-mounted-pet__head" />
                <span className="multiplayer-mounted-pet__ear multiplayer-mounted-pet__ear--left" />
                <span className="multiplayer-mounted-pet__ear multiplayer-mounted-pet__ear--right" />
                <span className="multiplayer-mounted-pet__eye" />
                <span className="multiplayer-mounted-pet__leg multiplayer-mounted-pet__leg--1" />
                <span className="multiplayer-mounted-pet__leg multiplayer-mounted-pet__leg--2" />
                <span className="multiplayer-mounted-pet__leg multiplayer-mounted-pet__leg--3" />
                <span className="multiplayer-mounted-pet__leg multiplayer-mounted-pet__leg--4" />
                {mountedPet.flying ? <><span className="multiplayer-mounted-pet__wing multiplayer-mounted-pet__wing--left" /><span className="multiplayer-mounted-pet__wing multiplayer-mounted-pet__wing--right" /></> : null}
              </div>
            ) : null}
            <div className={`multiplayer-player__avatar multiplayer-player__avatar--${player.direction ?? "down"}`}>
              <span className="multiplayer-player__shadow" />
              <span className="multiplayer-player__leg multiplayer-player__leg--back" />
              <span className="multiplayer-player__leg multiplayer-player__leg--front" />
              <span className="multiplayer-player__body" />
              <span className="multiplayer-player__arm multiplayer-player__arm--back" />
              <span className="multiplayer-player__arm multiplayer-player__arm--front" />
              <span className="multiplayer-player__head" />
              <span className="multiplayer-player__hair" />
            </div>
            <div className="multiplayer-player__name">{player.nickname}</div>
          </div>
        );
      }) : null}
      <section className={`world-chat-panel ${chatCollapsed ? "world-chat-panel--collapsed" : ""}`} style={{ left: chatPanelPosition.x, top: chatPanelPosition.y }} aria-label="근처 채팅">
        <header className="world-chat-panel__header" onPointerDown={handleChatPanelPointerDown} onPointerMove={handleChatPanelPointerMove} onPointerUp={stopChatPanelDrag} onPointerCancel={stopChatPanelDrag}>
          <strong>근처 채팅</strong>
          <span>{latestChatMessage ? `${latestChatMessage.nickname}: ${latestChatMessage.message}` : "대화 없음"}</span>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={toggleChatCollapsed} aria-expanded={!chatCollapsed}>{chatCollapsed ? "펼치기" : "접기"}</button>
        </header>
        {!chatCollapsed ? (
          <>
            <div className="world-chat-log">{chatMessages.slice(-6).map((message) => <div key={message.message_id} className="world-chat-log__line"><b>{message.nickname}</b><span>{message.message}</span></div>)}</div>
            <div className="world-chat-emotes">{emotes.map((emote) => <button key={emote} type="button" onClick={() => void sendChat(emote, "emote")}>{emote}</button>)}</div>
            <form className="world-chat-form" onSubmit={handleSubmitChat}>
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={80} placeholder="근처 채팅" />
              <button type="submit">전송</button>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
