import { GameClientTileDemo } from "../features/game/GameClientTileDemo";
import { FloatingMiniMap } from "../features/world/FloatingMiniMap";
import { TileTravelBanner } from "../features/world/TileTravelBanner";

export default function HomePage() {
  return (
    <>
      <GameClientTileDemo />
      <FloatingMiniMap />
      <TileTravelBanner />
    </>
  );
}
