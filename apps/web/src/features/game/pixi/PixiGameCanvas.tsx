"use client";

import type { Direction, PlayerPublicState, WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";
import { createPixiGameLayers } from "./PixiLayers";

declare global {
  interface Window {
    PIXI?: {
      Application: new () => {
        init: (options: Record<string, unknown>) => Promise<void>;
        canvas: HTMLCanvasElement;
        stage: { addChild: (...children: unknown[]) => void };
        ticker: { add: (callback: () => void) => void };
        destroy: (removeView?: boolean, options?: { children?: boolean }) => void;
      };
      Container: new () => unknown;
      Graphics: new () => {
        clear: () => void;
        moveTo: (x: number, y: number) => void;
        lineTo: (x: number, y: number) => void;
        stroke: (options: { width: number; color: number; alpha?: number }) => void;
        rect: (x: number, y: number, width: number, height: number) => void;
        roundRect: (x: number, y: number, width: number, height: number, radius: number) => void;
        ellipse: (x: number, y: number, halfWidth: number, halfHeight: number) => void;
        circle: (x: number, y: number, radius: number) => void;
        fill: (options: { color: number; alpha?: number }) => void;
      };
    };
  }
}

type RemotePlayersEvent = CustomEvent<{ players?: PlayerPublicState[] }>;
type PixiGraphics = InstanceType<NonNullable<Window["PIXI"]>["Graphics"]>;
type PixiTransformNode = { position: { set: (x: number, y: number) => void }; scale: { set: (value: number) => void } };
type SmoothedRemotePlayer = { player: PlayerPublicState; x: number; y: number; lastSeenAt: number };

export type PixiGameCanvasProps = {
  enabled?: boolean;
  snapshot: WorldSnapshot | null;
  localPlayerId: string;
};

const pixiCdnUrl = "https://cdn.jsdelivr.net/npm/pixi.js@8.14.3/dist/pixi.min.js";
const remoteLerpFactor = 0.22;
const remoteSnapDistance = 420;
const remoteStaleMs = 3500;
let pixiLoaderPromise: Promise<NonNullable<Window["PIXI"]>> | null = null;

function loadPixiRuntime() {
  if (typeof window === "undefined") return Promise.reject(new Error("PixiJS can only load in the browser."));
  if (window.PIXI) return Promise.resolve(window.PIXI);
  if (pixiLoaderPromise) return pixiLoaderPromise;

  pixiLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-palpalworld-pixi="true"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => window.PIXI ? resolve(window.PIXI) : reject(new Error("PixiJS loaded without global PIXI.")), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load PixiJS CDN script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = pixiCdnUrl;
    script.async = true;
    script.dataset.palpalworldPixi = "true";
    script.onload = () => window.PIXI ? resolve(window.PIXI) : reject(new Error("PixiJS loaded without global PIXI."));
    script.onerror = () => reject(new Error("Failed to load PixiJS CDN script."));
    document.head.appendChild(script);
  });

  return pixiLoaderPromise;
}

function isNightModeActive() {
  return typeof document !== "undefined" && Boolean(document.querySelector(".game-shell--night"));
}

function hasTorchEquipped(player: PlayerPublicState) {
  return (player as PlayerPublicState & { equippedWeaponItemId?: string | null }).equippedWeaponItemId === "torch";
}

function getPlayerPalette(player: PlayerPublicState, isLocal: boolean) {
  if (isLocal) {
    return { jacket: 0x2563eb, trim: 0x93c5fd, hair: 0x1e293b, skin: 0xffd3a7 };
  }
  const seed = player.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const jackets = [0x7c3aed, 0x059669, 0xdc2626, 0xd97706, 0x0891b2, 0xbe185d];
  return { jacket: jackets[seed % jackets.length], trim: 0xe9d5ff, hair: 0x111827, skin: 0xf8caa2 };
}

function getDirectionOffset(direction: Direction | undefined) {
  switch (direction) {
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    case "up": return { x: 0, y: -1 };
    case "down":
    default: return { x: 0, y: 1 };
  }
}

