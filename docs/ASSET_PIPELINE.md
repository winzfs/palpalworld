# Asset Pipeline

## Goal

Graphics must be easy to replace, extend, and maintain.

Gameplay code should never directly hardcode image paths.

```txt
Asset files
→ asset catalog
→ renderer
→ game object drawing
```

## Folder Structure

```txt
apps/web/public/assets/
  sprites/
    player/
    creatures/
    resources/
    buildings/
    effects/
  tilesets/
    regions/
  icons/
    items/
    skills/
    traits/
    ui/
  ui/
    panels/
    buttons/
```

## Code Structure

```txt
apps/web/src/features/assets/
  assetCatalog.ts
  assetTypes.ts
  AssetLoader.ts

apps/web/src/features/rendering/
  SpriteRenderer.ts
  PrimitiveRenderer.ts
  RenderTheme.ts
```

## Rules

- Do not hardcode image paths inside gameplay components.
- Use `assetCatalog.ts` for every sprite, tile, icon, and UI asset.
- Canvas rendering should ask the renderer for an asset by semantic key.
- If an asset is missing, renderer falls back to primitive shapes.
- Asset keys should be stable even if file names change.

## Example

Bad:

```txt
ctx.drawImage('/assets/sprites/creatures/leafbun.png')
```

Good:

```txt
spriteRenderer.drawCreature(ctx, 'leafbun', ...)
```

Then the renderer resolves:

```txt
creature.leafbun.idle.down
→ /assets/sprites/creatures/leafbun/idle_down.png
```

## Development Phases

```txt
1. Primitive colored shapes
2. Static pixel sprites
3. Directional sprites
4. Animation frames
5. Variant sprites by trait/rarity
6. Particle and skill effects
```

## Mobile Requirements

- Sprites must remain readable at small sizes.
- Important objects need strong outlines.
- Item icons should be simple silhouettes.
- UI icons should be understandable without text, but text labels should remain available.

## Naming Convention

```txt
creature_leafbun_idle_down_0.png
creature_leafbun_idle_down_1.png
resource_wood_stage_0.png
building_workbench_idle_0.png
icon_item_wood.png
icon_trait_nimble.png
```

## Future Tooling

Later, add validation scripts:

```txt
pnpm validate:assets
```

This should check:

- missing catalog paths
- unused assets
- wrong image dimensions
- missing animation frames
- duplicate asset keys
