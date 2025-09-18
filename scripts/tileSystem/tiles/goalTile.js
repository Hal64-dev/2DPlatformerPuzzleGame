class GoalTile extends BaseTile {
  constructor(tileSize, x, y, image, tileId) {
    super(tileSize, x, y, image, tileId, false);
  }

  onEntityHit(entity) {
    if (entity instanceof Player) {
      GameManager.instance.loadNextMap();
    }
  }
}