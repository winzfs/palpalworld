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

patchFile("src/features/game/GameClientTileDemoStation.tsx", (source) => {
  let fixed = source.split("}\\nfunction").join("}\nfunction");

  const oldStationPanel = `{selectedStationBuilding && selectedStation ? <section className="station-overlay-panel" aria-label={\`${'${selectedStation.name}'} 제작소\`}><header className="station-overlay-panel__header"><strong>{selectedStation.name}</strong><button onClick={() => setSelectedStationBuilding(null)}>닫기</button></header><div className="station-overlay-panel__body"><CraftingPanel inventory={inventory} stationId={selectedStation.id} compact onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></div></section> : null}`;

  const newStationPanel = `{selectedStationBuilding && selectedStation ? <section className="station-overlay-panel" aria-label={\`${'${selectedStation.name}'} 제작소\`}><header className="station-overlay-panel__header"><strong>{selectedStation.name}</strong><span className="building-interaction__header-actions">{!(selectedStationBuilding as any).isRemoteSharedBuilding && (!selectedStationBuilding.ownerPlayerId || selectedStationBuilding.ownerPlayerId === demoPlayerId) ? <button className="building-interaction__header-danger" onClick={() => { const target = selectedStationBuilding; const definition = getProgressionBuilding(String(target.type)); const refunds = (definition?.requires ?? []).map((item) => ({ itemId: item.itemId, amount: Math.max(1, Math.floor(item.amount / 2)) })); updateInventory((current) => refunds.reduce((next, refund) => addInventoryStack(next, refund.itemId, refund.amount), current)); demoBuildingsRef.current = demoBuildingsRef.current.filter((building) => building.id !== target.id); demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current); window.dispatchEvent(new CustomEvent("palpalworld:building-dismantled", { detail: { buildingId: target.id, building: target } })); setSelectedStationBuilding(null); applyDemoSnapshot(true); }}>분해</button> : null}<button className="station-overlay-panel__close" onClick={() => setSelectedStationBuilding(null)} aria-label="제작소 닫기">×</button></span></header><div className="station-overlay-panel__body"><CraftingPanel inventory={inventory} stationId={selectedStation.id} compact onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></div></section> : null}`;

  fixed = fixed.split(oldStationPanel).join(newStationPanel);
  fixed = fixed.split('>닫기</button>').join('>×</button>');
  return fixed;
});

patchFile("src/features/multiplayer/MultiplayerOverlay.tsx", (source) => {
  const oldBubbleBlock = `      {bubbleMessages.map((message) => {\n        const left = message.x - camera.cameraX;\n        const top = message.y - camera.cameraY;\n        if (left < -120 || left > camera.width + 120 || top < -140 || top > camera.height + 100) return null;\n        return <div key={message.message_id} className={\`world-chat-bubble world-chat-bubble--${'${message.message_type}'}\`} style={{ left, top }}>{message.message}</div>;\n      })}`;

  const newBubbleBlock = `      {bubbleMessages.map((message) => {\n        const speaker = message.player_id === playerId ? latestLocalPlayerRef.current : smoothOnlinePlayers.find((player) => player.id === message.player_id);\n        const speakerTile = speaker?.currentTile as MapTileRef | undefined;\n        const canTrackSpeaker = Boolean(speaker && (!speakerTile || isSameTile(speakerTile, camera.currentTile)));\n        const bubbleX = canTrackSpeaker && speaker ? speaker.position.x : message.x;\n        const bubbleY = canTrackSpeaker && speaker ? speaker.position.y : message.y;\n        const left = bubbleX - camera.cameraX;\n        const top = bubbleY - camera.cameraY;\n        if (left < -120 || left > camera.width + 120 || top < -160 || top > camera.height + 100) return null;\n        return <div key={message.message_id} className={\`world-chat-bubble world-chat-bubble--${'${message.message_type}'}\`} style={{ left, top }}>{message.message}</div>;\n      })}`;

  return source.split(oldBubbleBlock).join(newBubbleBlock);
});
