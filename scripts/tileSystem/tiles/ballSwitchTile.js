class BallSwitchTile extends InteractiveTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap) {
    super(tileSize, x, y, images, tileId, initialState, tag, tileMap, true);
    this.cooldown = 500;
  }

  onBallHit() {
    this.activate();
  }
}