import { GameClientTileDemoStation } from "../features/game/GameClientTileDemoStation";
import { MultiplayerOverlay } from "../features/multiplayer/MultiplayerOverlay";
import { TileTravelBanner } from "../features/world/TileTravelBanner";

export default function HomePage() {
  return (
    <>
      <GameClientTileDemoStation />
      <MultiplayerOverlay />
      <TileTravelBanner />
    </>
  );
}
