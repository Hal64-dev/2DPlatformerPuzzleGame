class LaserEmitterTile extends BaseTile {
  constructor(tileSize, x, y, image, tileId, direction, tileMap) {
    super(tileSize, x, y, image, tileId, true);
    this.direction = direction;
    this.tileMap = tileMap;
    this.laserLength = 40;
    this.laserColor = '#f34552';
    this.lastPlayerHit = 0;
    this.playerHitCooldown = 200;
    this.laserWidth = 2; // Collision width of the laser beam (much narrower than visual)
  }

  update(deltaTime) {
    this._checkLaserCollisions();
  }

  _checkLaserCollisions() {
    const [dx, dy] = this._getDirectionOffset();
    const startX = Math.floor(this.position.x / this.tileSize);
    const startY = Math.floor(this.position.y / this.tileSize);

    let laserEndTile = this.laserLength;

    // Check each tile along the laser path
    for (let i = 1; i <= this.laserLength; i++) {
      const tx = startX + dx * i;
      const ty = startY + dy * i;
      const tile = this.tileMap.getTile(tx, ty);

      // Hit laser receiver - trigger it and stop the laser
      if (tile instanceof LaserReceiverTile) {
        tile.onLaserHit(this.direction);
        laserEndTile = i;  // Laser stops at the receiver
        break;
      }

      // If we hit any other solid tile, stop the laser
      if (tile && tile.isColliderActive) {
        laserEndTile = i - 1;
        break;
      }

      // Hit other tiles with onLaserHit method
      if (tile && tile.onLaserHit && !(tile instanceof LaserReceiverTile)) {
        tile.onLaserHit(this.direction);
      }
    }

    // Check player collision
    this._checkPlayerCollision(dx, dy, startX, startY, laserEndTile);
  }

  _checkPlayerCollision(dx, dy, startX, startY, laserEndTile) {
    const player = GameManager.instance.getPlayer();
    if (!player) return;

    const now = millis();
    if (now - this.lastPlayerHit < this.playerHitCooldown) {
      return;
    }

    // Get laser start and end points
    const [x0, y0] = this._getLaserOrigin();
    const laserEndX = x0 + dx * laserEndTile * this.tileSize;
    const laserEndY = y0 + dy * laserEndTile * this.tileSize;

    // Create narrow laser collision box
    const laserAABB = this._createLaserCollisionBox(x0, y0, laserEndX, laserEndY);
    const playerAABB = player.globalCollider;

    if (this._preciseOverlapCheck(playerAABB, laserAABB)) {
      this.lastPlayerHit = now;

      setTimeout(() => {
        GameManager.instance.reloadMap();
      }, 50);
      return;
    }
  }

  _createLaserCollisionBox(x0, y0, x1, y1) {
    // Create a narrow collision box along the laser line
    const halfWidth = this.laserWidth / 2;

    if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) {
      // Horizontal laser - thin vertically
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const centerY = (y0 + y1) / 2;

      return new AABB(
        minX, centerY - halfWidth,
        maxX, centerY + halfWidth
      );
    } else {
      // Vertical laser - thin horizontally
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);
      const centerX = (x0 + x1) / 2;

      return new AABB(
        centerX - halfWidth, minY,
        centerX + halfWidth, maxY
      );
    }
  }

  _preciseOverlapCheck(aabb1, aabb2) {
    const overlapX = Math.min(aabb1.right, aabb2.right) - Math.max(aabb1.left, aabb2.left);
    const overlapY = Math.min(aabb1.bottom, aabb2.bottom) - Math.max(aabb1.top, aabb2.top);

    return overlapX > 0 && overlapY > 0; // Changed from > 1 to > 0 for more precise collision
  }

  backgroundRender(g) {
    g.stroke(this.laserColor);
    g.strokeWeight(this.laserWidth);

    const [dx, dy] = this._getDirectionOffset();
    const [x0, y0] = this._getLaserOrigin();

    let x1 = x0;
    let y1 = y0;

    // Calculate laser end point
    for (let i = 1; i <= this.laserLength; i++) {
      const tx = Math.floor(this.position.x / this.tileSize) + dx * i;
      const ty = Math.floor(this.position.y / this.tileSize) + dy * i;
      const tile = this.tileMap.getTile(tx, ty);

      // Stop at laser receivers (they absorb the laser)
      if (tile instanceof LaserReceiverTile) {
        x1 = x0 + dx * i * this.tileSize;
        y1 = y0 + dy * i * this.tileSize;
        break;
      }

      // Stop at other solid tiles
      if (tile && tile.isColliderActive) {
        x1 = x0 + dx * (i - 0.5) * this.tileSize;
        y1 = y0 + dy * (i - 0.5) * this.tileSize;
        break;
      }

      x1 = x0 + dx * i * this.tileSize;
      y1 = y0 + dy * i * this.tileSize;
    }

    g.line(x0, y0, x1, y1);
    g.noStroke();
  }

  render(g) {
    super.render(g);

    // Debug visualization
    if (GameManager.instance?.isShowDebugInfo) {
      g.stroke('orange');
      g.strokeWeight(1);
      const [startTileX, startTileY] = [Math.floor(this.position.x / this.tileSize), Math.floor(this.position.y / this.tileSize)];
      const [dx, dy] = this._getDirectionOffset();

      for (let i = 1; i <= this.laserLength; i++) {
        const tx = startTileX + dx * i;
        const ty = startTileY + dy * i;
        const tile = this.tileMap.getTile(tx, ty);

        // Stop at laser receivers or solid tiles
        if (tile instanceof LaserReceiverTile) {
          g.noFill();
          g.rect(tx * this.tileSize, ty * this.tileSize, this.tileSize, this.tileSize);
          break;
        }

        if (tile && tile.isColliderActive) break;

        g.noFill();
        g.rect(tx * this.tileSize, ty * this.tileSize, this.tileSize, this.tileSize);
      }

      // Debug: Show actual laser collision box
      g.stroke('red');
      g.strokeWeight(1);
      const [x0, y0] = this._getLaserOrigin();
      let laserEndTile = this.laserLength;

      // Calculate actual laser end for collision
      for (let i = 1; i <= this.laserLength; i++) {
        const tx = startTileX + dx * i;
        const ty = startTileY + dy * i;
        const tile = this.tileMap.getTile(tx, ty);

        if (tile instanceof LaserReceiverTile || (tile && tile.isColliderActive)) {
          laserEndTile = (tile instanceof LaserReceiverTile) ? i : i - 1;
          break;
        }
      }

      const laserEndX = x0 + dx * laserEndTile * this.tileSize;
      const laserEndY = y0 + dy * laserEndTile * this.tileSize;
      const collisionBox = this._createLaserCollisionBox(x0, y0, laserEndX, laserEndY);

      g.noFill();
      g.rect(collisionBox.left, collisionBox.top,
        collisionBox.right - collisionBox.left,
        collisionBox.bottom - collisionBox.top);

      g.noStroke();
    }
  }

  _getDirectionOffset() {
    const offsets = {
      'right': [1, 0],
      'up': [0, -1],
      'left': [-1, 0],
      'down': [0, 1]
    };
    return offsets[this.direction] || [1, 0];
  }

  _getLaserOrigin() {
    const origins = {
      'right': [this.position.x + this.tileSize, this.position.y + this.tileSize / 2],
      'up': [this.position.x + this.tileSize / 2, this.position.y],
      'left': [this.position.x, this.position.y + this.tileSize / 2],
      'down': [this.position.x + this.tileSize / 2, this.position.y + this.tileSize]
    };
    return origins[this.direction] || [this.position.x + this.tileSize / 2, this.position.y + this.tileSize / 2];
  }

  getDebugInfo() {
    return {
      position: this.position,
      direction: this.direction,
      lastPlayerHit: this.lastPlayerHit,
      laserLength: this.laserLength,
      laserWidth: this.laserWidth
    };
  }
}