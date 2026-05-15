"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerPublicState, WorldSnapshot } from "@palpalworld/shared";
import { MAP_TILE_SIZE, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import {
  fetchOnlinePlayers,
  getOrCreateMultiplayerPlayerId,
  getSupabaseClient,
  isSupabaseMultiplayerEnabled,
  subscribeOnlinePlayers,
  upsertLocalPresence,
} from "./supabaseMultiplayer";

type WorldSnapshotEvent = CustomEvent<{ snapshot?: WorldSnapshot; localPlayerId?: string | null }>;

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

export function MultiplayerOverlay() {
  const [enabled] = useState(() => isSupabaseMultiplayerEnabled());
  const [playerId] = useState(() => getOrCreateMultiplayerPlayerId());
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPublicState[]>([]);
  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");
  const latestLocalPlayerRef = useRef<PlayerPublicState | null>(null);
  const onlinePlayersRef = useRef<PlayerPublicState[]>([]);
  const client = useMemo(() => getSupabaseClient(), []);

  const refreshPlayers = useCallback(async () => {
    if (!client) return;
    const players = await fetchOnlinePlayers(client, playerId);
    onlinePlayersRef.current = players;
    setOnlinePlayers(players);
    setStatus(players.length > 0 ? `온라인 ${players.length + 1}명` : "온라인 1명");
  }, [client, playerId]);

  useEffect(() => {
    if (!client || !enabled) return;
    refreshPlayers();
    const channel = subscribeOnlinePlayers(client, refreshPlayers);
    const interval = window.setInterval(refreshPlayers, 2500);
    return () => {
      window.clearInterval(interval);
      client.removeChannel(channel);
    };
  }, [client, enabled, refreshPlayers]);

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
    const handleSnapshot = (event: Event) => {
      const customEvent = event as WorldSnapshotEvent;
      const snapshot = customEvent.detail?.snapshot;
      if (!snapshot) return;
      const localPlayer = snapshot.players[0];
      if (!localPlayer) return;
      latestLocalPlayerRef.current = localPlayer;
      setCamera(computeCamera(localPlayer));
    };
    window.addEventListener("palpalworld:world_snapshot", handleSnapshot);
    window.addEventListener("resize", () => {
      const localPlayer = latestLocalPlayerRef.current;
      if (localPlayer) setCamera(computeCamera(localPlayer));
    });
    return () => window.removeEventListener("palpalworld:world_snapshot", handleSnapshot);
  }, []);

  const visiblePlayers = useMemo(() => {
    if (!camera) return [];
    return onlinePlayers.filter((player) => isSameTile(player.currentTile as MapTileRef, camera.currentTile));
  }, [camera, onlinePlayers]);

  if (!enabled || !camera) return null;

  return (
    <div className="multiplayer-overlay" aria-label="멀티플레이어 오버레이">
      <div className="multiplayer-status">{status}</div>
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
