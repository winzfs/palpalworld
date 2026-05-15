/**
 * Final build-mode interaction normalization.
 *
 * Must run after patch-iso-build-rendering.cjs. It makes demolition mode input
 * deterministic after all previous generated patches have modified GameScene.
 *
 * Rules:
 * - demolition click on a placed part: select only that part
 * - demolition click outside placed parts: clear all build/demolition selection
 * - demolition drag: select multiple parts; Shift adds, Ctrl/Meta toggles
 * - selected placed part rotate button keeps the part installed and rotates it
 * - new-part preview drag must never move an already placed/selected part
 * - closing the build UI clears every build/demolition selection
 */
const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");

let scene = fs.readFileSync(scenePath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let sceneChanged = false;
let clientChanged = false;

function replaceSceneRegex(regex, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-build-demolition-selection-rules] already-patched scene ${label}`);
    return;
  }
  if (!regex.test(scene)) {
    console.log(`[patch-build-demolition-selection-rules] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(regex, replacement);
  sceneChanged = true;
  console.log(`[patch-build-demolition-selection-rules] patched scene ${label}`);
}

function replaceClientRegex(regex, replacement, label) {
  if (client.includes(replacement)) {
    console.log(`[patch-build-demolition-selection-rules] already-patched client ${label}`);
    return;
  }
  if (!regex.test(client)) {
    console.log(`[patch-build-demolition-selection-rules] skipped client ${label}`);
    return;
  }
  client = client.replace(regex, replacement);
  clientChanged = true;
  console.log(`[patch-build-demolition-selection-rules] patched client ${label}`);
}

replaceSceneRegex(
  /  clearBuildPartSelectionForUi\(\) \{\n    this\.selectedPlacedBuildPartId = null;\n    this\.selectedHouseId = null;\n    this\.dispatchBuildPartSelection\(\);\n  \}/,
  `  clearBuildPartSelectionForUi() {
    this.selectedPlacedBuildPartId = null;
    this.selectedHouseId = null;
    this.demolitionSelectedPartIds.clear();
    this.demolitionPointerId = null;
    this.demolitionDragStart = null;
    this.demolitionDragCurrent = null;
    this.dispatchBuildPartSelection();
  }`,
  "clear all build selections",
);

replaceSceneRegex(
  /  setBuildPartPlacement\(partId: BuildPartId \| null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel\) \{\n    this\.selectedBuildPartId = partId;\n    this\.selectedBuildPartRotation = rotation;\n    this\.selectedBuildFloorLevel = floorLevel;\n    this\.buildPartDragPointerId = null;\n    this\.buildPartDragPosition = null;\n    this\.canvas\.style\.cursor = partId \? "crosshair" : this\.placementPreviewBuildingType \? "crosshair" : "default";\n  \}/,
  `  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {
    this.selectedBuildPartId = partId;
    this.selectedBuildPartRotation = rotation;
    this.selectedBuildFloorLevel = floorLevel;
    this.buildPartDragPointerId = null;
    this.buildPartDragPosition = null;
    if (partId) {
      this.selectedPlacedBuildPartId = null;
      this.selectedHouseId = null;
      this.demolitionSelectedPartIds.clear();
      this.demolitionPointerId = null;
      this.demolitionDragStart = null;
      this.demolitionDragCurrent = null;
      this.editingBuildPartPointerId = null;
    }
    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";
    this.dispatchBuildPartSelection();
  }`,
  "new placement clears selected placed part",
);

replaceSceneRegex(
  /  rotateSelectedPlacedBuildPartForUi\(\) \{\n    const selected = this\.getSelectedPlacedBuildPart\(\);\n    if \(!selected\) return;\n    this\.placedBuildParts = rotatePlacedBuildPart\(selected\.id, rotateBuildPart\(selected\.rotation\)\);\n    this\.dispatchBuildPartSelection\(\);\n  \}/,
  `  rotateSelectedPlacedBuildPartForUi() {
    const selected = this.getSelectedPlacedBuildPart();
    if (!selected) return;
    this.placedBuildParts = rotatePlacedBuildPart(selected.id, rotateBuildPart(selected.rotation));
    this.selectedPlacedBuildPartId = selected.id;
    this.selectedHouseId = selected.houseId ?? null;
    this.dispatchBuildPartSelection();
  }`,
  "rotate selected placed part in place",
);

