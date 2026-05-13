"use client";

import { useEffect, useRef } from "react";
import { WORLD, type EntityId, type ResourceNodeState, type WorldSnapshot } from "@palpalworld/shared";

export type GameSceneInput = {
  x: number;
  y: number;
  primary: boolean;
  secondary: boolean;
};

export class GameWorldScene {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private keys = new Set<string>();
  private animationFrame = 0;
  private snapshot: WorldSnapshot | null = null;
  private localPlayerId: string | null = null;
  private onInputChange: (input: GameSceneInput) => void;
  private onInteract: () => void;

  constructor(root: HTMLDivElement, onInputChange: (input: GameSceneInput) => void, onInteract: () => void) {
    this.root = root;
    this.onInputChange = onInputChange;
    this.onInteract = onInteract;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.root.appendChild(this.canvas);

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.resize();
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.remove();
  }

  applySnapshot(snapshot: WorldSnapshot, localPlayerId: string | null) {
    this.snapshot = snapshot;
    this.localPlayerId = localPlayerId;
  }

  getNearestInteractableId(): EntityId | null {
    const localPlayer = this.snapshot?.players.find((player) => player.id === this.localPlayerId);
    if (!localPlayer || !this.snapshot) return null;

    let nearest: ResourceNodeState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const resource of this.snapshot.resources) {
      const distance = Math.hypot(resource.position.x - localPlayer.position.x, resource.position.y - localPlayer.position.y);
      if (distance > WORLD.interactRange || distance >= nearestDistance) continue;
      nearest = resource;
      nearestDistance = distance;
    }

    return nearest?.id ?? null;
  }

  private resize = () => {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = this.root.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "e" && !this.keys.has(key)) {
      this.onInteract();
    }
    this.keys.add(key);
    this.emitKeyboardInput();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
    this.emitKeyboardInput();
  };

  private emitKeyboardInput() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");

    this.onInputChange({
      x: Number(right) - Number(left),
      y: Number(down) - Number(up),
      primary: this.keys.has(" "),
      secondary: this.keys.has("e"),
    });
  }

  private loop = () => {
    this.draw();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private draw() {
    const rect = this.root.getBoundingClientRect();
    const ctx = this.context;
    ctx.clearRect(0, 0, rect.width, rect.height);

    const localPlayer = this.snapshot?.players.find((player) => player.id === this.localPlayerId);
    const cameraX = localPlayer ? localPlayer.position.x - rect.width / 2 : 0;
    const cameraY = localPlayer ? localPlayer.position.y - rect.height / 2 : 0;

    this.drawGrid(ctx, rect.width, rect.height, cameraX, cameraY);
    this.drawResources(ctx, cameraX, cameraY);
    this.drawCreatures(ctx, cameraX, cameraY);
    this.drawPlayers(ctx, cameraX, cameraY);
    this.drawInteractionHint(ctx, cameraX, cameraY);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#166534");
    gradient.addColorStop(0.55, "#14532d");
    gradient.addColorStop(1, "#064e3b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const tileSize = 32;
    const startX = -((cameraX % tileSize) + tileSize);
    const startY = -((cameraY % tileSize) + tileSize);

    for (let x = startX; x < width + tileSize; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = startY; y < height + tileSize; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawResources(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const resource of this.snapshot.resources) {
      const x = resource.position.x - cameraX;
      const y = resource.position.y - cameraY;
      const ratio = resource.remainingAmount / resource.maxAmount;

      ctx.fillStyle = this.resourceColor(resource.resourceType);
      ctx.beginPath();
      ctx.roundRect(x - 16, y - 16, 32, 32, 9);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x - 22, y + 22, 44, 5);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x - 22, y + 22, 44 * ratio, 5);

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${resource.resourceType} ${resource.remainingAmount}`, x, y - 22);
    }
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const creature of this.snapshot.creatures) {
      const x = creature.position.x - cameraX;
      const y = creature.position.y - cameraY;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(creature.speciesId, x, y - 20);
    }
  }

  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const player of this.snapshot.players) {
      const x = player.position.x - cameraX;
      const y = player.position.y - cameraY;
      const isLocal = player.id === this.localPlayerId;

      ctx.fillStyle = isLocal ? "#38bdf8" : "#a78bfa";
      ctx.beginPath();
      ctx.arc(x, y, isLocal ? 17 : 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(player.nickname, x, y - 24);

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x - 22, y + 22, 44, 5);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x - 22, y + 22, 44 * (player.hp / player.maxHp), 5);
    }
  }

  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const nearestId = this.getNearestInteractableId();
    const target = this.snapshot?.resources.find((resource) => resource.id === nearestId);
    if (!target) return;

    const x = target.position.x - cameraX;
    const y = target.position.y - cameraY;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 23, y - 23, 46, 46, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.beginPath();
    ctx.roundRect(x - 55, y - 56, 110, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px system-ui";
    ctx.fillText("E / 상호작용", x, y - 39);
  }

  private resourceColor(resourceType: ResourceNodeState["resourceType"]) {
    if (resourceType === "wood") return "#854d0e";
    if (resourceType === "stone") return "#64748b";
    if (resourceType === "fiber") return "#22c55e";
    if (resourceType === "berry") return "#dc2626";
    return "#94a3b8";
  }
}

export function GameScene({
  onReady,
  onInputChange,
  onInteract,
}: {
  onReady: (scene: GameWorldScene) => void;
  onInputChange: (input: GameSceneInput) => void;
  onInteract: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const scene = new GameWorldScene(rootRef.current, onInputChange, onInteract);
    onReady(scene);
    return () => scene.destroy();
  }, [onInputChange, onInteract, onReady]);

  return <div ref={rootRef} className="game-canvas-root" aria-label="Game canvas" />;
}
