class GameManager extends EventEmitter {
  constructor(internalCanvas) {
    super();
    if (GameManager.instance) {
      return GameManager.instance;
    }
    GameManager.instance = this;

    this.entities = [];
    this.tileMap = null;
    this.physicsEngine = null;
    this.inputHandler = new InputHandler();
    this.uiManager = new UIManager();
    this.originalPoint = new OriginalPoint();
    this.isShowDebugInfo = false;
    this.currentMapIndex = 0;
    this.maps = [];
    this.canvas = internalCanvas;

    // Game state
    this.frozen = false;
    this.loading = false;
    this.config = {
      reloadDelay: 800,
      nextMapDelay: 800
    };
  }

  // Create popup animation configurations
  static createPopupConfig(type, options = {}) {
    const popupConfigs = {
      // Quick bounce popup (default)
      bounce: {
        duration: options.duration || 400,
        easeType: 'bounce',
        overshoot: options.overshoot || 0.2
      },

      // Elastic popup with spring effect
      elastic: {
        duration: options.duration || 600,
        easeType: 'elastic',
        overshoot: options.overshoot || 0.3
      },

      // Back ease with subtle overshoot
      back: {
        duration: options.duration || 300,
        easeType: 'back',
        overshoot: options.overshoot || 0.15
      },

      // Dramatic overshoot popup
      dramatic: {
        duration: options.duration || 500,
        easeType: 'overshoot',
        overshoot: options.overshoot || 0.4
      },

      // Quick and snappy
      snappy: {
        duration: options.duration || 200,
        easeType: 'back',
        overshoot: options.overshoot || 0.1
      },

      // Gentle and smooth
      gentle: {
        duration: options.duration || 800,
        easeType: 'back',
        overshoot: options.overshoot || 0.05
      }
    };

    return popupConfigs[type] || popupConfigs.bounce;
  }

  // Create predefined animation configs for KeyUI
  static createAnimationConfig(type, options = {}) {
    const defaultConfigs = {
      // Basic bounce animation for highlighting important keys
      bounce: {
        type: 'bounce',
        speed: options.speed || 3.0,
        intensity: options.intensity || 0.3,
        loop: options.loop !== false
      },

      // Pulse animation for keys that need attention
      pulse: {
        type: 'pulse',
        speed: options.speed || 2.0,
        intensity: options.intensity || 0.5,
        loop: options.loop !== false
      },

      // Rotation animation for special effects
      rotate: {
        type: 'rotate',
        speed: options.speed || 1.0,
        clockwise: options.clockwise !== false
      },

      // Float animation for floating effect
      float: {
        type: 'float',
        speed: options.speed || 1.5,
        intensity: options.intensity || 2.0,
        loop: options.loop !== false
      },

      // Combined animation (custom type)
      breathe: {
        type: 'custom',
        components: [
          { type: 'pulse', speed: 1.5, intensity: 0.3 },
          { type: 'bounce', speed: 2.0, intensity: 0.2 }
        ]
      },

      // Urgent attention animation
      urgent: {
        type: 'custom',
        components: [
          { type: 'bounce', speed: 5.0, intensity: 0.5 },
          { type: 'pulse', speed: 4.0, intensity: 0.7 }
        ]
      }
    };

    return defaultConfigs[type] || defaultConfigs.bounce;
  }

  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    this.physicsEngine = new PhysicsEngine();
    console.log('PhysicsEngine initialized');

    // Log the UI images that are available
    console.log('GameManager initialize - UI images available:', GameManager.uiImages);
    console.log('Keys structure:', GameManager.uiImages?.keys);

