import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { CREATURE_CATALOG } from "@palpalworld/shared";
import { renderTheme } from "./RenderTheme";

export class PrimitiveRenderer {
  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const ratio = resource.remainingAmount / resource.maxAmount;
    this.drawShadow(ctx, x, y + 11, 34, 11);

    if (resource.resourceType === "wood" || resource.resourceType === "hardwood") {
      this.drawTree(ctx, x, y, resource.resourceType === "hardwood");
    } else if (resource.resourceType === "stone" || resource.resourceType === "ore" || resource.resourceType === "coal") {
      this.drawRock(ctx, x, y, resource.resourceType);
    } else if (resource.resourceType === "berry") {
      this.drawBerryBush(ctx, x, y);
    } else if (resource.resourceType === "fiber" || resource.resourceType === "herb") {
      this.drawGrassPatch(ctx, x, y, resource.resourceType);
    } else {
      this.drawCrystal(ctx, x, y, resource.resourceType);
    }

    this.drawMiniBar(ctx, x, y + 24, 44, ratio, "#facc15");
    this.drawLabel(ctx, `${resource.resourceType} ${resource.remainingAmount}`, x, y - 26);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const species = CREATURE_CATALOG[creature.speciesId as keyof typeof CREATURE_CATALOG];
    const element = species?.element ?? "neutral";
    const fill = renderTheme.creatures[element] ?? renderTheme.creatures.default;

    this.drawShadow(ctx, x, y + 13, 32, 10);
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 3;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x - 15, y - 13, 30, 27, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff7df";
    ctx.fillRect(x - 7, y - 4, 4, 4);
    ctx.fillRect(x + 4, y - 4, 4, 4);
    ctx.fillStyle = "#1f1308";
    ctx.fillRect(x - 6, y - 3, 2, 2);
    ctx.fillRect(x + 5, y - 3, 2, 2);

    if (creature.traitIds.length > 0) {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 20, y - 18, 40, 38, 11);
      ctx.stroke();
    }

    this.drawMiniBar(ctx, x, y + 22, 44, creature.hp / creature.maxHp, "#ef4444");
    this.drawLabel(ctx, `${creature.speciesId} Lv.${creature.level}`, x, y - 23);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    this.drawShadow(ctx, x, y + 20, 56, 14);

    ctx.fillStyle = "#7c4a1d";
    ctx.strokeStyle = "#2a1608";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 27, y - 23, 54, 46, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#b7792f";
    ctx.beginPath();
    ctx.moveTo(x - 32, y - 20);
    ctx.lineTo(x, y - 45);
    ctx.lineTo(x + 32, y - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2a1608";
    ctx.fillRect(x - 7, y + 1, 14, 22);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 10, y - 5, 10, 10);

    this.drawMiniBar(ctx, x, y + 32, 48, building.hp / building.maxHp, "#22c55e");
    this.drawLabel(ctx, building.type, x, y - 50);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    const fill = isLocal ? renderTheme.player.local : renderTheme.player.remote;
    this.drawShadow(ctx, x, y + 15, 30, 9);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 14, 24, 30, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8d7a4";
    ctx.beginPath();
    ctx.arc(x, y - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f1308";
    ctx.fillRect(x - 5, y - 20, 3, 3);
    ctx.fillRect(x + 3, y - 20, 3, 3);

    this.drawLabel(ctx, player.nickname, x, y - 33, "13px system-ui");
    this.drawMiniBar(ctx, x, y + 23, 44, player.hp / player.maxHp, "#22c55e");
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, hardwood: boolean) {
    ctx.fillStyle = hardwood ? "#5b3713" : "#7c4a1d";
    ctx.fillRect(x - 5, y - 4, 10, 24);
    ctx.fillStyle = hardwood ? "#14532d" : "#16a34a";
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 11, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(x - 8, y - 17, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) {
    ctx.fillStyle = type === "coal" ? "#27272a" : type === "ore" ? "#94a3b8" : "#64748b";
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 17, y + 13);
    ctx.lineTo(x - 12, y - 10);
    ctx.lineTo(x + 5, y - 17);
    ctx.lineTo(x + 18, y - 3);
    ctx.lineTo(x + 12, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (type === "ore") {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x + 1, y - 8, 5, 5);
      ctx.fillRect(x - 8, y + 1, 4, 4);
    }
  }

  private drawBerryBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "#15803d";
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 17, y - 13, 34, 27, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x - 8, y - 6, 5, 5);
    ctx.fillRect(x + 5, y - 3, 5, 5);
    ctx.fillRect(x - 1, y + 5, 5, 5);
  }

  private drawGrassPatch(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) {
    ctx.strokeStyle = type === "herb" ? "#86efac" : "#22c55e";
    ctx.lineWidth = 4;
    for (let index = -2; index <= 2; index += 1) {
      ctx.beginPath();
      ctx.moveTo(x + index * 7, y + 14);
      ctx.lineTo(x + index * 5, y - 12 - Math.abs(index) * 2);
      ctx.stroke();
    }
  }

  private drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, type: ResourceNodeState["resourceType"]) {
    ctx.fillStyle = type === "ice_crystal" ? "#67e8f9" : "#f97316";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x, y + 20);
    ctx.lineTo(x - 14, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawMiniBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, fill: string) {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - width / 2, y, width, 5);
    ctx.fillStyle = fill;
    ctx.fillRect(x - width / 2, y, width * clamped, 5);
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, font = "12px system-ui") {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(label, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x, y);
  }
}
