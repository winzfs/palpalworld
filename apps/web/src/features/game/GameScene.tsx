"use client";

import { useEffect, useRef } from "react";
import { WORLD, type EntityId, type ResourceNodeState, type Vector2, type WorldSnapshot } from "@palpalworld/shared";
import { SpriteRenderer } from "../rendering/SpriteRenderer";
import { TileMapRenderer } from "../rendering/TileMapRenderer";

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
  private renderer = new SpriteRenderer();
  private tileMapRenderer = new TileMapRenderer();
  private keys = new Set<string>();
  private animationFrame = 0;
  private snapshot: WorldSnapshot | null = null;
  private previousPlayerPositions = new Map<string, Vector2>();
  private movingPlayerIds = new Set<string>();
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
    this.context.imageSmoothingEnabled = false;
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
    this.movingPlayerIds.clear();

    for (const player of snapshot.players) {
      const previous = this.previousPlayerPositions.get(player.id);
      const moved = previous ? Math.hypot(player.position.x - previous.x, player.position.y - previous.y) > 0.15 : false;
      if (moved) this.movingPlayerIds.add(player.id);
      this.previousPlayerPositions.set(player.id, { ...player.position });
    }

    this.snapshot = snapshot;
    this.localPlayerId = localPlayerId;
  }

  getNearestInteractableId(): EntityId | null {
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer || !this.snapshot) return null;

    let nearest: ResourceNodeState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const resource of this.snapshot.resources) {
      const distance = Math.hypot(resource.position.x - localPlayer.x, resource.position.y - localPlayer.y);
      if (distance > WORLD.interactRange || distance >= nearestDistance) continue;
      nearest = resource;
      nearestDistance = distance;
    }

    return nearest?.id ?? null;
  }

  getLocalPlayerPosition() {
    return this.snapshot?.players.find((player) => player.id === this.localPlayerId)?.position ?? null;
  }

  private resize = () => {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = this.root.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = false;
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
    const now = performance.now();

    this.tileMapRenderer.draw(ctx, rect.width, rect.height, cameraX, cameraY);
    this.drawBuildings(ctx, cameraX, cameraY);
    this.drawResources(ctx, cameraX, cameraY);
    this.drawCreatures(ctx, cameraX, cameraY);
    this.drawPlayers(ctx, cameraX, cameraY, now);
    this.drawInteractionHint(ctx, cameraX, cameraY);
  }

  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const building of this.snapshot.buildings) {
      this.renderer.drawBuilding(ctx, building, building.position.x - cameraX, building.position.y - cameraY);
    }
  }

  private drawResources(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const resource of this.snapshot.resources) {
      this.renderer.drawResource(ctx, resource, resource.position.x - cameraX, resource.position.y - cameraY);
    }
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const creature of this.snapshot.creatures) {
      this.renderer.drawCreature(ctx, creature, creature.position.x - cameraX, creature.position.y - cameraY);
    }
  }

  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number) {
    if (!this.snapshot) return;
    for (const player of this.snapshot.players) {
      const isLocal = player.id === this.localPlayerId;
      const isMoving = this.movingPlayerIds.has(player.id);
      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY, isLocal, isMoving, now);
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
    ctx.textAlign = "center";
    ctx.fillText("E / 상호작용", x, y - 39);
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
