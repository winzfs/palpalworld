import { GameClientTileDemo } from "../features/game/GameClientTileDemo";
import { FloatingMiniMap } from "../features/world/FloatingMiniMap";

export default function HomePage() {
  return (
    <>
      <GameClientTileDemo />
      <FloatingMiniMap />
    </>
  );
}
