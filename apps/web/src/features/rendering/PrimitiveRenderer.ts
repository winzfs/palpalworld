import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { CREATURE_CATALOG } from "@palpalworld/shared";
import { renderTheme } from "./RenderTheme";

export class PrimitiveRenderer {
  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const ratio = resource.remainingAmount / resource.maxAmount;
    this.drawShadow(ctx, x, y + 11, 34, 11);
    if (resource.resourceType === "wood" || resource.resourceType === "hardwood") this.drawTree(ctx, x, y, resource.resourceType === "hardwood");
    else if (resource.resourceType === "stone" || resource.resourceType === "ore" || resource.resourceType === "coal") this.drawRock(ctx, x, y, resource.resourceType);
    else if (resource.resourceType === "berry") this.drawBerryBush(ctx, x, y);
    else if (resource.resourceType === "fiber" || resource.resourceType === "herb") this.drawGrassPatch(ctx, x, y, resource.resourceType);
    else this.drawCrystal(ctx, x, y, resource.resourceType);
    this.drawMiniBar(ctx, x, y + 24, 44, ratio, "#facc15");
    this.drawLabel(ctx, `${resource.resourceType} ${resource.remainingAmount}`, x, y - 26);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const species = CREATURE_CATALOG[creature.speciesId as keyof typeof CREATURE_CATALOG];
    const element = species?.element ?? "neutral";
    const fill = renderTheme.creatures[element] ?? renderTheme.creatures.default;
    const time = performance.now();
    const seed = this.hashText(creature.id);
    const breathe = Math.sin(time / 360 + seed) * 2;
    const bob = Math.sin(time / 520 + seed * 0.7) * 3;
    const wiggle = Math.sin(time / 220 + seed) * 2;
    const drawY = creature.speciesId === "breezewing" ? y - 22 + Math.sin(time / 210 + seed) * 6 : y + bob;

    if (creature.speciesId === "breezewing") this.drawShadow(ctx, x, y + 19, 42, 9);
    else this.drawShadow(ctx, x, y + 15, 34 + Math.abs(breathe), 10);

    switch (creature.speciesId) {
      case "leafbun": this.drawLeafbun(ctx, x, drawY, fill, wiggle, breathe); break;
      case "droplet": this.drawDroplet(ctx, x, drawY, wiggle, breathe); break;
      case "sparkit": this.drawSparkit(ctx, x, drawY, wiggle, breathe, time); break;
      case "breezewing": this.drawBreezewing(ctx, x, drawY, wiggle, time); break;
      case "rockturtle": this.drawRockturtle(ctx, x, drawY, wiggle, breathe); break;
      case "moleminer": this.drawMoleminer(ctx, x, drawY, wiggle, breathe); break;
      case "mossboar": this.drawMossboar(ctx, x, drawY, wiggle, breathe); break;
      default: this.drawGenericCreature(ctx, x, drawY, fill, breathe); break;
    }

