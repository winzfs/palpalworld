const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;
function r(a,b,n){ if(source.includes(b)) return; if(!source.includes(a)){ console.log('skip '+n); return;} source=source.replace(a,b); changed=true; console.log('patch '+n); }
r(
'    target.hp = Math.max(0, target.hp - 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]); }\n    else setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);\n    applyDemoSnapshot(true);',
'    const client = supabaseClientRef.current;\n    if (client && isSupabaseMultiplayerEnabled()) {\n      void attackWorldCreature(client, target.id, getCurrentMultiplayerPlayerId(), 18).then((result) => {\n        if (!result) return;\n        target.hp = result.hp;\n        target.maxHp = result.maxHp;\n        if (target.hp <= 0) updateInventory((current) => addInventoryStack(current, "pal_essence", 1));\n        setChatLines((prev) => [...prev.slice(-5), result.defeated ? `[world] ${target.speciesId} 처치! 펄 정수 획득` : `[world] ${target.speciesId}에게 ${result.damageApplied} 피해`]);\n        applyDemoSnapshot(true);\n      });\n      return;\n    }\n    target.hp = Math.max(0, target.hp - 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]); }\n    else setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);\n    applyDemoSnapshot(true);',
'attack rpc');
if(changed) fs.writeFileSync(target, source);
require('./patch-existing-client-broadcast-finalize.cjs');
require('./patch-existing-client-import-merge-final.cjs');
