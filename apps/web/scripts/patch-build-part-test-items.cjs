const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "buildings", "buildPartCatalog.ts");
let source = fs.readFileSync(target, "utf8");

if (source.includes("export const BUILD_PART_TEST_ITEM_STACKS")) {
  console.log("[patch-build-part-test-items] already present");
  process.exit(0);
}

const insertion = `
export const BUILD_PART_TEST_ITEM_STACKS: ItemStack[] = [
  { itemId: "wood_foundation_part", amount: 99 },
  { itemId: "wood_floor_part", amount: 99 },
  { itemId: "wood_half_floor_part", amount: 99 },
  { itemId: "wood_wall_part", amount: 99 },
  { itemId: "wood_half_wall_part", amount: 99 },
  { itemId: "wood_door_part", amount: 99 },
  { itemId: "wood_window_part", amount: 99 },
  { itemId: "wood_corner_post_part", amount: 99 },
  { itemId: "wood_railing_part", amount: 99 },
  { itemId: "wood_stairs_part", amount: 99 },
  { itemId: "wood_ladder_part", amount: 99 },
  { itemId: "wood_second_floor_part", amount: 99 },
  { itemId: "wood_roof_edge_part", amount: 99 },
  { itemId: "wood_roof_corner_part", amount: 99 },
  { itemId: "wood_roof_cap_part", amount: 99 },
  { itemId: "stone_foundation_part", amount: 99 },
  { itemId: "stone_floor_part", amount: 99 },
  { itemId: "stone_wall_part", amount: 99 },
  { itemId: "stone_door_frame_part", amount: 99 },
  { itemId: "stone_window_part", amount: 99 },
  { itemId: "stone_stairs_part", amount: 99 },
  { itemId: "cloth_awning_part", amount: 99 },
  { itemId: "small_lamp_post_part", amount: 99 },
  { itemId: "wood_sign_part", amount: 99 },
  { itemId: "wood_fence_part", amount: 99 },
  { itemId: "wood_gate_part", amount: 99 },
];
`;

const anchor = "export const BUILD_PARTS: Record<BuildPartId, BuildPartDefinition> = {";
if (!source.includes(anchor)) {
  console.log("[patch-build-part-test-items] skipped: BUILD_PARTS anchor not found");
  process.exit(0);
}

source = source.replace(anchor, `${insertion}\n${anchor}`);
fs.writeFileSync(target, source);
console.log("[patch-build-part-test-items] patched BUILD_PART_TEST_ITEM_STACKS");
