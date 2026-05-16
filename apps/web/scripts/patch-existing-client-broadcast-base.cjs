const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;
function r(a,b,n){ if(source.includes(b)) return; if(!source.includes(a)){ console.log('skip '+n); return;} source=source.replace(a,b); changed=true; console.log('patch '+n); }
function insertAfter(anchor, insertion, n){ if(source.includes(insertion)) return; if(!source.includes(anchor)){ console.log('skip '+n); return;} source=source.replace(anchor, anchor + insertion); changed=true; console.log('patch '+n); }
r('import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n', 'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\nimport { broadcastCreaturePositions, createCreatureBroadcastChannel, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { claimWorldHost, getCurrentMultiplayerPlayerId, getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\nimport { attackWorldCreature, updateWorldCreaturePositions } from "../multiplayer/supabaseWorldCreatures";\n', 'imports');
r('type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };\n', 'type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };\ntype CreatureBroadcastTarget = { x: number; y: number; hp: number; maxHp: number; receivedAt: number };\n', 'target type');
r('const creatureMapSize = creatureMapMax - creatureMapMin;\n', 'const creatureMapSize = creatureMapMax - creatureMapMin;\nconst creatureBroadcastMs = 250;\nconst creatureSnapshotSaveMs = 8000;\nconst creatureHostClaimMs = 2200;\nconst creatureBroadcastLerpPerSecond = 9;\nconst creatureBroadcastSnapDistance = 520;\n', 'constants');
insertAfter('  const lastUiSnapshotAtRef = useRef(0);\n', '  const supabaseClientRef = useRef(getSupabaseClient());\n', 'supabase ref');
insertAfter('  const supabaseClientRef = useRef(getSupabaseClient());\n', '  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n', 'broadcast channel ref');
insertAfter('  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n', '  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n', 'broadcast target ref');
insertAfter('  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n', '  const isCreatureHostRef = useRef(false);\n', 'host ref');
insertAfter('  const isCreatureHostRef = useRef(false);\n', '  const lastCreatureHostClaimAtRef = useRef(0);\n', 'host claim ref');
insertAfter('  const lastCreatureHostClaimAtRef = useRef(0);\n', '  const lastCreatureBroadcastAtRef = useRef(0);\n', 'broadcast tick ref');
insertAfter('  const lastCreatureBroadcastAtRef = useRef(0);\n', '  const lastCreatureSnapshotSaveAtRef = useRef(0);\n', 'snapshot save ref');
if(changed) fs.writeFileSync(target, source);
