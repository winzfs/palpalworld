"use client";

import type { WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";
import { createPixiGameLayers } from "./PixiLayers";

export type PixiGameCanvasProps = {
  enabled?: boolean;
  snapshot: WorldSnapshot | null;
  localPlayerId: string;
};

export function PixiGameCanvas({ enabled = false, snapshot, localPlayerId }: PixiGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);
  const localPlayerIdRef = useRef(localPlayerId);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    localPlayerIdRef.current = localPlayerId;
  }, [localPlayerId]);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function start() {
      const host = hostRef.current;
      if (!host || disposed) return;
      const { Application, Graphics } = await import("pixi.js");
      if (disposed || !hostRef.current) return;

      const app = new Application();
      await app.init({
        resizeTo: host,
        antialias: false,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      host.appendChild(app.canvas);
      const camera = createPixiCamera(host.clientWidth, host.clientHeight);
      const layers = createPixiGameLayers(app);
      const debugCross = new Graphics();
      layers.debug.addChild(debugCross);

      const resize = () => resizePixiCamera(camera, host.clientWidth, host.clientHeight);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      app.ticker.add(() => {
        const currentSnapshot = snapshotRef.current;
        const localPlayer = currentSnapshot?.players.find((player) => player.id === localPlayerIdRef.current);
        if (localPlayer) centerPixiCameraOn(camera, localPlayer.position);
        layers.root.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
        layers.root.scale.set(camera.zoom);

        debugCross.clear();
        if (!localPlayer) return;
        debugCross.moveTo(localPlayer.position.x - 14, localPlayer.position.y);
        debugCross.lineTo(localPlayer.position.x + 14, localPlayer.position.y);
        debugCross.moveTo(localPlayer.position.x, localPlayer.position.y - 14);
        debugCross.lineTo(localPlayer.position.x, localPlayer.position.y + 14);
        debugCross.stroke({ width: 2, color: 0x60a5fa, alpha: 0.7 });
        debugCross.circle(localPlayer.position.x, localPlayer.position.y, 24);
        debugCross.fill({ color: 0x60a5fa, alpha: 0.12 });
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
