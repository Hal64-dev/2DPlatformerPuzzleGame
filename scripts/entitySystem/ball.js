class Ball extends Entity {
  constructor(position, size, initialVelocity, isStatic = false) {
    super(position, size, 1, false, isStatic);

    this.rigidBody.velocity = initialVelocity.copy();
    this.rigidBody.bounce = 1;
    this.rigidBody.collider.addCollisionListener(this.handleCollision.bind(this));
  }

  update(deltaTime) {
    if (!this.active) return;

    super.update(deltaTime);
  }

  handleCollision(other) {
    if (other.tile?.onBallHit) {
      other.tile.onBallHit();
    }
  }

  render(g) {
    const roundedPos = new Vec2(Math.round(this.position.x), Math.round(this.position.y));
    g.fill('#E91E63');
    g.rect(roundedPos.x, roundedPos.y, this.size.x, this.size.y);
  }
}