function lerp(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

function clonePlayerWithPosition(player: PlayerPublicState, x: number, y: number): PlayerPublicState {
  return { ...player, position: { x, y } };
}

function updateSmoothedRemotePlayers(remotePlayers: PlayerPublicState[], smoothMap: Map<string, SmoothedRemotePlayer>, now: number) {
  const liveIds = new Set<string>();

  for (const player of remotePlayers) {
    liveIds.add(player.id);
    const previous = smoothMap.get(player.id);
    if (!previous || !isSamePlayerTile(previous.player, player)) {
      smoothMap.set(player.id, { player, x: player.position.x, y: player.position.y, lastSeenAt: now });
      continue;
    }

    const dx = player.position.x - previous.x;
    const dy = player.position.y - previous.y;
    const distance = Math.hypot(dx, dy);
    const nextX = distance > remoteSnapDistance ? player.position.x : lerp(previous.x, player.position.x, remoteLerpFactor);
    const nextY = distance > remoteSnapDistance ? player.position.y : lerp(previous.y, player.position.y, remoteLerpFactor);
    smoothMap.set(player.id, { player, x: nextX, y: nextY, lastSeenAt: now });
  }

  for (const [playerId, cached] of smoothMap.entries()) {
    if (!liveIds.has(playerId) && now - cached.lastSeenAt > remoteStaleMs) smoothMap.delete(playerId);
  }

  return Array.from(smoothMap.values()).map((cached) => clonePlayerWithPosition(cached.player, cached.x, cached.y));
}

function drawPixiCharacter(graphics: PixiGraphics, player: PlayerPublicState, isLocal: boolean) {
  const x = player.position.x;
  const y = player.position.y;
  const palette = getPlayerPalette(player, isLocal);
  const direction = getDirectionOffset(player.direction);
  const torch = hasTorchEquipped(player);

  if (torch) {
    graphics.circle(x, y + 2, 74);
    graphics.fill({ color: 0xfacc15, alpha: 0.08 });
    graphics.circle(x, y + 2, 42);
    graphics.fill({ color: 0xf97316, alpha: 0.08 });
  }

  graphics.ellipse(x, y + 19, 18, 6);
  graphics.fill({ color: 0x000000, alpha: 0.24 });

  const step = Math.sin(Date.now() / 150 + x * 0.01 + y * 0.01) * 1.4;
  graphics.roundRect(x - 8, y + 9 + step, 5, 12, 3);
  graphics.roundRect(x + 3, y + 9 - step, 5, 12, 3);
  graphics.fill({ color: 0x1e293b, alpha: 1 });

  graphics.roundRect(x - 11, y - 8, 22, 25, 7);
  graphics.fill({ color: palette.jacket, alpha: isLocal ? 1 : 0.94 });
  graphics.roundRect(x - 4, y - 5, 8, 19, 3);
  graphics.fill({ color: palette.trim, alpha: 0.52 });

  const armOffsetX = direction.x * 5;
  const armOffsetY = direction.y * 3;
  graphics.roundRect(x - 16 + armOffsetX, y - 4 + armOffsetY, 6, 17, 4);
  graphics.roundRect(x + 10 + armOffsetX, y - 4 + armOffsetY, 6, 17, 4);
  graphics.fill({ color: palette.jacket, alpha: 0.92 });

  graphics.circle(x, y - 19, 11);
  graphics.fill({ color: palette.skin, alpha: 1 });
  graphics.roundRect(x - 9, y - 30, 18, 9, 6);
  graphics.fill({ color: palette.hair, alpha: 1 });

  const eyeY = y - 18 + Math.max(0, direction.y) * 1.2;
  const eyeX = direction.x * 2.2;
  graphics.circle(x - 4 + eyeX, eyeY, 1.4);
  graphics.circle(x + 4 + eyeX, eyeY, 1.4);
  graphics.fill({ color: 0x0f172a, alpha: 0.9 });

  graphics.moveTo(x, y - 34);
  graphics.lineTo(x + direction.x * 8, y - 34 + direction.y * 8);
  graphics.stroke({ width: 3, color: isLocal ? 0x60a5fa : 0xc4b5fd, alpha: 0.72 });

  if (torch) {
    const handX = x + 17 + direction.x * 8;
    const handY = y - 2 + direction.y * 4;
    graphics.roundRect(handX - 2, handY - 8, 4, 18, 2);
    graphics.fill({ color: 0x7c2d12, alpha: 1 });
    graphics.circle(handX, handY - 12, 7);
    graphics.fill({ color: 0xfacc15, alpha: 0.5 });
    graphics.circle(handX, handY - 12, 3.5);
    graphics.fill({ color: 0xfb923c, alpha: 0.9 });
  }
}

function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: { player: PlayerPublicState; isLocal: boolean }[]) {
  graphics.clear();
  if (!isNightModeActive()) return;

  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x02040d, alpha: 0.58 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const radius = torch ? 132 : entry.isLocal ? 44 : 0;
    if (radius <= 0) continue;

    graphics.circle(screenX, screenY, radius);
    graphics.fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.16 : 0.08 });
    graphics.circle(screenX, screenY, Math.max(18, radius * 0.48));
    graphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.15 : 0.08 });
  }
}

