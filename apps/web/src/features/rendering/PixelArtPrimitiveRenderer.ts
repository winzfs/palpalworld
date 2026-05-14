import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

const PX = 4;
type Pixel = readonly [number, number, string, number?, number?];

export class PixelArtPrimitiveRenderer extends PrimitiveRenderer {
  override drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    this.shadow(ctx, x, y + 22, 14, 4);
    if (resource.resourceType === "wood" || resource.resourceType === "hardwood") this.drawTree(ctx, x, y, resource.resourceType === "hardwood");
    else if (resource.resourceType === "stone" || resource.resourceType === "ore" || resource.resourceType === "coal") this.drawRock(ctx, x, y, resource.resourceType);
    else if (resource.resourceType === "berry") this.drawBerryBush(ctx, x, y);
    else if (resource.resourceType === "fiber" || resource.resourceType === "herb") this.drawGrass(ctx, x, y, resource.resourceType === "herb");
    else this.drawCrystal(ctx, x, y, resource.resourceType);
    this.bar(ctx, x, y + 36, 48, resource.remainingAmount / resource.maxAmount, "#facc15");
    this.text(ctx, `${resource.resourceType} ${resource.remainingAmount}`, x, y - 42);
  }

  override drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const now = performance.now();
    const seed = this.hash(creature.id);
    const bob = Math.round(Math.sin(now / 520 + seed) * 1) * PX;
    const blink = Math.floor(now / 450 + seed) % 7 === 0;
    const yy = y + bob;
    this.shadow(ctx, x, y + 25, 13, 4);
    if (creature.speciesId === "leafbun") this.leafbun(ctx, x, yy, blink);
    else if (creature.speciesId === "droplet") this.droplet(ctx, x, yy, blink);
    else if (creature.speciesId === "sparkit") this.sparkit(ctx, x, yy, now, blink);
    else if (creature.speciesId === "rockturtle") this.rockturtle(ctx, x, yy, blink);
    else if (creature.speciesId === "moleminer") this.moleminer(ctx, x, yy, blink);
    else if (creature.speciesId === "mossboar") this.mossboar(ctx, x, yy, blink);
    else this.genericCreature(ctx, x, yy, blink);
    if (creature.traitIds.length > 0) this.traitSpark(ctx, x, yy);
    this.bar(ctx, x, y + 40, 50, creature.hp / creature.maxHp, "#ef4444");
    this.text(ctx, `${creature.speciesId} Lv.${creature.level}`, x, y - 46);
  }

  override drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    this.shadow(ctx, x, y + 30, 17, 5);
    if (building.type === "workbench") this.workbench(ctx, x, y);
    else if (building.type === "campfire") this.campfire(ctx, x, y);
    else if (building.type === "storage_box") this.storage(ctx, x, y);
    else if (building.type === "furnace") this.furnace(ctx, x, y);
    else if (building.type === "base_core") this.core(ctx, x, y);
    else if (building.type === "farm_plot") this.farm(ctx, x, y);
    else if (building.type === "pal_bed") this.bed(ctx, x, y);
    else if (building.type === "wood_wall") this.wall(ctx, x, y);
    else if (building.type === "wood_floor") this.floor(ctx, x, y);
    else this.workbench(ctx, x, y);
    this.bar(ctx, x, y + 46, 56, building.hp / building.maxHp, "#22c55e");
    this.text(ctx, building.type, x, y - 56);
  }

  override drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    super.drawPlayer(ctx, player, x, y, isLocal);
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, hard: boolean) {
    const dark = hard ? "#064e3b" : "#14532d";
    const mid = hard ? "#15803d" : "#22c55e";
    const hi = hard ? "#86efac" : "#bbf7d0";
    this.sprite(ctx, x, y, [
      [-1,-9,dark,2,1],[-3,-8,dark,6,1],[-4,-7,dark,8,1],[-5,-6,dark,10,2],[-4,-4,mid,8,2],[-3,-2,mid,6,1],[-2,-8,mid,2,1],[1,-7,hi,2,1],[-4,-5,hi,2,1],
      [-1,-1,"#5b3713",2,6],[-2,2,"#7c4a1d",4,2],[-3,5,"#3f2410",6,1],[-2,1,"#a16207",1,3],
    ]);
  }

  private drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    const base = type === "coal" ? "#27272a" : type === "ore" ? "#64748b" : "#71717a";
    const mid = type === "coal" ? "#3f3f46" : type === "ore" ? "#94a3b8" : "#a1a1aa";
    this.sprite(ctx, x, y, [[-5,-3,"#1f2937",3,2],[-2,-5,"#1f2937",4,1],[2,-4,"#1f2937",3,2],[-6,-1,"#1f2937",12,4],[-5,3,"#1f2937",10,2],[-4,-2,base,8,5],[-2,-4,base,3,2],[1,-3,mid,3,2],[-3,1,mid,3,1]]);
    if (type === "ore") this.sprite(ctx, x, y, [[-3,-1,"#38bdf8",1,2],[-2,-2,"#7dd3fc",1,1],[2,0,"#38bdf8",2,1],[3,-1,"#bae6fd",1,1]]);
    if (type === "coal") this.sprite(ctx, x, y, [[-2,-2,"#71717a",2,1],[2,1,"#52525b",2,1]]);
  }

  private drawBerryBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
    this.sprite(ctx, x, y, [[-5,-3,"#052e16",10,6],[-4,-5,"#166534",4,3],[0,-6,"#15803d",4,4],[3,-4,"#166534",3,5],[-5,-1,"#15803d",4,4],[0,-2,"#22c55e",3,3],[-3,-4,"#ef4444"],[2,-5,"#f87171"],[4,-1,"#ef4444"],[-1,1,"#dc2626"]]);
  }

  private drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, herb: boolean) {
    const c = herb ? "#86efac" : "#22c55e";
    const h = herb ? "#f0fdf4" : "#bbf7d0";
    this.sprite(ctx, x, y, [[-5,2,"#14532d",10,1],[-4,1,c,1,2],[-2,-1,c,1,4],[0,0,c,1,3],[2,-2,c,1,5],[4,0,c,1,3],[-1,-3,h,1,1],[3,-4,h,1,1]]);
  }

  private drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    const c = type === "ice_crystal" ? "#38bdf8" : "#fb923c";
    const h = type === "ice_crystal" ? "#bae6fd" : "#fed7aa";
    this.sprite(ctx, x, y, [[-1,-7,"#0f172a",2,1],[-2,-6,c,4,3],[-3,-3,c,6,5],[-2,2,c,4,3],[-1,-5,h,1,5],[-5,-1,c,2,5],[4,0,c,2,4]]);
  }

  private leafbun(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-4,-10,"#14532d",2,6],[3,-10,"#14532d",2,6],[-3,-9,"#86efac",1,4],[4,-9,"#86efac",1,4],[-5,-4,"#14532d",10,8],[-4,-5,"#4ade80",8,7],[-2,-6,"#86efac",4,2],[-1,-11,"#22c55e",2,2],[-2,-1,"#bbf7d0",4,2],[-3,2,"#22c55e",6,2]]);
    this.pixelFace(ctx, x, y, -1, blink, "#052e16");
  }

  private droplet(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-1,-9,"#075985",2,1],[-2,-8,"#0284c7",4,2],[-4,-6,"#0284c7",8,5],[-5,-2,"#075985",10,5],[-4,3,"#0284c7",8,2],[-2,5,"#075985",4,1],[-3,-5,"#38bdf8",3,3],[-2,-6,"#bae6fd",1,1],[2,0,"#7dd3fc",2,1]]);
    this.pixelFace(ctx, x, y, 0, blink, "#082f49");
  }

  private sparkit(ctx: CanvasRenderingContext2D, x: number, y: number, now: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-5,-7,"#1f1308",3,4],[2,-7,"#1f1308",3,4],[-6,-6,"#f97316",2,3],[4,-6,"#f97316",2,3],[-4,-4,"#78350f",8,8],[-3,-5,"#facc15",6,7],[-2,-6,"#fef08a",4,2],[-3,2,"#eab308",6,2]]);
    if (Math.floor(now / 160) % 2 === 0) this.sprite(ctx, x, y, [[-8,-2,"#fde047"],[-9,-1,"#fde047"],[8,-2,"#fde047"],[9,-1,"#fde047"]]);
    this.pixelFace(ctx, x, y, -1, blink, "#1f1308");
  }

  private rockturtle(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-6,-3,"#1f2937",10,6],[3,-2,"#1f2937",4,4],[-5,-4,"#64748b",9,5],[-3,-5,"#94a3b8",3,2],[1,-4,"#475569",2,3],[-4,1,"#334155",7,2],[4,-1,"#94a3b8",3,3],[-5,3,"#334155",2,2],[1,3,"#334155",2,2]]);
    this.pixelFace(ctx, x + 24, y, -1, blink, "#0f172a", 0.8);
  }

  private moleminer(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-5,-4,"#1f1308",10,8],[-4,-5,"#92400e",8,7],[-2,-7,"#facc15",4,2],[-1,-9,"#fde047",2,2],[-5,1,"#fef3c7",2,2],[3,1,"#fef3c7",2,2],[-7,0,"#c2410c",2,1],[6,0,"#c2410c",2,1],[-2,3,"#78350f",4,2]]);
    this.pixelFace(ctx, x, y, -1, blink, "#1f1308");
  }

  private mossboar(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-7,-4,"#1f1308",14,8],[-6,-5,"#166534",12,7],[-5,-6,"#84cc16",3,2],[-1,-7,"#84cc16",3,2],[3,-6,"#84cc16",3,2],[-6,0,"#fef3c7",2,2],[4,0,"#fef3c7",2,2],[-4,3,"#052e16",2,2],[3,3,"#052e16",2,2],[0,-2,"#22c55e",2,2]]);
    this.pixelFace(ctx, x, y, -2, blink, "#052e16");
  }

  private genericCreature(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
    this.sprite(ctx, x, y, [[-4,-4,"#312e81",8,8],[-3,-5,"#a78bfa",6,7],[-1,-6,"#c4b5fd",2,1]]);
    this.pixelFace(ctx, x, y, -1, blink, "#1e1b4b");
  }

  private workbench(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx, x, y, [[-8,-3,"#3f2410",16,2],[-7,-5,"#d97706",14,3],[-6,-6,"#f59e0b",12,1],[-7,0,"#78350f",2,7],[5,0,"#78350f",2,7],[-4,-2,"#e5e7eb",5,1],[2,-3,"#64748b",4,2]]); }
  private campfire(ctx: CanvasRenderingContext2D, x: number, y: number) { const f = Math.floor(performance.now()/140)%2; this.sprite(ctx,x,y,[[-6,4,"#57534e",12,1],[-5,2,"#78350f",10,2],[-2,-5,"#ef4444",4,7],[-1,-7,"#f97316",2,5],[0,-3,"#facc15",2,4],[f?2:-3,-2,"#fb923c",2,3]]); }
  private storage(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-8,-5,"#3f2410",16,10],[-7,-6,"#b45309",14,4],[-7,-1,"#92400e",14,6],[-1,-2,"#facc15",2,3],[-6,1,"#a16207",4,1],[3,1,"#a16207",3,1]]); }
  private furnace(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-6,-8,"#1f2937",12,15],[-5,-7,"#64748b",10,13],[-3,-1,"#0f172a",6,5],[-2,0,"#f97316",4,3],[-1,1,"#facc15",2,2],[-3,-10,"#94a3b8",6,2]]); }
  private core(ctx: CanvasRenderingContext2D, x: number, y: number) { const pulse = Math.floor(performance.now()/220)%2; this.sprite(ctx,x,y,[[-1,-9,"#075985",2,2],[-4,-6,"#0f172a",8,8],[-6,-4,"#075985",12,4],[-4,2,"#0f172a",8,4],[-2,-3,pulse?"#bae6fd":"#38bdf8",4,4],[0,-1,"#e0f2fe",1,1]]); }
  private farm(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-9,-5,"#422006",18,11],[-8,-4,"#854d0e",16,9],[-6,-2,"#a16207",12,1],[-6,1,"#a16207",12,1],[-4,-3,"#22c55e",1,4],[0,-2,"#22c55e",1,4],[4,-3,"#22c55e",1,4]]); }
  private bed(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-8,-4,"#422006",16,9],[-7,-5,"#38bdf8",14,6],[-6,-6,"#e0f2fe",5,3],[-6,2,"#92400e",14,2]]); }
  private wall(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-9,-8,"#3f2410",18,16],[-8,-7,"#92400e",3,14],[-4,-7,"#a16207",3,14],[0,-7,"#92400e",3,14],[4,-7,"#a16207",3,14],[-8,-3,"#78350f",16,2],[-8,3,"#78350f",16,2]]); }
  private floor(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-9,-6,"#3f2410",18,12],[-8,-5,"#a16207",16,10],[-3,-5,"#78350f",1,10],[3,-5,"#78350f",1,10],[-8,0,"#b45309",16,1]]); }

  private sprite(ctx: CanvasRenderingContext2D, x: number, y: number, pixels: Pixel[]) { for (const [gx, gy, color, w = 1, h = 1] of pixels) this.p(ctx, x, y, gx, gy, color, w, h); }
  private p(ctx: CanvasRenderingContext2D, x: number, y: number, gx: number, gy: number, color: string, w = 1, h = 1) { ctx.fillStyle = color; ctx.fillRect(Math.round(x + gx * PX), Math.round(y + gy * PX), w * PX, h * PX); }
  private pixelFace(ctx: CanvasRenderingContext2D, x: number, y: number, oy: number, blink: boolean, color: string, scale = 1) { const s = Math.max(1, Math.round(scale)); if (blink) { this.p(ctx,x,y,-2,oy,color,1,s); this.p(ctx,x,y,2,oy,color,1,s); return; } this.p(ctx,x,y,-2,oy,"#fff7df",1,s); this.p(ctx,x,y,2,oy,"#fff7df",1,s); this.p(ctx,x,y,-2,oy,color,1,1); this.p(ctx,x,y,2,oy,color,1,1); }
  private traitSpark(ctx: CanvasRenderingContext2D, x: number, y: number) { this.sprite(ctx,x,y,[[-8,-7,"#facc15"],[8,-6,"#facc15"],[-7,6,"#facc15"],[7,7,"#facc15"]]); }
  private shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(x - w * PX / 2), Math.round(y), w * PX, h * PX); }
  private bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number, fill: string) { const r = Math.max(0, Math.min(1, ratio)); ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(Math.round(x - w/2), Math.round(y), w, 5); ctx.fillStyle = fill; ctx.fillRect(Math.round(x - w/2), Math.round(y), Math.round(w*r), 5); }
  private text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) { ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.78)"; ctx.strokeText(text, x, y); ctx.fillStyle = "#fff"; ctx.fillText(text, x, y); }
  private hash(text: string) { let h = 0; for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 9973; return h; }
}
