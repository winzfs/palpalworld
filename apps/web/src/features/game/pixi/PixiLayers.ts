import type { Application, Container } from "pixi.js";

export type PixiGameLayers = {
  root: Container;
  terrain: Container;
  resources: Container;
  buildingsBack: Container;
  creatures: Container;
  players: Container;
  buildingsFront: Container;
  effects: Container;
  lighting: Container;
  debug: Container;
};

export function createPixiGameLayers(app: Application): PixiGameLayers {
  const root = new app.stage.constructor() as Container;
  const terrain = new app.stage.constructor() as Container;
  const resources = new app.stage.constructor() as Container;
  const buildingsBack = new app.stage.constructor() as Container;
  const creatures = new app.stage.constructor() as Container;
  const players = new app.stage.constructor() as Container;
  const buildingsFront = new app.stage.constructor() as Container;
  const effects = new app.stage.constructor() as Container;
  const lighting = new app.stage.constructor() as Container;
  const debug = new app.stage.constructor() as Container;

  root.sortableChildren = true;
  players.sortableChildren = true;
  creatures.sortableChildren = true;
  buildingsBack.sortableChildren = true;
  buildingsFront.sortableChildren = true;

  root.addChild(terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug);
  app.stage.addChild(root);

  return { root, terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug };
}
