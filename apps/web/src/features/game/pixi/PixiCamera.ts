import type { Vector2 } from "@palpalworld/shared";

export type PixiCameraState = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
};

export function createPixiCamera(width = 1, height = 1): PixiCameraState {
  return { x: 0, y: 0, width, height, zoom: 1 };
}

export function centerPixiCameraOn(camera: PixiCameraState, target: Vector2) {
  camera.x = target.x - camera.width / 2 / camera.zoom;
  camera.y = target.y - camera.height / 2 / camera.zoom;
}

export function resizePixiCamera(camera: PixiCameraState, width: number, height: number) {
  camera.width = Math.max(1, width);
  camera.height = Math.max(1, height);
}

export function getPixiCameraBounds(camera: PixiCameraState, padding = 0) {
  return {
    left: camera.x - padding,
    top: camera.y - padding,
    right: camera.x + camera.width / camera.zoom + padding,
    bottom: camera.y + camera.height / camera.zoom + padding,
  };
}
