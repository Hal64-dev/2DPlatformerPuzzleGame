class InteractiveTile extends BaseTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap, isColliderActive) {
    super(tileSize, x, y, images[initialState ? 1 : 0], tileId, isColliderActive);
    this.images = images;
    this.state = initialState;
    this.tag = tag;
    this.tileMap = tileMap;
    this.cooldown = 50;
    this.lastActivated = 0;
  }

  canActivate() {
    const now = millis();
    return now - this.lastActivated >= this.cooldown;
  }

  activate() {
    if (!this.canActivate()) return false;

    this.state = !this.state;
    this.image = this.images[this.state ? 1 : 0];
    this.lastActivated = millis();

    if (this.tag && this.tileMap) {
      setTimeout(() => this.tileMap.toggleTilesByTag(this.tag), 0);
    }

    this.emit('activated', this.state);
    return true;
  }

  render(g) {
    if (this.image && this.tag && this.tileMap?.getTagColor) {
      g.tint(this.tileMap.getTagColor(this.tag));
      g.image(this.image, this.position.x, this.position.y);
      g.noTint();
    }
  }
}