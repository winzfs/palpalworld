import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { normalizeVector } from "@palpalworld/game-core";
import type { ClientToServerEvents, PlayerPublicState, ServerToClientEvents, WorldSnapshot } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";

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

const players = new Map<string, PlayerPublicState>();
const lastInputs = new Map<string, { x: number; y: number }>();

function createSnapshot(): WorldSnapshot {
  return {
    worldId: WORLD.defaultWorldId,
    serverTime: Date.now(),
    players: [...players.values()],
    creatures: [],
    resources: [
      { id: "tree-1", resourceType: "wood", position: { x: 320, y: 240 }, remainingAmount: 100 },
      { id: "stone-1", resourceType: "stone", position: { x: 520, y: 360 }, remainingAmount: 100 },
    ],
  };
}

io.on("connection", (socket) => {
  socket.on("client:join_world", ({ nickname }) => {
    const safeNickname = nickname.trim().slice(0, 16) || `Player-${socket.id.slice(0, 4)}`;
    players.set(socket.id, {
      id: socket.id,
      nickname: safeNickname,
      position: { x: 160 + Math.random() * 120, y: 160 + Math.random() * 120 },
      direction: "down",
      hp: 100,
      maxHp: 100,
    });

    socket.emit("server:toast", { type: "success", message: "스타터 섬에 접속했습니다." });
    io.emit("server:chat_message", {
      playerId: socket.id,
      nickname: "System",
      message: `${safeNickname} 님이 접속했습니다.`,
      sentAt: Date.now(),
    });
  });

  socket.on("client:player_input", (payload) => {
    lastInputs.set(socket.id, payload.movement);
  });

  socket.on("client:chat_message", ({ message }) => {
    const player = players.get(socket.id);
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
    const player = players.get(socket.id);
    players.delete(socket.id);
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

  for (const [playerId, player] of players.entries()) {
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
  io.emit("server:world_snapshot", createSnapshot());
}, WORLD.snapshotRateMs);

httpServer.listen(port, () => {
  console.log(`PalPalWorld realtime server listening on http://localhost:${port}`);
});