replaceSceneRegex(
  /    const movingSelected = this\.getSelectedPlacedBuildPart\(\);\n    if \(movingSelected && this\.buildPartDragPosition\) \{/,
  `    const movingSelected = this.getSelectedPlacedBuildPart();
    if (movingSelected && this.editingBuildPartPointerId !== null && this.buildPartDragPosition) {`,
  "preview does not move selected placed part during new placement",
);

replaceSceneRegex(
  /    if \(this\.demolitionMode && this\.demolitionPointerId === event\.pointerId\) \{[\s\S]*?      this\.dispatchBuildPartSelection\(\);\n      return;\n    \}\n    if \(this\.selectedPlacedBuildPartId && this\.editingBuildPartPointerId === event\.pointerId\) \{/,
  `    if (this.demolitionMode && this.demolitionPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      const start = this.demolitionDragStart ?? position;
      const dragDistance = distance(start, position);
      const addSelection = event.shiftKey;
      const toggleSelection = event.ctrlKey || event.metaKey;
      this.demolitionPointerId = null;
      this.demolitionDragStart = null;
      this.demolitionDragCurrent = null;
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);

      if (dragDistance < 8) {
        const part = this.getBuildPartAt(position);
        if (part) {
          this.demolitionSelectedPartIds.clear();
          this.demolitionSelectedPartIds.add(part.id);
          this.selectedPlacedBuildPartId = part.id;
          this.selectedHouseId = part.houseId ?? null;
        } else {
          this.clearBuildPartSelectionForUi();
          return;
        }
      } else {
        const parts = this.getBuildPartsInWorldRect(start, position);
        if (!addSelection && !toggleSelection) this.demolitionSelectedPartIds.clear();
        for (const part of parts) {
          if (toggleSelection) {
            if (this.demolitionSelectedPartIds.has(part.id)) this.demolitionSelectedPartIds.delete(part.id);
            else this.demolitionSelectedPartIds.add(part.id);
          } else {
            this.demolitionSelectedPartIds.add(part.id);
          }
        }
        const firstSelected = this.placedBuildParts.find((part) => this.demolitionSelectedPartIds.has(part.id)) ?? null;
        this.selectedPlacedBuildPartId = firstSelected?.id ?? null;
        this.selectedHouseId = firstSelected?.houseId ?? null;
      }
      this.dispatchBuildPartSelection();
      return;
    }
    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {`,
  "demolition click drag selection rules",
);

scene = scene.replaceAll(
  "this.canvas.releasePointerCapture(event.pointerId);",
  "if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);",
);
scene = scene.replaceAll(
  "if (this.canvas.hasPointerCapture(event.pointerId)) if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);",
  "if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);",
);
sceneChanged = true;

replaceSceneRegex(
  /    return this\.getSceneBuildParts\(\)\.filter\(\(part\) => \{\n      if \(part\.gridX < minGX \|\| part\.gridX > maxGX \|\| part\.gridY < minGY \|\| part\.gridY > maxGY\) return false;\n      const partIso = buildGridToIsoCenter\(part\.gridX, part\.gridY\);\n      const partSX = partIso\.x - __isoCam\.x;\n      const partSY = partIso\.y - __isoCam\.y;\n      return partSX >= scrLeft && partSX <= scrRight && partSY >= scrTop && partSY <= scrBottom;\n    \}\);/,
  `    return this.getSceneBuildParts().filter((part) => {
      const definition = BUILD_PARTS[part.partId];
      const rangePad = Math.max(1, definition?.width ?? 1, definition?.height ?? 1) + 1;
      if (part.gridX < minGX - rangePad || part.gridX > maxGX + rangePad || part.gridY < minGY - rangePad || part.gridY > maxGY + rangePad) return false;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      const halfW = Math.max(24, ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2 + 10);
      const halfH = Math.max(18, ((definition?.height ?? 1) * BUILD_GRID_SIZE * 0.62) / 2 + 18);
      return partSX + halfW >= scrLeft && partSX - halfW <= scrRight && partSY + halfH >= scrTop && partSY - halfH <= scrBottom;
    });`,
  "demolition drag padded iso bounds",
);

replaceClientRegex(
  /onClose=\{\(\) => setBuildModeOpen\(false\)\}/g,
  `onClose={() => { sceneRef.current?.clearBuildPartSelectionForUi(); setBuildDemolitionMode(false); setDemolitionSelectionCount(0); setSelectedPlacedBuildPart(null); setSelectedHousePartCount(0); setSelectedBuildPartId(null); setBuildModeOpen(false); }}`,
  "build panel close clears selection",
);

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (clientChanged) fs.writeFileSync(clientPath, client);
