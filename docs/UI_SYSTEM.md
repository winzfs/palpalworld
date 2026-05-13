# UI System

## Goal

The UI should look like a classic JRPG, but it must be comfortable on mobile.

## Principles

```txt
Reusable panels
Reusable buttons
Reusable item slots
Reusable tabs
Bottom-sheet style mobile windows
No feature-specific one-off UI styles
```

## Core Components

Recommended component structure:

```txt
apps/web/src/features/ui/
  PixelPanel.tsx
  PixelButton.tsx
  PixelTabs.tsx
  ItemSlot.tsx
  StatRow.tsx
  MobileWindow.tsx
```

## Screen Modules

Feature screens should be separated from generic UI components.

```txt
apps/web/src/features/character/
  CharacterPanel.tsx

apps/web/src/features/inventory/
  InventoryPanel.tsx

apps/web/src/features/equipment/
  EquipmentPanel.tsx

apps/web/src/features/creatures/
  OwnedCreaturePanel.tsx

apps/web/src/features/crafting/
  CraftingPanel.tsx

apps/web/src/features/building/
  BuildingPanel.tsx
```

## Mobile Layout

The main HUD should stay simple.

```txt
Top-left: player summary
Top-center: region and channel
Bottom-left: joystick
Bottom-right: action buttons
Bottom-center: quick slots
Menu button: opens full-screen or bottom-sheet windows
```

## Window Rules

On mobile, large systems should open as windows:

```txt
Character
Inventory
Equipment
Creatures
Crafting
Building
Quest
Settings
```

On desktop, these windows may float or dock.

## Style Tokens

Use CSS variables for theme colors.

```txt
--jrpg-bg
--jrpg-panel
--jrpg-border
--jrpg-border-bright
--jrpg-gold
--jrpg-text
--jrpg-muted
--jrpg-danger
--jrpg-success
```

## Maintainability Rules

- Do not hardcode panel styles inside feature components.
- Do not mix inventory logic and equipment UI in one component.
- Do not let Canvas rendering own UI windows.
- Canvas draws the world; React draws UI.
- Server decides game state; client only displays and sends commands.
