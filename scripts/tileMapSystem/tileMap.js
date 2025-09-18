class TileMap {
  constructor(tileSize, mapData, tileImages, physicsEngine) {
    this.tileSize = tileSize;
    this.mapData = mapData;
    this.tileImages = tileImages;
    this.physicsEngine = physicsEngine;
    this.width = mapData.tiles[0].length;
    this.height = mapData.tiles.length;
    this.tiles = [];

    // Cache for performance optimization
    this._allTilesCache = null;
    this._classTilesCache = new Map();

    this._generateTiles();
    this._registerColliders();

    // Build cache after tiles are generated
    this._buildCaches();
  }

  _buildCaches() {
    // Cache all tiles
    this._allTilesCache = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile !== null) {
          this._allTilesCache.push(tile);
        }
      }
    }

    // Cache tiles by class name
    const classMap = new Map();
    for (const tile of this._allTilesCache) {
      const className = tile.constructor.name;
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className).push(tile);
    }
    this._classTilesCache = classMap;

    console.log(`TileMap: Cached ${this._allTilesCache.length} tiles across ${classMap.size} classes`);
  }

  _generateTiles() {
    const rawTiles = this.mapData.tiles;
    const tagged = this.mapData.taggedTiles || [];
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tileId = rawTiles[y][x];
        if (tileId === 0) {
          this.tiles[y][x] = null;
          continue;
        }

        const tagEntry = tagged.find(t => t.x === x && t.y === y);
        const tag = tagEntry?.tag || null;

        this.tiles[y][x] = this._createTile(tileId, x, y, tag);
      }
    }
  }

  _createTile(tileId, x, y, tag) {
    const posX = x * this.tileSize;
    const posY = y * this.tileSize;

    console.log(`Creating tile: ID=${tileId}, pos=(${x},${y}), tag=${tag}`);

    switch (tileId) {
      case 10: case 11: // Ball switches
        return new BallSwitchTile(this.tileSize, posX, posY,
          [this.tileImages[10], this.tileImages[11]], tileId, tileId === 11, tag, this);
      case 12: case 13: // Player switches
        return new PlayerSwitchTile(this.tileSize, posX, posY,
          [this.tileImages[12], this.tileImages[13]], tileId, tileId === 13, tag, this);
      case 14: case 15: // Toggle tiles
        return new ToggleTile(this.tileSize, posX, posY,
          [this.tileImages[15], this.tileImages[14]], tileId, tileId === 14, tag, this);
      case 16: // Goal tile
        return new GoalTile(this.tileSize, posX, posY, this.tileImages[tileId], tileId);
      case 17: case 18: case 19: case 20: // Laser emitters
        const directions = ["right", "up", "left", "down"];
        return new LaserEmitterTile(this.tileSize, posX, posY,
          this.tileImages[tileId], tileId, directions[tileId - 17], this);
      case 21: case 22: // Laser receivers
        return new LaserReceiverTile(this.tileSize, posX, posY,
          [this.tileImages[21], this.tileImages[22]], tileId, tileId === 22, tag, this);
      case 23: case 24: case 25: case 26: case 27: case 28: case 29: case 30: case 31: case 32: case 33: case 34: case 35: case 36: case 37: case 38: // Ball Generators
        const direction = BallGeneratorTile.getDirectionFromTileId(23, tileId);
        // Pass all 16 sprites (23-38) to cover all 8 directions x 2 states each
        const ballGenImages = this.tileImages.slice(tileId, tileId + 2); // Get sprites for off/on pairs
        return new BallGeneratorTile(this.tileSize, posX, posY,
          ballGenImages, tileId, false, tag, this, direction, this.mapData.ballSpeed.value);
      default:
        return new BasicTile(this.tileSize, posX, posY, this.tileImages[tileId], tileId);
    }
  }

  _registerColliders() {
    if (!this.physicsEngine) return;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile?.rigidBody) {
          this.physicsEngine.addBody(tile.rigidBody);
        }
      }
    }
  }

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.tiles[y][x];
  }

  getTileAABB(x, y, tileSize) {
    return new AABB(
      x * tileSize,
      y * tileSize,
      (x + 1) * tileSize,
      (y + 1) * tileSize
    );
  }

  tilesByClassName(className) {
    return this._classTilesCache.get(className) || [];
  }

  getAllTiles() {
    return this._allTilesCache || [];
  }

  toggleTilesByTag(tag) {
    const toggleTiles = this.getAllTiles().filter(tile =>
      tile instanceof ToggleTile && tile.tag === tag
    );
    if (toggleTiles.length > 0) {
      // Since ToggleTile's toggle operates on the entire group, you only need to call the first one
      toggleTiles[0].toggle();
    }

    const ballGeneratorTiles = this.getAllTiles().filter(tile =>
      tile instanceof BallGeneratorTile && tile.tag === tag
    );
    ballGeneratorTiles.forEach(tile => {
      tile.toggle();
    });
  }

  getTagColor(tag) {
    const colors = {
      'A': '#FF9700',
      'B': '#00B2FF',
      'C': '#D500FF',
      'D': '#33FFCC',
      'E': '#FF0081'
    };
    return colors[tag] || 'white';
  }

  update(deltaTime) {
    this.getAllTiles().forEach(tile => {
      if (tile.update) {
        tile.update(deltaTime);
      }
    });
  }

  backgroundRender(g) {
    this.getAllTiles().forEach(tile => tile.backgroundRender(g));
  }

  render(g) {
    this.getAllTiles().forEach(tile => tile.render(g));
  }
}