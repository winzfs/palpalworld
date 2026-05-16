const fs=require('fs');const path=require('path');
const f=path.join(__dirname,'..','src','features','game','GameClientTileDemoStation.tsx');
let s=fs.readFileSync(f,'utf8');let c=false;
function r(a,b){if(s.includes(b))return;if(!s.includes(a))return;s=s.replace(a,b);c=true;}
r('  const lastUiSnapshotAtRef = useRef(0);\n','  const lastUiSnapshotAtRef = useRef(0);\n  const dbPosOnceRef = useRef(false);\n');
r('      const byId = new Map(demoCreaturesRef.current.map((creature) => [creature.id, creature]));\n      let changed = false;','      const useDbPos = !dbPosOnceRef.current;\n      const byId = new Map(demoCreaturesRef.current.map((creature) => [creature.id, creature]));\n      let changed = false;');
r('          existing.currentTile = { ...(remoteCreature as any).currentTile };','          if (useDbPos) existing.position = { ...remoteCreature.position };\n          existing.currentTile = { ...(remoteCreature as any).currentTile };');
r('      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);','      if (useDbPos) dbPosOnceRef.current = true;\n      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);');
if(c)fs.writeFileSync(f,s);