    this.on('mapLoaded', () => {
      console.log(`Map ${this.currentMapIndex} loaded`);
    });
  }

  loadMaps(mapData) {
    this.maps = mapData;
    console.log('Maps loaded:', this.maps.length);
  }

  loadMap(mapIndex, delayMs = 0) {
    if (this.loading) return;

    const mapLoadTransition = new MapLoadTransition(
      this.getPlayer(),
      0,
      delayMs / 1000,
      "close"
    );
    this.uiManager.addUI(mapLoadTransition);

    this.loading = true;
    this.freeze();

    setTimeout(
      () => {
        this._loadMapImmediate(mapIndex);
        this.unfreeze();
        this.loading = false;
        let transitionDelay =
          (delayMs / 1000) > 0 ? (delayMs / 1000) : (this.config.nextMapDelay / 1000);
        const mapLoadTransition = new MapLoadTransition(
          this.getPlayer(),
          0,
          transitionDelay,
          "open"
        );
        this.uiManager.addUI(mapLoadTransition);
      },
      delayMs
    );
  }

  _loadMapImmediate(mapIndex) {
    const mapData = this.maps[mapIndex];
    if (!mapData) {
      console.error(`Map ${mapIndex} not found`);
      return;
    }

    console.log('Loading map data:', mapData);

    // Clear existing entities and physics bodies
    this.physicsEngine.removeAllBodies();
    this.entities.length = 0;

    // Create tilemap with correct data structure
    const tilemapData = {
      tiles: mapData.tiles || mapData.layout,
      taggedTiles: mapData.taggedTiles || [],
      ballSpeed: mapData.ballSpeed || { value: 32 }
    };

    console.log('Creating TileMap with data:', tilemapData);
    this.tileMap = new TileMap(8, tilemapData, GameManager.tileImages, this.physicsEngine);

    // Create player
    const playerPos = mapData.playerStart;
    if (!playerPos) {
      console.error('Player start position not found in map data');
      return;
    }

    const player = new Player(new Vec2(playerPos.x, playerPos.y), new Vec2(8, 8), this.inputHandler, this.canvas);
    this.addEntity(player);
    console.log('Player created at:', playerPos);

    // Initialize entities
    this.entities.forEach(entity => {
      if (entity.init) {
        entity.init();
      }
    });

    // Create UI elements with proper debugging
    console.log('Creating tutorial UI...');
    console.log('Available UI images:', GameManager.uiImages);
    console.log('Keys object:', GameManager.uiImages?.keys);

    if (GameManager.uiImages?.keys) {
      console.log('Available keys:', Object.keys(GameManager.uiImages.keys));
      console.log('leftArrow images:', GameManager.uiImages.keys.leftArrow);
      console.log('rightArrow images:', GameManager.uiImages.keys.rightArrow);
      console.log('upArrow images:', GameManager.uiImages.keys.upArrow);
      console.log('downArrow images:', GameManager.uiImages.keys.downArrow);
    }

    // Define key configs dynamically
    let tutorialUI = null;
    let keyGuideUI = null;
    let mapReloadIconUI = null;
    const inputHandler = this.inputHandler;
    const tileMap = this.tileMap;

    tutorialUI = this._createTutorialKeyGuideUI(mapIndex, player, inputHandler, tileMap);
    keyGuideUI = this._createKeyGuideUI(this.originalPoint, inputHandler, tileMap, this.canvas);
    mapReloadIconUI = new IconUI(GameManager.uiImages.icons.mapReload, new Vec2(this.canvas.width - 24, this.canvas.height - 25));

    // Clear UIManager and add new UI
    this.uiManager.clear();
    if (tutorialUI) {
      this.uiManager.addUI(tutorialUI);
    }

    if (keyGuideUI) {
      this.uiManager.addUI(keyGuideUI);
    }

    if (mapReloadIconUI) {
      this.uiManager.addUI(mapReloadIconUI);
    }

    // Initialize UI elements
    this.uiManager.init();

    console.log('Key Guide UI created and added to UIManager');

    // Debug physics state
    console.log('Physics bodies after map load:', this.physicsEngine.bodies.length);
    console.log('Entities:', this.entities.length);

    this.currentMapIndex = mapIndex;
    this.emit('mapLoaded', mapIndex);
  }

  reloadMap() {
    console.log('Reloading current map:', this.currentMapIndex);
    this.loadMap(this.currentMapIndex, this.config.reloadDelay);
  }

  loadNextMap() {
    if (this.currentMapIndex + 1 < this.maps.length) {
      this.loadMap(this.currentMapIndex + 1, this.config.nextMapDelay);
    }
  }

  addEntity(entity) {
    this.entities.push(entity);

    if (this.physicsEngine && entity.rigidBody) {
      this.physicsEngine.addBody(entity.rigidBody);
      console.log(`Entity ${entity.constructor.name} added to physics engine`);
      console.log(`  Position: ${entity.rigidBody.position.x}, ${entity.rigidBody.position.y}`);
      console.log(`  Collider active: ${entity.rigidBody.collider?.isActive}`);
      console.log(`  Is static: ${entity.rigidBody.isStatic}`);
    } else {
      console.warn(`Entity ${entity.constructor.name} has no rigid body or physics engine not ready`);// `
    }
  }

  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
      if (this.physicsEngine && entity.rigidBody) {
        this.physicsEngine.removeBody(entity.rigidBody);
        console.log(`Entity ${entity.constructor.name} removed from physics engine`);
      }
    }
  }

  getPlayer() {
    return this.entities.find(entity => entity instanceof Player);
  }

  getBall() {
    return this.entities.find(entity => entity instanceof Ball);
  }

  getMaps() {
    const maps = [...this.maps];
    return maps;
  }

  getCurrentMapIndex() {
    return this.currentMapIndex;
  }

  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
  }

  fixedUpdate(fixedDeltaTime) {
    if (this.frozen || !this.physicsEngine) return;

    // Update physics
    this.physicsEngine.update(fixedDeltaTime, this.tileMap);
  }

  update(deltaTime) {
    // Update UI elements
    this.uiManager.update(deltaTime);

    if (this.frozen) return;

    this.inputHandler.update();

    // Handle reload input
    if (this.inputHandler.isJustPressed('reload')) {
      this.reloadMap();
    }

    // Update tilemap
    if (this.tileMap) {
      this.tileMap.update(deltaTime);
    }

    // Update entities
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.update(deltaTime);
      }
    });

    // Remove destroyed entities
    this.entities = this.entities.filter(entity => {
      if (entity.destroyed) {
        if (this.physicsEngine && entity.rigidBody) {
          this.physicsEngine.removeBody(entity.rigidBody);
        }
        return false;
      }
      return true;
    });
  }

  backgroundRender(g) {
    this._scroll(g);

    if (this.tileMap) {
      this.tileMap.backgroundRender(g);
    }
  }

  render(g) {
    background(0);

    this.backgroundRender(g);

    // Render tilemap
    if (this.tileMap) {
      this.tileMap.render(g);
    }

    // Render entities
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.render(g);
      }
    });

    // Render uis
    this.uiManager.render(g);

    // Show debugs
    this._showDebugInfo(g);
  }

  _createKeyGuideUI(originalPoint, inputHandler, tileMap, g) {
    let keyGuideUI = null;

    const actionsPopupAnim = GameManager.createPopupConfig('bounce', {
      duration: 0,
      overshoot: 0.4
    });

    keyGuideUI = new KeyGuideUI({
      targetObj: originalPoint,
      inputHandler: inputHandler,
      keyConfigs: [
        {
          inputRef: 'mapReload',
          symbol: '↺',
          offset: new Vec2(g.width - 32, g.height - 16),
          images: GameManager.uiImages.keys.r,
          popupAnimation: actionsPopupAnim
        },
      ],
      tileMap: tileMap,
      autoHide: false,
      fadeInDuration: 0,
      fadeOutDuration: 200,
    });

    return keyGuideUI;
  }

  _createTutorialKeyGuideUI(mapIndex, player, inputHandler, tileMap) {
    let keyGuideUI = null;

    switch (mapIndex) {
      case 0:
        const actionsPopupAnim = GameManager.createPopupConfig('bounce', {
          duration: 800,
          overshoot: 0.4
        });
        keyGuideUI = new KeyGuideUI({
          targetObj: player,
          inputHandler: inputHandler,
          keyConfigs: [
            {
              inputRef: 'left',
              symbol: '←',
              offset: new Vec2(-16, 0),
              images: GameManager.uiImages.keys.leftArrow,
              popupAnimation: actionsPopupAnim
            },
            {
              inputRef: 'right',
              symbol: '→',
              offset: new Vec2(16, 0),
              images: GameManager.uiImages.keys.rightArrow,
              popupAnimation: actionsPopupAnim
            },
            {
              inputRef: 'jump',
              symbol: '↑',
              offset: new Vec2(0, -16),
              images: GameManager.uiImages.keys.upArrow,
              popupAnimation: actionsPopupAnim
            }
          ],
          tileMap: tileMap,
          autoHide: false,
          fadeInDuration: 0,
          fadeOutDuration: 200,
        });
        break;

      case 1:
        const interactsPopupAnim = GameManager.createPopupConfig('bounce', {
          duration: 400,
          overshoot: 0.3
        });
        keyGuideUI = new KeyGuideUI({
          targetObj: PlayerSwitchTile,
          inputHandler: inputHandler,
          keyConfigs: [
            {
              inputRef: 'interact',
              symbol: '↓',
              offset: new Vec2(0, 16),
              images: GameManager.uiImages.keys.downArrow,
              popupAnimation: interactsPopupAnim
            }
          ],
          tileMap: tileMap,
          autoHide: false,
          showCondition: function () {
            if (!player) return false;

            const playerCenter = player.position.add(player.size.div(2));
            const switches = tileMap.tilesByClassName('PlayerSwitchTile');

            return switches.some(switchTile => {
              const switchCenter = switchTile.position.add(new Vec2(switchTile.tileSize / 2, switchTile.tileSize / 2));
              const distance = playerCenter.sub(switchCenter).length();
              return distance < 4;
            });
          },
          completionCondition: () => {
            return false;
          }
        });
        break;

      default:
        return null;
    }

    return keyGuideUI;
  }

  _scroll(g) {
    g.push();
    g.background('#0d0d0dff');

    const size = 24;
    const cols = ceil(g.width * 1.25 / size);
    const rows = ceil(g.height * 1.25 / size);

    g.fill('#152a1aff');
    g.noSmooth();
    g.noStroke();

    const speedX = 0.0075;
    const speedY = 0.0025;

    const t = millis();

    const offsetX = (t * speedX) % (size * 2);
    const offsetY = (t * speedY) % (size * 2);

    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        let cx = x * size - offsetX;
        let cy = y * size - offsetY;

        g.beginShape();
        g.vertex(cx, cy - size / 2);
        g.vertex(cx + size / 2, cy);
        g.vertex(cx, cy + size / 2);
        g.vertex(cx - size / 2, cy);
        g.endShape(CLOSE);
      }
    }

    g.pop();
  }

  switchShowDebugInfo() {
    this.isShowDebugInfo = !this.isShowDebugInfo;
  }

  _showDebugInfo(g) {
    if (!this.isShowDebugInfo) return;

    const player = this.getPlayer();
    if (!player) return;

    g.fill('#FFFFFF');
    g.textFont(GameManager.fonts.pixelMplus["10Regular"]);
    g.textSize(10);
    g.textAlign(LEFT, TOP);

    const info = [];

    const fps = Math.round(frameRate());
    info.push(`FPS: ${fps}`);

    const vel = player.rigidBody.velocity;
    info.push(`Vel: (${Math.round(vel.x * 10) / 10}, ${Math.round(vel.y * 10) / 10})`);

    const pos = player.position;
    info.push(`Pos: (${Math.round(pos.x * 10) / 10}, ${Math.round(pos.y * 10) / 10})`);

    info.push(`Grounded: ${player.rigidBody.isGrounded}`);
    info.push(`IsJumping: ${player.isJumping}`);
    info.push(`CoyoteTimeCounter: ${player.coyoteTimeCounter}`);
    info.push(`JumpInputBufferCounter: ${player.jumpInputBufferCounter}`);
    info.push(`Bodies in physics: ${this.physicsEngine?.bodies.length || 0}`);
    info.push(`UIs active: ${this.uiManager?.uis.length || 0}`);// `

    const x = 4;
    let y = 4;
    const lineHeight = 10;

    for (let textStr of info) {
      const w = g.textWidth(textStr);

      g.text(textStr, x, y);
      y += lineHeight;
    }

    // Show player`s collision box
    if (player.rigidBody?.collider) {
      const aabb = player.rigidBody.collider.global;
      g.stroke('red');
      g.strokeWeight(1);
      g.noFill();
      g.rect(aabb.left, aabb.top, aabb.right - aabb.left, aabb.bottom - aabb.top);
      g.noStroke();
    }

    // Show player's center position
    g.stroke('red');
    g.strokeWeight(1);
    g.noFill();
    g.circle(player.position.x, player.position.y, 2);
    g.noStroke();
  }
}

// Initialize static properties
GameManager.tileImages = [];
GameManager.uiImages = { keys: {}, icons: {} };