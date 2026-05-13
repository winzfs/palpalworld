import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { normalizeVector } from "@palpalworld/game-core";
import type { ClientToServerEvents, PlayerInputPayload, PlayerPublicState, ServerToClientEvents } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";
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

    socket.emit("server:inventory_updated", inventories.addItem(socket.id, result.itemId, result.amount));
    socket.emit("server:toast", {
      type: "success",
      message: `${result.itemId} ${result.amount}개를 획득했습니다.`,
    });
    io.emit("server:entity_updated", result.resource);
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
