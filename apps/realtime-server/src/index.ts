import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { normalizeVector } from "@palpalworld/game-core";
import type { ClientToServerEvents, PlayerInputPayload, PlayerPublicState, ServerToClientEvents } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";
import {
  DEFAULT_PLAYER_TILE,
  MAP_TILE_SIZE,
  clampPositionToTile,
  getNeighborTile,
  getPortalDirectionAtPosition,
  getSpawnPositionAfterTravel,
  type MapDirection,
} from "../../../packages/shared/src/worldTiles";
import { BuildingService } from "./buildings/BuildingService";
import { CombatService } from "./combat/CombatService";
import { CraftingService } from "./crafting/CraftingService";
import { CreatureService } from "./creatures/CreatureService";
import { EquipmentService } from "./equipment/EquipmentService";
import { InventoryStore } from "./inventory/InventoryStore";
import { PlayerService } from "./players/PlayerService";
import { ResourceService } from "./resources/ResourceService";
import { StatService } from "./stats/StatService";
import { WorldState } from "./world/WorldState";

const port = Number(process.env.PORT ?? 4000);
const configuredClientOrigin = process.env.CLIENT_ORIGIN;

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (configuredClientOrigin && origin === configuredClientOrigin) return true;
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.includes(".app.github.dev")) return true;
  if (origin.includes(".githubpreview.dev")) return true;
  return false;
}

const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    callback(null, isAllowedOrigin(origin));
  },
};

const app = express();
app.use(cors(corsOptions));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "palpalworld-realtime-server" });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST"],
  },
});

const world = new WorldState();
const inventories = new InventoryStore();
const equipment = new EquipmentService(inventories);
const stats = new StatService(inventories);
const players = new PlayerService(equipment, stats);
const resources = new ResourceService(world);
const creatures = new CreatureService(world);
const combat = new CombatService(world, creatures);
const crafting = new CraftingService(inventories);
const buildings = new BuildingService(world, inventories);
const lastInputs = new Map<string, PlayerInputPayload["movement"]>();
const lastTravelAt = new Map<string, number>();

function createPlayer(socketId: string, nickname: string): PlayerPublicState {
  const safeNickname = nickname.trim().slice(0, 16) || `Player-${socketId.slice(0, 4)}`;
  const profile = players.getPlayerProfile(socketId);
  return {
    id: socketId,
    nickname: safeNickname,
    position: { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.height / 2 },
    direction: "down",
    currentTile: { ...DEFAULT_PLAYER_TILE },
    hp: profile.stats.maxHp,
    maxHp: profile.stats.maxHp,
  };
}

function travelPlayerIfAtPortal(player: PlayerPublicState, forcedDirection?: MapDirection) {
  const now = Date.now();
  const previousTravel = lastTravelAt.get(player.id) ?? 0;
  if (now - previousTravel < 900) return false;

  const direction = forcedDirection ?? getPortalDirectionAtPosition(player.position, player.currentTile);
  if (!direction) return false;

  const nextTile = getNeighborTile(player.currentTile, direction);
  if (!nextTile) return false;

  const previousPosition = { ...player.position };
  player.currentTile = { ...nextTile };
  player.position = getSpawnPositionAfterTravel(direction, previousPosition);
  lastTravelAt.set(player.id, now);
  return true;
}

function handleAttack(playerId: string) {
  const result = combat.attackNearestCreature(playerId);
  if (!result.ok) return;

  io.emit("server:entity_updated", result.creature);
  const playerSocket = io.sockets.sockets.get(playerId);
  playerSocket?.emit("server:toast", {
    type: result.defeated ? "success" : "info",
    message: result.defeated
      ? `${result.creature.speciesId} 처치! ${result.drops.length > 0 ? "전리품 획득" : "전리품 없음"}`
      : `${result.creature.speciesId}에게 ${result.damage} 피해`,
  });

  if (result.defeated) {
    playerSocket?.emit("server:inventory_updated", inventories.addItems(playerId, result.drops));
    playerSocket?.emit("server:player_profile_updated", players.addExp(playerId, 25 + result.creature.level * 8));
  }
}

