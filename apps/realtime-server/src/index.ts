import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { normalizeVector } from "@palpalworld/game-core";
import type { ClientToServerEvents, PlayerInputPayload, PlayerPublicState, ServerToClientEvents } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";
import { BuildingService } from "./buildings/BuildingService";
import { CombatService } from "./combat/CombatService";
import { CraftingService } from "./crafting/CraftingService";
import { CreatureService } from "./creatures/CreatureService";
import { InventoryStore } from "./inventory/InventoryStore";
import { ResourceService } from "./resources/ResourceService";
import { WorldState } from "./world/WorldState";

const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: clientOrigin }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "palpalworld-realtime-server" });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
  },
});

const world = new WorldState();
const inventories = new InventoryStore();
const resources = new ResourceService(world);
const creatures = new CreatureService(world);
const combat = new CombatService(world, creatures);
const crafting = new CraftingService(inventories);
const buildings = new BuildingService(world, inventories);
const lastInputs = new Map<string, PlayerInputPayload["movement"]>();

function createPlayer(socketId: string, nickname: string): PlayerPublicState {
  const safeNickname = nickname.trim().slice(0, 16) || `Player-${socketId.slice(0, 4)}`;
  return {
    id: socketId,
    nickname: safeNickname,
    position: { x: 160 + Math.random() * 120, y: 160 + Math.random() * 120 },
    direction: "down",
    hp: 100,
    maxHp: 100,
  };
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
  }
}

io.on("connection", (socket) => {
  socket.on("client:join_world", ({ nickname }) => {
    const player = createPlayer(socket.id, nickname);
    world.players.set(socket.id, player);
    socket.emit("server:inventory_updated", inventories.createStarterInventory(socket.id));

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

  socket.on("client:place_building", ({ buildingType, position }) => {
    const result = buildings.place(socket.id, buildingType, position);
    if (!result.ok) {
      const reasonMessage = {
        missing_player: "플레이어 정보를 찾을 수 없습니다.",
        missing_building: "알 수 없는 건물입니다.",
        out_of_range: "너무 멀리 지을 수 없습니다.",
        missing_materials: "건설 재료가 부족합니다.",
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
    lastInputs.delete(socket.id);

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
    player.position = {
      x: player.position.x + movement.x * WORLD.playerMoveSpeed * deltaSeconds,
      y: player.position.y + movement.y * WORLD.playerMoveSpeed * deltaSeconds,
    };

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

httpServer.listen(port, () => {
  console.log(`PalPalWorld realtime server listening on http://localhost:${port}`);
});
