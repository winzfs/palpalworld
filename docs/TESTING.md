# Testing Guide

## Goal

This project should be testable at every development stage.

The current game is still an early prototype, so testing is divided into three layers.

```txt
1. Type/build verification
2. Server health verification
3. Manual gameplay smoke test
```

## Local Setup

Install dependencies:

```bash
pnpm install
```

Run both web and realtime server:

```bash
pnpm dev
```

Or run separately:

```bash
pnpm dev:server
pnpm dev:web
```

Default URLs:

```txt
Web: http://localhost:3000
Realtime server: http://localhost:4000
Health check: http://localhost:4000/health
```

## Verification Commands

Run TypeScript checks:

```bash
pnpm typecheck
```

Run build checks:

```bash
pnpm build
```

Run lint checks:

```bash
pnpm lint
```

## Manual Gameplay Smoke Test

### 1. Connection

Expected:

```txt
- Web page opens without crashing.
- Realtime server shows online connection.
- Player appears in the world.
- Player nickname appears in the HUD.
```

### 2. Movement

PC:

```txt
WASD / arrow keys move the player.
```

Mobile:

```txt
Virtual joystick moves the player.
```

Expected:

```txt
- Movement is smooth.
- Camera follows the local player.
- Other clients should see movement through snapshots.
```

### 3. Resource Gathering

Steps:

```txt
1. Move near a resource node.
2. Check that interaction hint appears.
3. Press E or mobile interact button.
```

Expected:

```txt
- Server checks distance.
- Resource amount decreases.
- Item is added to inventory.
- Toast/chat feedback appears.
- Resource respawns after its catalog respawn time.
```

### 4. Inventory

Expected:

```txt
- Stackable items appear with amounts.
- Equipment item instances are kept separately from stackable resources.
- Starter equipment exists: training sword, explorer jacket, leather boots.
```

### 5. Crafting

Steps:

```txt
1. Gather enough resources.
2. Use crafting buttons.
```

Expected:

```txt
- Materials are consumed.
- Crafted item is added.
- Equipment outputs become item instances.
- Stackable outputs increase item amount.
```

### 6. Building

Steps:

```txt
1. Craft or obtain required building kit/materials.
2. Press a building placement button.
```

Expected:

```txt
- Server checks build range.
- Server checks blocked position.
- Materials are consumed.
- Building appears in the world snapshot.
```

### 7. Combat

Steps:

```txt
1. Move near a creature.
2. Press Space or mobile attack button.
```

Expected:

```txt
- Nearest creature within attack range takes damage.
- Creature HP decreases.
- Defensive traits affect damage.
- Defeated creature drops loot.
- Player gains EXP.
- Creature respawns after spawn table respawn time.
```

### 8. Player Progress and Stats

Expected:

```txt
- Player profile is sent on join.
- EXP increases after defeating creatures.
- Level increases when EXP reaches nextExp.
- Final stats are recalculated from base stats, level, equipment, and traits.
```

### 9. Equipment

Expected:

```txt
- Equipment is stored as ItemInstance, not ItemStack.
- Equip/unequip events update EquipmentState.
- PlayerProfileState updates after equipment changes.
- Move speed and max HP can change from equipment stats.
```

### 10. Asset Fallback

Expected:

```txt
- Game works even with no sprite assets.
- SpriteRenderer tries asset catalog first.
- Missing sprites fall back to PrimitiveRenderer.
- Adding sprites to assetCatalog should not require GameScene changes.
```

## Mobile Test Checklist

Test in mobile portrait and landscape.

Expected:

```txt
- Joystick does not overlap important panels.
- Action buttons are easy to tap.
- UI text is readable.
- Inventory/build panels do not cover all gameplay controls permanently.
- Safe-area insets are respected.
```

## Current Known Limitations

```txt
- No real pixel sprites yet; renderer falls back to primitive shapes.
- Character status/equipment/inventory windows are not fully separated into final panels yet.
- CaptureService is not implemented yet.
- MountService is not implemented yet.
- Data is still memory-based and resets on server restart.
```

## Recommended Test Rhythm

After every major feature:

```txt
pnpm typecheck
pnpm build
manual smoke test: connection → movement → one feature test
```

Before merging large changes:

```txt
pnpm typecheck
pnpm build
full manual gameplay smoke test
mobile portrait check
mobile landscape check
```
