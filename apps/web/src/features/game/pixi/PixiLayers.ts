import { Container, type Application } from "pixi.js";

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
  const root = new Container();
  const terrain = new Container();
  const resources = new Container();
  const buildingsBack = new Container();
  const creatures = new Container();
  const players = new Container();
  const buildingsFront = new Container();
  const effects = new Container();
  const lighting = new Container();
  const debug = new Container();

  root.sortableChildren = true;
  players.sortableChildren = true;
  creatures.sortableChildren = true;
  buildingsBack.sortableChildren = true;
  buildingsFront.sortableChildren = true;

  root.addChild(terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug);
  app.stage.addChild(root);

  return { root, terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug };
}
