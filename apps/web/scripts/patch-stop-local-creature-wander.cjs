const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const oldCall = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);';
const newCall = '      // Supabase 월드 동기화 기준을 맞추기 위해 클라이언트별 로컬 몬스터 AI 이동은 중지한다.\n      // 몬스터 위치는 다음 단계에서 Supabase world_creatures 좌표를 권위 소스로 적용한다.\n      applyDemoSnapshot(false);';

if (source.includes(oldCall)) {
  source = source.replace(oldCall, newCall);
  changed = true;
  console.log('[patch-stop-local-creature-wander] stopped local creature wander loop');
} else if (source.includes(newCall)) {
  console.log('[patch-stop-local-creature-wander] already patched');
} else {
  console.log('[patch-stop-local-creature-wander] target call not found');
}

if (changed) fs.writeFileSync(target, source);
