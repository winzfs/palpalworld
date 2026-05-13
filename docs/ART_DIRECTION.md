# Art Direction

## Core Concept

PalPalWorld uses a classic JRPG-inspired 2D pixel art style.

The target is not a purely old-fashioned look. The game should feel nostalgic, but the UI must remain readable and comfortable on mobile.

```txt
Classic JRPG pixel art
Mobile-first readability
Creature collecting survival RPG
```

## Visual Keywords

- 16-bit / 32-bit pixel art mood
- warm fantasy color palette
- tile-based overworld
- cute collectible creatures
- dark translucent panels
- gold or bronze borders
- icon-first mobile UI
- large readable labels

## World Style

The world uses a top-down tile map style.

Recommended base sizes:

```txt
Tiles: 32x32
Player sprite: 32x32 or 48x48
Small creature sprite: 32x32
Large creature sprite: 64x64
```

## Region Mood

```txt
starter_meadow: bright grass, dirt roads, river, flowers
moss_forest: dark green forest, mossy rocks, large trees
stone_hills: gray rocks, ore veins, dry paths
ember_desert: red sand, ember crystals, heat effects
frost_peaks: snow, ice crystals, cold blue lighting
```

## Character and Creature Style

Player characters should have a big-head small-body JRPG pixel ratio.

Creatures should be cute and readable at small sizes. Individual creature traits should be represented with small visual hints later, such as outline color, sparkle, aura, or minor palette changes.

Examples:

```txt
nimble: small wind accent
sturdy: heavier outline
giant_body: larger shadow
flame_attuned: small fire accent
frost_attuned: ice sparkle accent
```

## UI Style

UI panels should use:

```txt
dark translucent background
gold or bronze border
pixel-like corner treatment
large mobile-readable text
wide touch buttons
consistent spacing
```

## Mobile Layout

```txt
top: level, HP, region
center: game world
bottom-left: joystick
bottom-right: attack, interact, capture, menu
bottom-center: quick slots
menu: bottom sheet or full-screen panel
```

## Asset Organization

```txt
apps/web/public/assets/
  sprites/player/
  sprites/creatures/
  sprites/resources/
  sprites/buildings/
  tilesets/
  icons/
  ui/
```

Assets should be referenced through a catalog later, not scattered through gameplay code.
