import type { BuildingState, ResourceNodeState } from "@palpalworld/shared";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

export class EnhancedPrimitiveRenderer extends PrimitiveRenderer {
  override drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const ratio = Math.max(0, Math.min(1, resource.remainingAmount / resource.maxAmount));
    this.shadow(ctx, x, y + 16, 52, 14);
    if (resource.resourceType === "wood" || resource.resourceType === "hardwood") this.tree(ctx, x, y, resource.resourceType === "hardwood");
    else if (["stone", "ore", "coal"].includes(resource.resourceType)) this.rock(ctx, x, y, resource.resourceType);
    else if (resource.resourceType === "berry") this.bush(ctx, x, y);
    else if (resource.resourceType === "fiber" || resource.resourceType === "herb") this.plants(ctx, x, y, resource.resourceType === "herb");
    else this.crystal(ctx, x, y, resource.resourceType);
    this.bar(ctx, x, y + 31, 48, ratio, "#facc15");
    this.text(ctx, `${resource.resourceType} ${resource.remainingAmount}`, x, y - 35);
  }

  override drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    this.shadow(ctx, x, y + 25, 74, 19);
    if (building.type === "workbench") this.workbench(ctx, x, y);
    else if (building.type === "campfire") this.campfire(ctx, x, y);
    else if (building.type === "storage_box") this.box(ctx, x, y);
    else if (building.type === "furnace") this.furnace(ctx, x, y);
    else if (building.type === "base_core") this.core(ctx, x, y);
    else if (building.type === "farm_plot") this.farm(ctx, x, y);
    else if (building.type === "pal_bed") this.bed(ctx, x, y);
    else if (building.type === "wood_wall") this.wall(ctx, x, y);
    else if (building.type === "wood_floor") this.floor(ctx, x, y);
    else this.generic(ctx, x, y);
    this.bar(ctx, x, y + 40, 56, building.hp / building.maxHp, "#22c55e");
    this.text(ctx, building.type, x, y - 56);
  }

  private tree(ctx: CanvasRenderingContext2D, x: number, y: number, hard: boolean) {
    this.rect(ctx, x - 8, y - 2, 16, 31, 5, hard ? "#5b3713" : "#7c4a1d", "#3f2410");
    const colors = hard ? ["#064e3b", "#166534", "#4ade80"] : ["#14532d", "#16a34a", "#86efac"];
    ctx.fillStyle = colors[0]; ctx.strokeStyle = "#052e16"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 18, hard ? 28 : 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors[1];
    [[-17,-17,15],[14,-20,16],[-7,-31,14],[10,-7,17],[-20,-3,13]].forEach(([ox,oy,r])=>{ctx.beginPath();ctx.arc(x+ox,y+oy,r,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.arc(x-12,y-27,8,0,Math.PI*2); ctx.arc(x+9,y-23,7,0,Math.PI*2); ctx.fill();
  }

  private rock(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    ctx.fillStyle = type === "coal" ? "#27272a" : type === "ore" ? "#64748b" : "#71717a";
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x-26,y+15); ctx.lineTo(x-19,y-7); ctx.lineTo(x-7,y-23); ctx.lineTo(x+10,y-20); ctx.lineTo(x+27,y-3); ctx.lineTo(x+19,y+17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = type === "coal" ? "#71717a" : "#cbd5e1"; ctx.beginPath(); ctx.moveTo(x-10,y-15); ctx.lineTo(x+7,y-17); ctx.lineTo(x+1,y-3); ctx.closePath(); ctx.fill();
    if (type === "ore") { ctx.fillStyle="#38bdf8"; ctx.strokeStyle="#0e7490"; [[-14,-1],[4,-9],[13,3]].forEach(([ox,oy])=>this.diamond(ctx,x+ox,y+oy,9,16)); }
    if (type === "coal") { ctx.fillStyle="rgba(255,255,255,.22)"; ctx.fillRect(x-11,y-11,13,4); ctx.fillRect(x+6,y+3,10,3); }
  }

  private bush(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle="#166534"; ctx.strokeStyle="#052e16"; ctx.lineWidth=3;
    [[-16,0,16],[0,-9,19],[17,1,16],[-2,9,19]].forEach(([ox,oy,r])=>{ctx.beginPath();ctx.arc(x+ox,y+oy,r,0,Math.PI*2);ctx.fill();ctx.stroke();});
    ctx.fillStyle="#ef4444"; [[-16,-7],[-4,-14],[10,-7],[18,6],[-7,9],[4,5]].forEach(([ox,oy])=>{ctx.beginPath();ctx.arc(x+ox,y+oy,4,0,Math.PI*2);ctx.fill();});
  }

  private plants(ctx: CanvasRenderingContext2D, x: number, y: number, herb: boolean) {
    ctx.strokeStyle = herb ? "#86efac" : "#22c55e"; ctx.lineWidth=4; ctx.lineCap="round";
    for(let i=-4;i<=4;i++){const h=16+(Math.abs(i)%3)*5;ctx.beginPath();ctx.moveTo(x+i*6,y+16);ctx.quadraticCurveTo(x+i*5+(i%2?-5:5),y+5,x+i*5,y+16-h);ctx.stroke();}
    if(herb){ctx.fillStyle="#f0fdf4";ctx.beginPath();ctx.arc(x-8,y-4,4,0,Math.PI*2);ctx.arc(x+9,y-8,4,0,Math.PI*2);ctx.fill();}
  }

  private crystal(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    ctx.fillStyle = type === "ice_crystal" ? "#67e8f9" : "#fb923c"; ctx.strokeStyle = type === "ice_crystal" ? "#0e7490" : "#9a3412"; ctx.lineWidth=3;
    this.diamond(ctx,x,y,24,42); this.diamond(ctx,x-13,y+5,17,31); this.diamond(ctx,x+14,y+7,16,28);
  }

  private workbench(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-33,y-18,66,20,5,"#a16207","#3f2410");this.rect(ctx,x-29,y-23,58,12,4,"#d97706","#3f2410");ctx.fillStyle="#78350f";ctx.fillRect(x-27,y+1,8,28);ctx.fillRect(x+19,y+1,8,28);ctx.fillStyle="#e5e7eb";ctx.fillRect(x-18,y-9,24,4);ctx.fillStyle="#64748b";ctx.fillRect(x+9,y-11,16,7);}
  private campfire(ctx: CanvasRenderingContext2D,x:number,y:number){ctx.strokeStyle="#57534e";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+17,32,11,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#78350f";ctx.save();ctx.translate(x,y+16);ctx.rotate(.35);ctx.fillRect(-24,-4,48,8);ctx.rotate(-.75);ctx.fillRect(-24,-4,48,8);ctx.restore();const f=Math.sin(performance.now()/120)*2;ctx.fillStyle="#ef4444";ctx.beginPath();ctx.moveTo(x,y-30-f);ctx.bezierCurveTo(x+18,y-5,x+10,y+12,x,y+12);ctx.bezierCurveTo(x-13,y+8,x-18,y-7,x,y-30-f);ctx.fill();ctx.fillStyle="#facc15";ctx.beginPath();ctx.moveTo(x,y-18+f);ctx.bezierCurveTo(x+9,y-3,x+5,y+9,x,y+9);ctx.bezierCurveTo(x-7,y+5,x-9,y-5,x,y-18+f);ctx.fill();}
  private box(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-30,y-18,60,38,6,"#92400e","#3f2410");this.rect(ctx,x-30,y-27,60,17,6,"#b45309","#3f2410");ctx.fillStyle="#facc15";ctx.fillRect(x-5,y-9,10,12);}
  private furnace(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-25,y-28,50,58,10,"#64748b","#1f2937");this.rect(ctx,x-16,y-8,32,24,7,"#1f2937","#0f172a");ctx.fillStyle="#f97316";ctx.beginPath();ctx.arc(x,y+4,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#facc15";ctx.beginPath();ctx.arc(x,y+3,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#94a3b8";ctx.fillRect(x-13,y-40,26,15);}
  private core(ctx: CanvasRenderingContext2D,x:number,y:number){const p=.5+Math.sin(performance.now()/360)*.18;ctx.fillStyle=`rgba(56,189,248,${p})`;ctx.beginPath();ctx.arc(x,y-4,36,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#075985";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#0f172a";ctx.beginPath();ctx.moveTo(x,y-37);ctx.lineTo(x+31,y-4);ctx.lineTo(x,y+29);ctx.lineTo(x-31,y-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#67e8f9";ctx.beginPath();ctx.arc(x,y-4,15,0,Math.PI*2);ctx.fill();}
  private farm(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-36,y-25,72,54,6,"#854d0e","#422006");ctx.strokeStyle="rgba(254,243,199,.42)";ctx.lineWidth=2;for(let o=-18;o<=18;o+=12){ctx.beginPath();ctx.moveTo(x-32,y+o);ctx.lineTo(x+32,y+o-7);ctx.stroke();}ctx.strokeStyle="#22c55e";ctx.lineWidth=4;for(let o=-18;o<=18;o+=18){ctx.beginPath();ctx.moveTo(x+o,y+10);ctx.lineTo(x+o-5,y-8);ctx.moveTo(x+o,y+10);ctx.lineTo(x+o+6,y-6);ctx.stroke();}}
  private bed(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-34,y-15,68,38,8,"#92400e","#422006");this.rect(ctx,x-27,y-23,54,28,9,"#38bdf8","#075985");this.rect(ctx,x-24,y-25,20,16,6,"#e0f2fe","#bae6fd");}
  private wall(ctx: CanvasRenderingContext2D,x:number,y:number){for(let i=-2;i<=2;i++)this.rect(ctx,x+i*13-6,y-29,12,58,3,i%2===0?"#92400e":"#a16207","#3f2410");ctx.fillStyle="#78350f";ctx.fillRect(x-33,y-15,66,7);ctx.fillRect(x-33,y+13,66,7);}
  private floor(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-34,y-24,68,48,5,"#a16207","#3f2410");ctx.strokeStyle="#78350f";ctx.lineWidth=2;for(let o=-17;o<=17;o+=17){ctx.beginPath();ctx.moveTo(x+o,y-23);ctx.lineTo(x+o,y+23);ctx.stroke();}}
  private generic(ctx: CanvasRenderingContext2D,x:number,y:number){this.rect(ctx,x-27,y-23,54,46,5,"#7c4a1d","#2a1608");ctx.fillStyle="#b7792f";ctx.strokeStyle="#2a1608";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-32,y-20);ctx.lineTo(x,y-45);ctx.lineTo(x+32,y-20);ctx.closePath();ctx.fill();ctx.stroke();}

  private diamond(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){ctx.beginPath();ctx.moveTo(x,y-h/2);ctx.lineTo(x+w/2,y);ctx.lineTo(x,y+h/2);ctx.lineTo(x-w/2,y);ctx.closePath();ctx.fill();ctx.stroke();}
  private rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke:string){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();}
  private shadow(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){ctx.fillStyle="rgba(0,0,0,.26)";ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);ctx.fill();}
  private bar(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,ratio:number,fill:string){const r=Math.max(0,Math.min(1,ratio));ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(x-w/2,y,w,5);ctx.fillStyle=fill;ctx.fillRect(x-w/2,y,w*r,5);}
  private text(ctx:CanvasRenderingContext2D,text:string,x:number,y:number){ctx.font="12px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.75)";ctx.strokeText(text,x,y);ctx.fillStyle="#fff";ctx.fillText(text,x,y);}
}
