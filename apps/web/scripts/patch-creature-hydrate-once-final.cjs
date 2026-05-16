const fs=require('fs');
const path=require('path');
const f=path.join(__dirname,'..','src','features','game','GameClientTileDemoStation.tsx');
let s=fs.readFileSync(f,'utf8');
let c=false;
function r(a,b){if(!s.includes(a))return;s=s.split(a).join(b);c=true;}
r('    const id = window.setInterval(load, 2500);\n    return () => { stopped = true; window.clearInterval(id); };','    return () => { stopped = true; };');
if(c)fs.writeFileSync(f,s);
console.log(c?'[patch-creature-hydrate-once-final] patched':'[patch-creature-hydrate-once-final] no changes');
