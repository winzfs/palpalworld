const fs = require("fs");
const path = require("path");

function patchFile(relativePath, patcher) {
  const target = path.join(__dirname, "..", relativePath);
  const source = fs.readFileSync(target, "utf8");
  const fixed = patcher(source);
  if (fixed !== source) {
    fs.writeFileSync(target, fixed);
    console.log(`Patched ${relativePath}`);
  } else {
    console.log(`No patch needed for ${relativePath}`);
  }
}

function ensureImport(source, anchor, importLine) {
  if (source.includes(importLine)) return source;
  return source.replace(anchor, `${anchor}\n${importLine}`);
}

patchFile("src/features/game/GameClientTileDemoStation.tsx", (source) => {
  let fixed = source.split("}\\nfunction").join("}\nfunction");

  fixed = ensureImport(
    fixed,
    'import { BuildingInteractionPanel } from "../buildings/BuildingInteractionPanel";',
    'import { StationBuildingPanel } from "../buildings/StationBuildingPanel";',
  );

  const dismantleHandler = `  const handleDismantleBuilding = useCallback((target: BuildingState, refunds: ItemStack[]) => {\n    updateInventory((current) => refunds.reduce((next, refund) => addInventoryStack(next, refund.itemId, refund.amount), current));\n    demoBuildingsRef.current = demoBuildingsRef.current.filter((building) => building.id !== target.id);\n    demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n    window.dispatchEvent(new CustomEvent("palpalworld:building-dismantled", { detail: { buildingId: target.id, building: target } }));\n    setSelectedBuilding((current) => current?.id === target.id ? null : current);\n    setSelectedStationBuilding((current) => current?.id === target.id ? null : current);\n    setChatLines((prev) => [...prev.slice(-5), `[build] ${String(target.type)} 분해 완료`]);\n    applyDemoSnapshot(true);\n  }, [applyDemoSnapshot, updateInventory]);\n`;

  if (!fixed.includes("const handleDismantleBuilding = useCallback")) {
    fixed = fixed.replace(
      "  const handleCraftBuildingItem = useCallback((buildingType: string) => {",
      `${dismantleHandler}\n  const handleCraftBuildingItem = useCallback((buildingType: string) => {`,
    );
  }

  fixed = fixed.replaceAll(
    '<button className="draggable-panel__toggle" onClick={onClose}>닫기</button>',
    '<button className="draggable-panel__toggle" onClick={onClose}>×</button>',
  );
  fixed = fixed.replaceAll(
    '>닫기</button>',
    '>×</button>',
  );

  const stationPanelVariants = [
    `{selectedStationBuilding && selectedStation ? <section className="station-overlay-panel" aria-label={\`${'${selectedStation.name}'} 제작소\`}><header className="station-overlay-panel__header"><strong>{selectedStation.name}</strong><button onClick={() => setSelectedStationBuilding(null)}>닫기</button></header><div className="station-overlay-panel__body"><CraftingPanel inventory={inventory} stationId={selectedStation.id} compact onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></div></section> : null}`,
    `{selectedStationBuilding && selectedStation ? <section className="station-overlay-panel" aria-label={\`${'${selectedStation.name}'} 제작소\`}><header className="station-overlay-panel__header"><strong>{selectedStation.name}</strong><button onClick={() => setSelectedStationBuilding(null)}>×</button></header><div className="station-overlay-panel__body"><CraftingPanel inventory={inventory} stationId={selectedStation.id} compact onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></div></section> : null}`,
  ];

  const stationPanel = `{selectedStationBuilding && selectedStation ? <StationBuildingPanel building={selectedStationBuilding} station={selectedStation} inventory={inventory} onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} onDismantle={handleDismantleBuilding} onClose={() => setSelectedStationBuilding(null)} /> : null}`;

  for (const variant of stationPanelVariants) {
    fixed = fixed.split(variant).join(stationPanel);
  }

  fixed = fixed.replaceAll(
    "<BuildingInteractionPanel building={selectedBuilding} inventory={inventory} onInventoryChange={commitInventory} onClose={() => setSelectedBuilding(null)} onOpenCrafting={() => { const station = getCraftingStationByBuildingType(String(selectedBuilding.type)); if (station) setSelectedStationBuilding(selectedBuilding); setSelectedBuilding(null); }} />",
    "<BuildingInteractionPanel building={selectedBuilding} inventory={inventory} onInventoryChange={commitInventory} onClose={() => setSelectedBuilding(null)} onDismantle={handleDismantleBuilding} onOpenCrafting={() => { const station = getCraftingStationByBuildingType(String(selectedBuilding.type)); if (station) setSelectedStationBuilding(selectedBuilding); setSelectedBuilding(null); }} />",
  );

  return fixed;
});

patchFile("src/features/multiplayer/MultiplayerOverlay.tsx", (source) => {
  const oldBubbleBlock = `      {bubbleMessages.map((message) => {\n        const left = message.x - camera.cameraX;\n        const top = message.y - camera.cameraY;\n        if (left < -120 || left > camera.width + 120 || top < -140 || top > camera.height + 100) return null;\n        return <div key={message.message_id} className={\`world-chat-bubble world-chat-bubble--${'${message.message_type}'}\`} style={{ left, top }}>{message.message}</div>;\n      })}`;

  const newBubbleBlock = `      {bubbleMessages.map((message) => {\n        const speaker = message.player_id === playerId ? latestLocalPlayerRef.current : smoothOnlinePlayers.find((player) => player.id === message.player_id);\n        const speakerTile = speaker?.currentTile as MapTileRef | undefined;\n        const canTrackSpeaker = Boolean(speaker && (!speakerTile || isSameTile(speakerTile, camera.currentTile)));\n        const bubbleX = canTrackSpeaker && speaker ? speaker.position.x : message.x;\n        const bubbleY = canTrackSpeaker && speaker ? speaker.position.y : message.y;\n        const left = bubbleX - camera.cameraX;\n        const top = bubbleY - camera.cameraY;\n        if (left < -120 || left > camera.width + 120 || top < -160 || top > camera.height + 100) return null;\n        return <div key={message.message_id} className={\`world-chat-bubble world-chat-bubble--${'${message.message_type}'}\`} style={{ left, top }}>{message.message}</div>;\n      })}`;

  return source.split(oldBubbleBlock).join(newBubbleBlock);
});
