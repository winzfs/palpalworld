import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { getBuildingSpriteSet, getCreatureSpriteSet, getResourceSpriteSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

export class SpriteRenderer {
  private readonly loader = new AssetLoader();
  private readonly fallback = new PrimitiveRenderer();

  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const spriteSet = getResourceSpriteSet(resource.resourceType);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!image || !spriteSet) {
      this.fallback.drawResource(ctx, resource, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const spriteSet = getCreatureSpriteSet(creature.speciesId);
    const asset = spriteSet?.idle.down ?? null;
    const image = this.loader.getImage(asset);
    if (!image || !asset) {
      this.fallback.drawCreature(ctx, creature, x, y);
      return;
    }

    ctx.drawImage(image, x - asset.width / 2, y - asset.height / 2, asset.width, asset.height);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    const spriteSet = getBuildingSpriteSet(building.type);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!image || !spriteSet) {
      this.fallback.drawBuilding(ctx, building, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    this.fallback.drawPlayer(ctx, player, x, y, isLocal);
  }
}
