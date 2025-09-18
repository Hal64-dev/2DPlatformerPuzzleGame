class ToggleTile extends InteractiveTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap) {
    super(tileSize, x, y, images, tileId, initialState, tag, tileMap, initialState);
    this.shouldBecomeVisible = false;
    this.isVisible = initialState;

    this._isColliderActive = initialState;
  }

  get isColliderActive() {
    return this.isVisible && this._isColliderActive;
  }

  set isColliderActive(value) {
    this._isColliderActive = value;
    if (this._collider) {
      this._collider.isActive = this.isColliderActive;
    }
  }

  toggle() {
    const group = this._getGroup();

    for (const tile of group) {
      const nextState = !tile.isVisible;
      if (nextState && tile._hasEntityInside()) {
        tile.shouldBecomeVisible = true;
      } else {
        tile.setVisible(nextState);
        tile.shouldBecomeVisible = false;
      }
    }
  }

  setVisible(visible) {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.state = visible;
      this.image = this.images[visible ? 1 : 0];

      this._isColliderActive = visible;
      if (this._collider) {
        this._collider.isActive = visible;
      }
    }
  }

  update(deltaTime) {
    // 最初にentityの移動をチェック - shouldBecomeVisibleが設定されている場合
    if (this.shouldBecomeVisible && !this._hasEntityInside()) {
      this.setVisible(true);
      this.shouldBecomeVisible = false;
    }

    // その後で隣接タイルの可視性をチェック（ただしshouldBecomeVisibleが設定されている場合は実行しない）
    if (!this.shouldBecomeVisible) {
      this._checkAdjacentTilesVisibility();
    }

    if (this.rigidBody && this.rigidBody.collider) {
      this.rigidBody.collider.isActive = this.isColliderActive;
    }
  }

  _checkAdjacentTilesVisibility() {
    if (!this.isVisible) return; // Already invisible, no need to check

    const adjacentTiles = this._getAdjacentTilesInSameGroup();

    // If any adjacent tile is invisible, make this tile invisible too
    const hasInvisibleAdjacent = adjacentTiles.some(tile => !tile.isVisible);

    if (hasInvisibleAdjacent) {
      this.setVisible(false);
      this.shouldBecomeVisible = false;
    }
  }

  _getAdjacentTilesInSameGroup() {
    if (!this.tileMap || !this.tag) return [];

    const tileX = Math.floor(this.position.x / this.tileSize);
    const tileY = Math.floor(this.position.y / this.tileSize);

    // Check 4 directions: up, down, left, right
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];

    const adjacentTiles = [];

    for (const dir of directions) {
      const adjX = tileX + dir.x;
      const adjY = tileY + dir.y;
      const adjacentTile = this.tileMap.getTile(adjX, adjY);

      // Check if adjacent tile is a ToggleTile with the same tag
      if (adjacentTile instanceof ToggleTile && adjacentTile.tag === this.tag) {
        adjacentTiles.push(adjacentTile);
      }
    }

    return adjacentTiles;
  }

  render(g) {
    if (!this.image) return;
    if (!this.tag) return;
    if (!this.tileMap?.getTagColor) return;

    let c = color(this.tileMap.getTagColor(this.tag));
    if (!this.isVisible) c.setAlpha(128);
    g.tint(c);
    g.image(this.image, this.position.x, this.position.y);
    g.noTint();
  }

  _getGroup() {
    if (!this.tileMap || !this.tag) return [this];
    return this.tileMap.getAllTiles().filter(tile =>
      tile instanceof ToggleTile && tile.tag === this.tag
    );
  }

  _hasEntityInside() {
    const entities = GameManager.instance.entities;
    const tileAABB = this.globalCollider;

    return entities.some(entity => {
      if (!entity || !entity.globalCollider) return false;

      const entityAABB = entity.globalCollider;

      const overlap = tileAABB.intersects(entityAABB);

      if (overlap) {
        console.log(`Entity ${entity.constructor.name} overlapping with toggle tile at (${this.position.x}, ${this.position.y})`);
      }

      return overlap;
    });
  }

  getDebugInfo() {
    return {
      position: this.position,
      isVisible: this.isVisible,
      isColliderActive: this.isColliderActive,
      shouldBecomeVisible: this.shouldBecomeVisible,
      tag: this.tag,
      hasEntityInside: this._hasEntityInside(),
      adjacentTiles: this._getAdjacentTilesInSameGroup().length
    };
  }
}