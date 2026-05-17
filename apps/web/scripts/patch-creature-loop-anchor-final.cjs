const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf('const guardedLoop = `');
const end = start >= 0 ? s.indexOf('`;', start + 21) : -1;
if (start < 0 || end < 0) {
  console.log('[patch-creature-loop-anchor-final] missing guarded loop');
  process.exit(0);
}
const guardedLoop = s.slice(start + 'const guardedLoop = `'.length, end);
const anchors = [
  '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);',
  '      // Supabase world sync stops local creature AI here.\n      applyDemoSnapshot(false);',
  '      // Supabase 월드 동기화 기준을 맞추기 위해 클라이언트별 로컬 몬스터 AI 이동은 중지한다.\n      // 몬스터 위치는 다음 단계에서 Supabase world_creatures 좌표를 권위 소스로 적용한다.\n      applyDemoSnapshot(false);'
];
let changed = false;
if (!s.includes('lastCreatureBroadcastAtRef.current = now;')) {
  for (const anchor of anchors) {
    if (s.includes(anchor)) {
      s = s.replace(anchor, guardedLoop);
      changed = true;
      break;
    }
  }
}
if (changed) fs.writeFileSync(f, s);
console.log(changed ? '[patch-creature-loop-anchor-final] patched' : '[patch-creature-loop-anchor-final] no changes');
