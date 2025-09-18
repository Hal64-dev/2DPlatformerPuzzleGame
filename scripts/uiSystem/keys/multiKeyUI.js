class MultiKeyUI {
  constructor(config) {
    this.targetObj = config.targetObj;
    this.keyUIList = config.keyUIList || [];
    this.tileMap = config.tileMap;
    
    // Layout configuration
    this.layout = config.layout || 'overlay'; // 'overlay', 'horizontal', 'vertical', 'circle'
    this.spacing = config.spacing || 20;
    this.groupOffset = config.groupOffset || Vec2.zero();
    
    // Visibility and filtering
    this.visibilityCondition = config.visibilityCondition || null;
    this.targetFilter = config.targetFilter || null;
    
    // Performance optimization
    this._positionCache = new Map();
    this._cacheInitialized = false;
    
    // Initialize cache if target is a tile class
    if (this._isTileClass(this.targetObj)) {
      this._initializeTileCache();
    }
  }

  // Update all KeyUI elements
  update(dt) {
    this.keyUIList.forEach(keyUI => {
      if (keyUI.update) {
        keyUI.update(dt);
      }
    });
  }

  // Initialize cache for tile class positions
  _initializeTileCache() {
    if (!this.tileMap || this._cacheInitialized) return;
    
    const className = this.targetObj.name;
    const positions = this._calculateTilePositions(this.targetObj);
    this._positionCache.set(className, positions);
    this._cacheInitialized = true;
  }

  // Renders all managed KeyUI elements with layout
  render(g) {
    if (this.visibilityCondition && !this.visibilityCondition()) {
      return;
    }
    
    const targetPositions = this._getTargetPositions();
    if (targetPositions.length === 0) return;
    
    // Apply target filter if specified
    const filteredPositions = this.targetFilter 
      ? targetPositions.filter(this.targetFilter)
      : targetPositions;
    
    filteredPositions.forEach(parentPos => {
      this._renderKeyGroup(g, parentPos);
    });
  }

  // Render a group of keys at a specific position
  _renderKeyGroup(g, parentPos) {
    const layoutPositions = this._calculateLayoutPositions(parentPos);
    
    this.keyUIList.forEach((keyUI, index) => {
      if (index < layoutPositions.length) {
        keyUI.render(g, [layoutPositions[index]]);
      }
    });
  }

  // Calculate positions for keys based on layout
  _calculateLayoutPositions(parentPos) {
    const adjustedParentPos = parentPos.add(this.groupOffset);
    
    switch (this.layout) {
      case 'horizontal':
        return this._calculateHorizontalLayout(adjustedParentPos);
      case 'vertical':
        return this._calculateVerticalLayout(adjustedParentPos);
      case 'circle':
        return this._calculateCircleLayout(adjustedParentPos);
      case 'overlay':
      default:
        return this.keyUIList.map(() => adjustedParentPos);
    }
  }

  // Calculate horizontal layout positions
  _calculateHorizontalLayout(parentPos) {
    const positions = [];
    const totalWidth = (this.keyUIList.length - 1) * this.spacing;
    const startX = parentPos.x - totalWidth / 2;
    
    this.keyUIList.forEach((_, index) => {
      positions.push(new Vec2(startX + index * this.spacing, parentPos.y));
    });
    
    return positions;
  }

  // Calculate vertical layout positions
  _calculateVerticalLayout(parentPos) {
    const positions = [];
    const totalHeight = (this.keyUIList.length - 1) * this.spacing;
    const startY = parentPos.y - totalHeight / 2;
    
    this.keyUIList.forEach((_, index) => {
      positions.push(new Vec2(parentPos.x, startY + index * this.spacing));
    });
    
    return positions;
  }

  // Calculate circular layout positions
  _calculateCircleLayout(parentPos) {
    const positions = [];
    const radius = this.spacing;
    const angleStep = (Math.PI * 2) / this.keyUIList.length;
    
    this.keyUIList.forEach((_, index) => {
      const angle = index * angleStep;
      const x = parentPos.x + Math.cos(angle) * radius;
      const y = parentPos.y + Math.sin(angle) * radius;
      positions.push(new Vec2(x, y));
    });
    
    return positions;
  }

  // Get target positions (cached for performance)
  _getTargetPositions() {
    // Case: single entity instance (dynamic position)
    if (this._isEntity(this.targetObj)) {
      return this._getEntityPositions();
    }
    
    // Case: single tile instance (static position)
    if (this._isTile(this.targetObj)) {
      return this._getTilePositionsFromInstance(this.targetObj);
    }

    // Case: tile class (cached positions)
    if (this._isTileClass(this.targetObj)) {
      const className = this.targetObj.name;
      return this._positionCache.get(className) || [];
    }
    
    return [];
  }

  // Calculate positions for tile class (called only once during initialization)
  _calculateTilePositions(tileClass) {
    if (!this.tileMap) return [];

    const allTiles = this.tileMap.getAllTiles();
    const matchingTiles = allTiles.filter(tile => tile instanceof tileClass);
    
    return matchingTiles.map(tile => 
      tile.position.add(new Vec2(tile.tileSize / 2, tile.tileSize / 2))
    );
  }

  // Helper methods
  _isEntity(obj) { return obj instanceof Entity; }
  _isTile(obj) { return obj instanceof BaseTile; }
  _isTileClass(obj) { return typeof obj === "function" && obj.prototype instanceof BaseTile; }
  
  _getEntityPositions() {
    if (!this.targetObj.position) return [];
    return [this.targetObj.position.add(this.targetObj.size.div(2))];
  }
  
  _getTilePositionsFromInstance(tile) {
    return [tile.position.add(new Vec2(tile.tileSize / 2, tile.tileSize / 2))];
  }

  // Public methods for dynamic control
  addKeyUI(keyUI) {
    this.keyUIList.push(keyUI);
  }

  removeKeyUI(keyUI) {
    const index = this.keyUIList.indexOf(keyUI);
    if (index > -1) {
      this.keyUIList.splice(index, 1);
    }
  }

  setLayout(layout, spacing = 20) {
    this.layout = layout;
    this.spacing = spacing;
  }

  setVisibilityCondition(condition) {
    this.visibilityCondition = condition;
  }

  clearCache() {
    this._positionCache.clear();
    this._cacheInitialized = false;
  }
}