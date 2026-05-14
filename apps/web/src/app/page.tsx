import { GameClient } from "../features/game/GameClient";
import { FloatingMiniMap } from "../features/world/FloatingMiniMap";

export default function HomePage() {
  return (
    <>
      <GameClient />
      <FloatingMiniMap />
    </>
  );
}