function isSamePlayerTile(a: PlayerPublicState | null | undefined, b: PlayerPublicState | null | undefined) {
  if (!a || !b) return false;
  return String(a.currentTile?.regionId) === String(b.currentTile?.regionId)
    && a.currentTile?.tileX === b.currentTile?.tileX
    && a.currentTile?.tileY === b.currentTile?.tileY;
}

export function PixiGameCanvas({ enabled = false, snapshot, localPlayerId }: PixiGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);
  const localPlayerIdRef = useRef(localPlayerId);
  const remotePlayersRef = useRef<PlayerPublicState[]>([]);
  const smoothedRemotePlayersRef = useRef(new Map<string, SmoothedRemotePlayer>());

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    localPlayerIdRef.current = localPlayerId;
  }, [localPlayerId]);

  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {
      const customEvent = event as RemotePlayersEvent;
      remotePlayersRef.current = customEvent.detail?.players ?? [];
    };
    window.addEventListener("palpalworld:remote-players", handleRemotePlayers);
    return () => window.removeEventListener("palpalworld:remote-players", handleRemotePlayers);
  }, []);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function start() {
      const host = hostRef.current;
      if (!host || disposed) return;
      const PIXI = await loadPixiRuntime();
      if (disposed || !hostRef.current) return;

      const app = new PIXI.Application();
      await app.init({
        resizeTo: host,
        antialias: false,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      host.appendChild(app.canvas);
      const camera = createPixiCamera(host.clientWidth, host.clientHeight);
      const layers = createPixiGameLayers(app, PIXI);
      const playerGraphics = new PIXI.Graphics();
      const lightingGraphics = new PIXI.Graphics();
      layers.players.addChild(playerGraphics as never);
      layers.lighting.addChild(lightingGraphics as never);

      const resize = () => resizePixiCamera(camera, host.clientWidth, host.clientHeight);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      app.ticker.add(() => {
        const currentSnapshot = snapshotRef.current;
        const localPlayer = currentSnapshot?.players.find((player) => player.id === localPlayerIdRef.current);
        const now = Date.now();
        if (localPlayer) centerPixiCameraOn(camera, localPlayer.position);
        const root = layers.root as unknown as PixiTransformNode;
        root.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
        root.scale.set(camera.zoom);
        const lighting = lightingGraphics as unknown as PixiTransformNode;
        lighting.position.set(0, 0);
        lighting.scale.set(1);

        playerGraphics.clear();
        const smoothRemotePlayers = updateSmoothedRemotePlayers(remotePlayersRef.current, smoothedRemotePlayersRef.current, now);
        const drawablePlayers = [
          ...(localPlayer ? [{ player: localPlayer, isLocal: true }] : []),
          ...smoothRemotePlayers
            .filter((remotePlayer) => remotePlayer.id !== localPlayerIdRef.current)
            .filter((remotePlayer) => !localPlayer || isSamePlayerTile(localPlayer, remotePlayer))
            .map((remotePlayer) => ({ player: remotePlayer, isLocal: false })),
        ].sort((a, b) => a.player.position.y - b.player.position.y);

        for (const entry of drawablePlayers) drawPixiCharacter(playerGraphics, entry.player, entry.isLocal);
        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);
      });

      cleanup = () => {
        resizeObserver.disconnect();
        app.destroy(true, { children: true });
      };
    }

    void start();
    return () => {
      disposed = true;
      cleanup?.();
      cleanup = null;
    };
  }, [enabled]);

  return <div ref={hostRef} className={enabled ? "pixi-game-canvas pixi-game-canvas--enabled" : "pixi-game-canvas"} aria-hidden={!enabled} />;
}
