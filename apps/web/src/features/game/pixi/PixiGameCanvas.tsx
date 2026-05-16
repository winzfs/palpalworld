"use client";

import type { WorldSnapshot } from "@palpalworld/shared";
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
        circle: (x: number, y: number, radius: number) => void;
        fill: (options: { color: number; alpha?: number }) => void;
      };
    };
  }
}

export type PixiGameCanvasProps = {
  enabled?: boolean;
  snapshot: WorldSnapshot | null;
  localPlayerId: string;
};

const pixiCdnUrl = "https://cdn.jsdelivr.net/npm/pixi.js@8.14.3/dist/pixi.min.js";
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
      const debugCross = new PIXI.Graphics();
      layers.debug.addChild(debugCross as never);

      const resize = () => resizePixiCamera(camera, host.clientWidth, host.clientHeight);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      app.ticker.add(() => {
        const currentSnapshot = snapshotRef.current;
        const localPlayer = currentSnapshot?.players.find((player) => player.id === localPlayerIdRef.current);
        if (localPlayer) centerPixiCameraOn(camera, localPlayer.position);
        const root = layers.root as unknown as { position: { set: (x: number, y: number) => void }; scale: { set: (value: number) => void } };
        root.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
        root.scale.set(camera.zoom);

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
