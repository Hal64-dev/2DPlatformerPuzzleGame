class LaserReceiverTile extends InteractiveTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap) {
    super(tileSize, x, y, images, tileId, initialState, tag, tileMap, true);
    this.lastLaserHit = 0;
    this.laserTimeout = 100;
    this.wasHitThisFrame = false;

    console.log(`LaserReceiver created at (${x}, ${y}) with tag: ${tag}, initialState: ${initialState}`);
  }

  update(deltaTime) {
    const now = millis();

    // Check if we should turn off due to no laser hit
    if (this.state && (now - this.lastLaserHit > this.laserTimeout)) {
      console.log(`LaserReceiver at (${this.position.x}, ${this.position.y}) turning OFF due to timeout`);
      this._setState(false);
    }

    // Reset the frame hit flag
    this.wasHitThisFrame = false;
  }

  onLaserHit(direction) {
    const now = millis();
    this.lastLaserHit = now;
    this.wasHitThisFrame = true;

    console.log(`LaserReceiver at (${this.position.x}, ${this.position.y}) hit by laser from ${direction}`);

    if (!this.state) {
      console.log("LaserReceiver switching ON");
      this._setState(true);
    }
  }

  _setState(newState) {
    if (this.state === newState) return;

    console.log(`LaserReceiver at (${this.position.x}, ${this.position.y}) changing state from ${this.state} to ${newState}`);

    this.state = newState;
    this.image = this.images[newState ? 1 : 0];

    if (this.tag && this.tileMap) {
      console.log(`LaserReceiver triggering toggle for tag: ${this.tag}`);
      setTimeout(() => {
        this.tileMap.toggleTilesByTag(this.tag);
      }, 0);
    }

    this.emit('stateChanged', newState);
  }

  // デバッグ用メソッド
  getDebugInfo() {
    return {
      position: this.position,
      state: this.state,
      tag: this.tag,
      lastLaserHit: this.lastLaserHit,
      laserTimeout: this.laserTimeout,
      timeSinceLastHit: millis() - this.lastLaserHit,
      wasHitThisFrame: this.wasHitThisFrame
    };
  }
}