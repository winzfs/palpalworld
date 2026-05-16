export type PixiContainer = {
  sortableChildren?: boolean;
  zIndex?: number;
  visible?: boolean;
  position?: { set: (x: number, y: number) => void };
  scale?: { set: (value: number) => void };
  addChild: (...children: PixiContainer[]) => void;
  removeChild?: (...children: PixiContainer[]) => void;
  destroy?: (options?: { children?: boolean }) => void;
};

type PixiApplication = {
  stage: PixiContainer;
};

type PixiRuntime = {
  Container: new () => PixiContainer;
};

export type PixiGameLayers = {
  root: PixiContainer;
  terrain: PixiContainer;
  resources: PixiContainer;
  buildingsBack: PixiContainer;
  creatures: PixiContainer;
  players: PixiContainer;
  buildingsFront: PixiContainer;
  effects: PixiContainer;
  lighting: PixiContainer;
  debug: PixiContainer;
};

export function createPixiGameLayers(app: PixiApplication, PIXI: PixiRuntime): PixiGameLayers {
  const root = new PIXI.Container();
  const terrain = new PIXI.Container();
  const resources = new PIXI.Container();
  const buildingsBack = new PIXI.Container();
  const creatures = new PIXI.Container();
  const players = new PIXI.Container();
  const buildingsFront = new PIXI.Container();
  const effects = new PIXI.Container();
  const lighting = new PIXI.Container();
  const debug = new PIXI.Container();

  root.sortableChildren = true;
  players.sortableChildren = true;
  creatures.sortableChildren = true;
  buildingsBack.sortableChildren = true;
  buildingsFront.sortableChildren = true;

  root.addChild(terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug);
  app.stage.addChild(root);

  return { root, terrain, resources, buildingsBack, creatures, players, buildingsFront, effects, lighting, debug };
}