    if (creature.traitIds.length > 0) {
      ctx.strokeStyle = creature.traitIds.includes("flying") ? "#93c5fd" : "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 23, drawY - 23, 46, 44, 13);
      ctx.stroke();
    }
    this.drawMiniBar(ctx, x, y + 25, 44, creature.hp / creature.maxHp, "#ef4444");
    this.drawLabel(ctx, `${creature.speciesId} Lv.${creature.level}`, x, y - 30);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    this.drawShadow(ctx, x, y + 20, 56, 14);
    ctx.fillStyle = "#7c4a1d"; ctx.strokeStyle = "#2a1608"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - 27, y - 23, 54, 46, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b7792f"; ctx.beginPath(); ctx.moveTo(x - 32, y - 20); ctx.lineTo(x, y - 45); ctx.lineTo(x + 32, y - 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2a1608"; ctx.fillRect(x - 7, y + 1, 14, 22); ctx.fillStyle = "#facc15"; ctx.fillRect(x + 10, y - 5, 10, 10);
    this.drawMiniBar(ctx, x, y + 32, 48, building.hp / building.maxHp, "#22c55e");
    this.drawLabel(ctx, building.type, x, y - 50);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    const fill = isLocal ? renderTheme.player.local : renderTheme.player.remote;
    this.drawShadow(ctx, x, y + 15, 30, 9);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x - 12, y - 14, 24, 30, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f8d7a4"; ctx.beginPath(); ctx.arc(x, y - 18, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1f1308"; ctx.fillRect(x - 5, y - 20, 3, 3); ctx.fillRect(x + 3, y - 20, 3, 3);
    this.drawLabel(ctx, player.nickname, x, y - 33, "13px system-ui");
    this.drawMiniBar(ctx, x, y + 23, 44, player.hp / player.maxHp, "#22c55e");
  }

  private drawBreezewing(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, time: number) {
    const wing = Math.sin(time / 95) * 11;
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(191, 219, 254, 0.9)";
    ctx.beginPath(); ctx.ellipse(x - 22, y - 2 + wing * 0.12, 18, 8, -0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 22, y - 2 - wing * 0.12, 18, 8, 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath(); ctx.ellipse(x, y, 16, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.ellipse(x, y + 5, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.moveTo(x - 7, y - 17); ctx.lineTo(x, y - 31 - Math.abs(wiggle)); ctx.lineTo(x + 7, y - 17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 8, y - 2); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.fillRect(x - 5, y - 8, 3, 3); ctx.fillRect(x + 3, y - 8, 3, 3);
    ctx.strokeStyle = "rgba(147,197,253,0.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 27 + Math.abs(wing) * 0.15, 0, Math.PI * 2); ctx.stroke();
  }

  private drawLeafbun(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, wiggle: number, breathe: number) { ctx.strokeStyle = "#1f1308"; ctx.lineWidth = 3; ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.ellipse(x - 9 + wiggle * 0.2, y - 20, 7, 16 + breathe * 0.2, -0.45, 0, Math.PI * 2); ctx.ellipse(x + 9 + wiggle * 0.2, y - 20, 7, 16 + breathe * 0.2, 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x - 17, y - 13, 34, 30 + breathe, 12); ctx.fill(); ctx.stroke(); this.drawEyes(ctx, x, y - 2); ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x, y - 18, 5, 0, Math.PI * 2); ctx.fill(); }
  private drawDroplet(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, breathe: number) { ctx.strokeStyle = "#075985"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(56, 189, 248, 0.9)"; ctx.beginPath(); ctx.moveTo(x, y - 24 - breathe); ctx.bezierCurveTo(x + 24 + wiggle, y - 2, x + 15, y + 18, x, y + 18); ctx.bezierCurveTo(x - 15, y + 18, x - 24 + wiggle, y - 2, x, y - 24 - breathe); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(x - 8, y - 8, 5, 0, Math.PI * 2); ctx.fill(); this.drawEyes(ctx, x, y - 1); }
  private drawSparkit(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, breathe: number, time: number) { ctx.strokeStyle = "#1f1308"; ctx.lineWidth = 3; ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.roundRect(x - 16, y - 13, 32, 29 + breathe, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(x - 20, y - 8); ctx.lineTo(x - 31 - wiggle, y - 17); ctx.lineTo(x - 25, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 20, y - 8); ctx.lineTo(x + 31 + wiggle, y - 17); ctx.lineTo(x + 25, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); this.drawEyes(ctx, x, y - 2); if (Math.floor(time / 180) % 2 === 0) { ctx.strokeStyle = "#fef08a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18, y + 4); ctx.lineTo(x + 26, y - 3); ctx.lineTo(x + 22, y + 8); ctx.stroke(); } }
  private drawRockturtle(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, breathe: number) { ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3; ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.ellipse(x, y, 24, 16 + breathe * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#475569"; for (let index = -1; index <= 1; index += 1) { ctx.beginPath(); ctx.arc(x + index * 10, y - 5 + Math.abs(index) * 3, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.roundRect(x + 13, y - 8 + wiggle * 0.2, 15, 15, 5); ctx.fill(); ctx.stroke(); this.drawEyes(ctx, x + 20, y - 2); }
  private drawMoleminer(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, breathe: number) { ctx.strokeStyle = "#1f1308"; ctx.lineWidth = 3; ctx.fillStyle = "#92400e"; ctx.beginPath(); ctx.roundRect(x - 18, y - 12, 36, 29 + breathe, 13); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(x - 10, y - 16); ctx.lineTo(x, y - 30 - Math.abs(wiggle)); ctx.lineTo(x + 10, y - 16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fef3c7"; ctx.fillRect(x - 20 - wiggle, y + 2, 8, 5); ctx.fillRect(x + 12 + wiggle, y + 2, 8, 5); this.drawEyes(ctx, x, y - 2); }
  private drawMossboar(ctx: CanvasRenderingContext2D, x: number, y: number, wiggle: number, breathe: number) { ctx.strokeStyle = "#1f1308"; ctx.lineWidth = 3; ctx.fillStyle = "#166534"; ctx.beginPath(); ctx.ellipse(x, y, 25, 16 + breathe * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#84cc16"; ctx.beginPath(); ctx.arc(x - 8, y - 14, 7, 0, Math.PI * 2); ctx.arc(x + 4, y - 17, 6, 0, Math.PI * 2); ctx.arc(x + 14, y - 12, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.moveTo(x - 14, y + 4); ctx.lineTo(x - 24 - wiggle, y + 10); ctx.lineTo(x - 13, y + 12); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 14, y + 4); ctx.lineTo(x + 24 + wiggle, y + 10); ctx.lineTo(x + 13, y + 12); ctx.fill(); ctx.stroke(); this.drawEyes(ctx, x, y - 2); }
  private drawGenericCreature(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, breathe: number) { ctx.strokeStyle = "#1f1308"; ctx.lineWidth = 3; ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x - 15, y - 13, 30, 27 + breathe, 9); ctx.fill(); ctx.stroke(); this.drawEyes(ctx, x, y - 3); }
  private drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#fff7df"; ctx.fillRect(x - 7, y - 4, 4, 4); ctx.fillRect(x + 4, y - 4, 4, 4); ctx.fillStyle = "#1f1308"; ctx.fillRect(x - 6, y - 3, 2, 2); ctx.fillRect(x + 5, y - 3, 2, 2); }
  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, hardwood: boolean) { ctx.fillStyle = hardwood ? "#5b3713" : "#7c4a1d"; ctx.fillRect(x - 5, y - 4, 10, 24); ctx.fillStyle = hardwood ? "#14532d" : "#16a34a"; ctx.strokeStyle = "#052e16"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 11, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x - 8, y - 17, 8, 0, Math.PI * 2); ctx.fill(); }
  private drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) { ctx.fillStyle = type === "coal" ? "#27272a" : type === "ore" ? "#94a3b8" : "#64748b"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 17, y + 13); ctx.lineTo(x - 12, y - 10); ctx.lineTo(x + 5, y - 17); ctx.lineTo(x + 18, y - 3); ctx.lineTo(x + 12, y + 14); ctx.closePath(); ctx.fill(); ctx.stroke(); if (type === "ore") { ctx.fillStyle = "#facc15"; ctx.fillRect(x + 1, y - 8, 5, 5); ctx.fillRect(x - 8, y + 1, 4, 4); } }
  private drawBerryBush(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#15803d"; ctx.strokeStyle = "#052e16"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 17, y - 13, 34, 27, 11); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ef4444"; ctx.fillRect(x - 8, y - 6, 5, 5); ctx.fillRect(x + 5, y - 3, 5, 5); ctx.fillRect(x - 1, y + 5, 5, 5); }
  private drawGrassPatch(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) { ctx.strokeStyle = type === "herb" ? "#86efac" : "#22c55e"; ctx.lineWidth = 4; for (let index = -2; index <= 2; index += 1) { ctx.beginPath(); ctx.moveTo(x + index * 7, y + 14); ctx.lineTo(x + index * 5, y - 12 - Math.abs(index) * 2); ctx.stroke(); } }
  private drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) { ctx.fillStyle = type === "ice_crystal" ? "#67e8f9" : "#f97316"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 20); ctx.lineTo(x - 14, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  private drawMiniBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, fill: string) { const clamped = Math.max(0, Math.min(1, ratio)); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - width / 2, y, width, 5); ctx.fillStyle = fill; ctx.fillRect(x - width / 2, y, width * clamped, 5); }
  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) { ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  private drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, font = "12px system-ui") { ctx.font = font; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(label, x, y); ctx.fillStyle = "#ffffff"; ctx.fillText(label, x, y); }
  private hashText(text: string) { let hash = 0; for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 9973; return hash; }
}
