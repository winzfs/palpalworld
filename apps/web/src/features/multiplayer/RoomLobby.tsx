"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createGameRoom, joinGameRoom, listGameRooms, type GameRoom } from "./supabaseRooms";
import { getSupabaseClient, isSupabaseMultiplayerEnabled } from "./supabaseMultiplayer";

type RoomLobbyProps = {
  nickname: string;
  onEnterRoom: (room: GameRoom) => void;
};

function createDefaultRoomName(nickname: string) {
  const safeName = nickname?.trim() || "팔팔월드";
  return `${safeName}의 방`;
}

export function RoomLobby({ nickname, onEnterRoom }: RoomLobbyProps) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [roomName, setRoomName] = useState(() => createDefaultRoomName(nickname));
  const [manualRoomId, setManualRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("방을 만들거나 목록에서 참가하세요.");

  const refreshRooms = useCallback(async () => {
    if (!client || !isSupabaseMultiplayerEnabled()) {
      setMessage("Supabase 멀티플레이 연결이 비활성화되어 있습니다.");
      return;
    }
    const nextRooms = await listGameRooms(client);
    setRooms(nextRooms);
  }, [client]);

  useEffect(() => {
    void refreshRooms();
    const timer = window.setInterval(() => { void refreshRooms(); }, 2500);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  const handleCreateRoom = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setMessage("방 생성 중...");
    try {
      const room = await createGameRoom(roomName, nickname, client);
      if (!room) {
        setMessage("방 생성에 실패했습니다.");
        return;
      }
      onEnterRoom(room);
    } finally {
      setLoading(false);
    }
  }, [client, nickname, onEnterRoom, roomName]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    if (!client || !roomId) return;
    setLoading(true);
    setMessage("방 참가 중...");
    try {
      const room = await joinGameRoom(roomId, nickname, client);
      if (!room) {
        setMessage("방 참가에 실패했습니다. 방이 닫혔을 수 있습니다.");
        return;
      }
      onEnterRoom(room);
    } finally {
      setLoading(false);
    }
  }, [client, nickname, onEnterRoom]);

  return (
    <main className="room-lobby" aria-label="방 선택">
      <section className="room-lobby__card">
        <div className="room-lobby__title-row">
          <div>
            <p className="room-lobby__eyebrow">PALPALWORLD MULTIPLAYER</p>
            <h1>방을 선택하세요</h1>
          </div>
          <button type="button" onClick={() => void refreshRooms()} disabled={loading}>새로고침</button>
        </div>
        <p className="room-lobby__message">{message}</p>

        <div className="room-lobby__create">
          <label>
            <span>방 이름</span>
            <input value={roomName} maxLength={30} onChange={(event) => setRoomName(event.target.value)} />
          </label>
          <button type="button" onClick={() => void handleCreateRoom()} disabled={loading || !roomName.trim()}>방 만들기</button>
        </div>

        <div className="room-lobby__manual">
          <label>
            <span>방 ID로 참가</span>
            <input value={manualRoomId} placeholder="room_id 붙여넣기" onChange={(event) => setManualRoomId(event.target.value)} />
          </label>
          <button type="button" onClick={() => void handleJoinRoom(manualRoomId.trim())} disabled={loading || !manualRoomId.trim()}>참가</button>
        </div>

        <section className="room-lobby__list" aria-label="열린 방 목록">
          <h2>열린 방</h2>
          {rooms.length <= 0 ? <p className="room-lobby__empty">현재 열린 방이 없습니다. 새 방을 만들어 시작하세요.</p> : null}
          {rooms.map((room) => (
            <article key={room.room_id} className="room-lobby__room">
              <div>
                <strong>{room.room_name}</strong>
                <span>{room.player_count ?? 0}/{room.max_players ?? 8}명 · {room.room_id.slice(0, 8)}</span>
              </div>
              <button type="button" onClick={() => void handleJoinRoom(room.room_id)} disabled={loading}>참가</button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
