class BlinkingTile extends BaseTile {
  constructor(tileSize, x, y, img, tileId, blinkInterval) {
    super(tileSize, x, y, img, tileId, true);
    this.blinkInterval = blinkInterval;
    this.timer = 0;
    this.isVisible = true;
  }

  update(deltaTime) {
    this.timer += deltaTime;
    if (this.timer >= this.blinkInterval) {
      this.timer = 0;
      this.isVisible = !this.isVisible;

      this.isColliderActive = this.isVisible;
    }
  }

  render(g) {
    if (this.isVisible && this.image) {
      g.image(this.image, this.position.x, this.position.y);
    }
  }
}