io.on("connection", (socket) => {
  socket.on("client:join_world", ({ nickname }) => {
    socket.emit("server:inventory_updated", inventories.createStarterInventory(socket.id));
    const profile = players.createPlayerProfile(socket.id);
    const player = createPlayer(socket.id, nickname);
    world.players.set(socket.id, player);

    socket.emit("server:equipment_updated", profile.equipment);
    socket.emit("server:player_profile_updated", profile);
    socket.emit("server:toast", { type: "success", message: "스타터 섬에 접속했습니다." });
    io.emit("server:chat_message", {
      playerId: socket.id,
      nickname: "System",
      message: `${player.nickname} 님이 접속했습니다.`,
      sentAt: Date.now(),
    });
  });

  socket.on("client:player_input", (payload) => {
    lastInputs.set(socket.id, payload.movement);
    if (payload.primaryAction) {
      handleAttack(socket.id);
    }
    if (payload.secondaryAction) {
      const player = world.players.get(socket.id);
      if (player && travelPlayerIfAtPortal(player)) {
        socket.emit("server:toast", { type: "success", message: "다른 맵 타일로 이동했습니다." });
      }
    }
  });

  (socket as any).on("client:travel_tile", ({ direction }: { direction?: MapDirection }) => {
    const player = world.players.get(socket.id);
    if (!player) return;
    const moved = travelPlayerIfAtPortal(player, direction);
    socket.emit("server:toast", {
      type: moved ? "success" : "warning",
      message: moved ? "다른 맵 타일로 이동했습니다." : "포탈 가까이에서만 이동할 수 있습니다.",
    });
  });

  socket.on("client:interact_entity", ({ entityId }) => {
    const result = resources.harvest(socket.id, entityId);

    if (!result.ok) {
      const reasonMessage = {
        missing_player: "플레이어 정보를 찾을 수 없습니다.",
        missing_resource: "대상을 찾을 수 없습니다.",
        out_of_range: "대상과 너무 멀리 떨어져 있습니다.",
        depleted: "이미 고갈된 자원입니다.",
      }[result.reason];
      socket.emit("server:toast", { type: "warning", message: reasonMessage });
      return;
    }

    socket.emit("server:inventory_updated", inventories.addItems(socket.id, result.drops));
    socket.emit("server:toast", {
      type: "success",
      message: result.drops.map((drop) => `${drop.itemId} ${drop.amount}개`).join(", ") + " 획득",
    });
    io.emit("server:entity_updated", result.resource);
  });

  socket.on("client:craft_item", ({ recipeId }) => {
    const result = crafting.craft(socket.id, recipeId);
    if (!result.ok) {
      const reasonMessage = {
        missing_recipe: "알 수 없는 제작법입니다.",
        missing_materials: "재료가 부족합니다.",
      }[result.reason];
      socket.emit("server:toast", { type: "warning", message: reasonMessage });
      return;
    }

    socket.emit("server:inventory_updated", result.inventory);
    socket.emit("server:toast", { type: "success", message: result.message });
  });

  socket.on("client:equip_item", ({ itemInstanceId }) => {
    const result = equipment.equip(socket.id, itemInstanceId);
    if (!result.ok) {
      const reasonMessage = {
        missing_item: "장비 아이템을 찾을 수 없습니다.",
        not_equippable: "착용할 수 없는 아이템입니다.",
      }[result.reason];
      socket.emit("server:toast", { type: "warning", message: reasonMessage });
      return;
    }

    const player = world.players.get(socket.id);
    const profile = players.getPlayerProfile(socket.id, result.equipment);
    if (player) {
      player.maxHp = profile.stats.maxHp;
      player.hp = Math.min(player.hp, player.maxHp);
    }
    socket.emit("server:equipment_updated", result.equipment);
    socket.emit("server:player_profile_updated", profile);
    socket.emit("server:toast", { type: "success", message: result.message });
  });

  socket.on("client:unequip_item", ({ slot }) => {
    const result = equipment.unequip(socket.id, slot);
    if (!result.ok) {
      socket.emit("server:toast", { type: "warning", message: "해제할 장비가 없습니다." });
      return;
    }

    const player = world.players.get(socket.id);
    const profile = players.getPlayerProfile(socket.id, result.equipment);
    if (player) {
      player.maxHp = profile.stats.maxHp;
      player.hp = Math.min(player.hp, player.maxHp);
    }
    socket.emit("server:equipment_updated", result.equipment);
    socket.emit("server:player_profile_updated", profile);
    socket.emit("server:toast", { type: "success", message: result.message });
  });

  socket.on("client:place_building", ({ buildingType, position, itemId }) => {
    const result = buildings.place(socket.id, buildingType, clampPositionToTile(position), itemId);
    if (!result.ok) {
      const reasonMessage = {
        missing_player: "플레이어 정보를 찾을 수 없습니다.",
        missing_building: "알 수 없는 건물입니다.",
        out_of_range: "너무 멀리 지을 수 없습니다.",
        missing_materials: "건설 아이템이 없습니다.",
        blocked: "이미 다른 건물이 있는 위치입니다.",
      }[result.reason];
      socket.emit("server:toast", { type: "warning", message: reasonMessage });
      return;
    }

    socket.emit("server:inventory_updated", inventories.getInventory(socket.id));
    socket.emit("server:toast", { type: "success", message: result.message });
    io.emit("server:entity_spawned", result.building);
  });

  socket.on("client:chat_message", ({ message }) => {
    const player = world.players.get(socket.id);
    if (!player) return;
    const safeMessage = message.trim().slice(0, 200);
    if (!safeMessage) return;

    io.emit("server:chat_message", {
      playerId: socket.id,
      nickname: player.nickname,
      message: safeMessage,
      sentAt: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    const player = world.players.get(socket.id);
    world.players.delete(socket.id);
    inventories.deleteInventory(socket.id);
    players.deletePlayerProfile(socket.id);
    lastInputs.delete(socket.id);
    lastTravelAt.delete(socket.id);

    if (player) {
      io.emit("server:chat_message", {
        playerId: socket.id,
        nickname: "System",
        message: `${player.nickname} 님이 나갔습니다.`,
        sentAt: Date.now(),
      });
    }
  });
});

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const deltaSeconds = (now - lastTick) / 1000;
  lastTick = now;

  resources.tickRespawns(now);
  creatures.tickRespawns(now);

  for (const [playerId, player] of world.players.entries()) {
    const input = lastInputs.get(playerId) ?? { x: 0, y: 0 };
    const movement = normalizeVector(input);
    const profile = players.getPlayerProfile(playerId);
    const nextPosition = clampPositionToTile({
      x: player.position.x + movement.x * profile.stats.moveSpeed * deltaSeconds,
      y: player.position.y + movement.y * profile.stats.moveSpeed * deltaSeconds,
    });

    player.position = nextPosition;

    if (travelPlayerIfAtPortal(player)) {
      lastInputs.set(playerId, { x: 0, y: 0 });
      const playerSocket = io.sockets.sockets.get(playerId);
      playerSocket?.emit("server:toast", { type: "success", message: "다른 맵 타일로 이동했습니다." });
    }

    if (Math.abs(movement.x) > Math.abs(movement.y)) {
      player.direction = movement.x >= 0 ? "right" : "left";
    } else if (movement.y !== 0) {
      player.direction = movement.y >= 0 ? "down" : "up";
    }
  }
}, 1000 / 30);

setInterval(() => {
  io.emit("server:world_snapshot", world.createSnapshot());
}, WORLD.snapshotRateMs);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`PalPalWorld realtime server listening on http://0.0.0.0:${port}`);
});
