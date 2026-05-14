import { GameClientTileDemoStation } from "../features/game/GameClientTileDemoStation";
import { TileTravelBanner } from "../features/world/TileTravelBanner";

export default function HomePage() {
  return (
    <>
      <GameClientTileDemoStation />
      <TileTravelBanner />
    </>
  );
}
