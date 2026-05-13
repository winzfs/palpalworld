import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { CREATURE_CATALOG } from "@palpalworld/shared";
import { renderTheme } from "./RenderTheme";

export class PrimitiveRenderer {
  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const ratio = resource.remainingAmount / resource.maxAmount;
    ctx.fillStyle = renderTheme.resources[resource.resourceType] ?? "#94a3b8";
    ctx.beginPath();
    ctx.roundRect(x - 16, y - 16, 32, 32, 9);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 22, y + 22, 44, 5);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x - 22, y + 22, 44 * ratio, 5);

    this.drawLabel(ctx, `${resource.resourceType} ${resource.remainingAmount}`, x, y - 22);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const species = CREATURE_CATALOG[creature.speciesId as keyof typeof CREATURE_CATALOG];
    const element = species?.element ?? "neutral";
    ctx.fillStyle = renderTheme.creatures[element] ?? renderTheme.creatures.default;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    if (creature.traitIds.length > 0) {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 22, y + 20, 44, 5);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x - 22, y + 20, 44 * (creature.hp / creature.maxHp), 5);

    this.drawLabel(ctx, `${creature.speciesId} Lv.${creature.level}`, x, y - 22);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    ctx.fillStyle = renderTheme.buildings.default;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 24, y - 24, 48, 48, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 24, y + 30, 48, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 24, y + 30, 48 * (building.hp / building.maxHp), 5);

    this.drawLabel(ctx, building.type, x, y - 32);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    ctx.fillStyle = isLocal ? renderTheme.player.local : renderTheme.player.remote;
    ctx.beginPath();
    ctx.arc(x, y, isLocal ? 17 : 15, 0, Math.PI * 2);
    ctx.fill();

    this.drawLabel(ctx, player.nickname, x, y - 24, "13px system-ui");

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x - 22, y + 22, 44, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 22, y + 22, 44 * (player.hp / player.maxHp), 5);
  }

  private drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, font = "12px system-ui") {
    ctx.fillStyle = "#ffffff";
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(label, x, y);
  }
}
