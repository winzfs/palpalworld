const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-room-session-gate]';
const log = (m) => console.log(`${tag} ${m}`);

if (!s.includes('../multiplayer/RoomLobby')) {
  s = s.replace(
    'import { LogPanel } from "../logs/LogPanel";\n',
    'import { LogPanel } from "../logs/LogPanel";\nimport { RoomLobby } from "../multiplayer/RoomLobby";\nimport { getActiveRoomId, leaveGameRoom, roomEventName, type GameRoom } from "../multiplayer/supabaseRooms";\n',
  );
  log('added room imports');
}

const stateAnchor = '  const [nickname, setNickname] = useState("...");\n';
if (s.includes(stateAnchor) && !s.includes('activeRoomId, setActiveRoomId')) {
  s = s.replace(stateAnchor, stateAnchor + '  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => typeof window !== "undefined" ? getActiveRoomId() : null);\n  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);\n');
  log('added room state');
}

const initEffect = '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n';
const roomEffect = `  useEffect(() => {
    const handleRoomChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ roomId?: string | null }>;
      setActiveRoomId(customEvent.detail?.roomId ?? getActiveRoomId());
    };
    window.addEventListener(roomEventName, handleRoomChanged);
    setActiveRoomId(getActiveRoomId());
    return () => window.removeEventListener(roomEventName, handleRoomChanged);
  }, []);
`;
if (s.includes(initEffect) && !s.includes('const handleRoomChanged = (event: Event) =>')) {
  s = s.replace(initEffect, initEffect + roomEffect);
  log('added room event listener');
}

const beforeToggle = '  const handleTogglePixiStage = useCallback(() => {\n';
const handlers = `  const handleEnterRoom = useCallback((room: GameRoom) => {
    setCurrentRoom(room);
    setActiveRoomId(room.room_id);
    setChatLines((prev) => [...prev.slice(-5), `[room] ${room.room_name} 입장`]);
    applyDemoSnapshot(true);
  }, [applyDemoSnapshot]);
  const handleLeaveRoom = useCallback(() => {
    const leavingRoomId = activeRoomId;
    void leaveGameRoom(leavingRoomId);
    setCurrentRoom(null);
    setActiveRoomId(null);
    setMenuOpen(false);
    setInventoryOpen(false);
    setSelectedBuilding(null);
    setSelectedStationBuilding(null);
    setChatLines((prev) => [...prev.slice(-5), "[room] 방에서 나왔습니다."]);
  }, [activeRoomId]);

`;
if (s.includes(beforeToggle) && !s.includes('const handleEnterRoom = useCallback((room: GameRoom)')) {
  s = s.replace(beforeToggle, handlers + beforeToggle);
  log('added room handlers');
}

const returnAnchor = '  return (\n    <main className={`game-shell';
const lobbyReturn = '  if (!activeRoomId) return <RoomLobby nickname={nickname === "..." ? "플레이어" : nickname} onEnterRoom={handleEnterRoom} />;\n\n';
if (s.includes(returnAnchor) && !s.includes('return <RoomLobby nickname=')) {
  s = s.replace(returnAnchor, lobbyReturn + returnAnchor);
  log('added lobby gate');
}

const menuButton = '        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>\n';
const menuWithLeave = menuButton + '        <button className="hud-leave-room-button" onClick={handleLeaveRoom}>방 나가기</button>\n        {currentRoom ? <div className="hud-room-badge">{currentRoom.room_name}</div> : null}\n';
if (s.includes(menuButton) && !s.includes('hud-leave-room-button')) {
  s = s.replace(menuButton, menuWithLeave);
  log('added leave room button');
}

const activeContentDeps = '  }, [activeMenuTab, chatLines, handleCraft, handleCraftBuildingItem, inventory, nickname, objectiveText, snapshot]);\n';
if (s.includes(activeContentDeps) && !s.includes('currentRoom?.room_name')) {
  // Keep dependency list stable for existing content. The room badge uses currentRoom in JSX only.
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');
