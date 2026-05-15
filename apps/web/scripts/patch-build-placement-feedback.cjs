const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-placement-feedback] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-placement-feedback] patched ${label}`);
}

replaceOnce(
  '  useEffect(() => {\n    const handleBuildPartSelection = (event: Event) => {\n      const customEvent = event as CustomEvent<{ selectedPart?: PlacedBuildPart | null; selectedHousePartCount?: number }>;\n      setSelectedPlacedBuildPart(customEvent.detail?.selectedPart ?? null);\n      setSelectedHousePartCount(customEvent.detail?.selectedHousePartCount ?? 0);\n    };\n    window.addEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n    return () => window.removeEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n  }, []);',
  '  useEffect(() => {\n    const handleBuildPartSelection = (event: Event) => {\n      const customEvent = event as CustomEvent<{ selectedPart?: PlacedBuildPart | null; selectedHousePartCount?: number }>;\n      setSelectedPlacedBuildPart(customEvent.detail?.selectedPart ?? null);\n      setSelectedHousePartCount(customEvent.detail?.selectedHousePartCount ?? 0);\n    };\n    window.addEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n    return () => window.removeEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n  }, []);\n  useEffect(() => {\n    const handleBuildPlacementFailed = (event: Event) => {\n      const customEvent = event as CustomEvent<{ reason?: string }>;\n      setChatLines((prev) => [...prev.slice(-5), `[build] ${customEvent.detail?.reason ?? "설치할 수 없습니다."}`]);\n    };\n    window.addEventListener("palpalworld:build-placement-failed", handleBuildPlacementFailed);\n    return () => window.removeEventListener("palpalworld:build-placement-failed", handleBuildPlacementFailed);\n  }, []);',
  "placement failure listener",
);

if (changed) fs.writeFileSync(target, source);
