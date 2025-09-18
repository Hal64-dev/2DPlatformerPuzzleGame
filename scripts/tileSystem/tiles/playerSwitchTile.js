class PlayerSwitchTile extends InteractiveTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap) {
    super(tileSize, x, y, images, tileId, initialState, tag, tileMap, false);
  }

  onPlayerInteract() {
    this.activate();
  }
}