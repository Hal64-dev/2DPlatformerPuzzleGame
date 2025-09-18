let gameManager;
const BASE_CANVAS_SIZE = new Vec2(320, 180);
let internalCanvas;
let _pixelDensity = 1;
let windowScale = 2;
let scaleFactor = windowScale;
let offsetX = 0, offsetY = 0;
let maxFps = 60;
const FIXED_TIMESTEP = 1 / 120;
let accumulator = 0;

// Variables for loading
let loadedItems = 0;
let totalItems = 0;
let preloadCompleted = false;
let currentLoadingFile = "";

// Variables for saving data
let gameConfigData;
let mapsData = [];

async function preload() {
  console.log('=== PRELOAD START ===');
  totalItems = 1;

  // JSON data
  currentLoadingFile = "gameConfig.json";
  try {
    gameConfigData = await loadJSONAsync("assets/datas/gameConfig.json");
    console.log('GameConfig loaded:', gameConfigData);
  } catch {
    console.warn('Failed to load gameConfig.json, using fallback');
    gameConfigData = {
      tileImages: [null, "basic_tile.png", "goal_tile.png"],
      uiImages: {
        keys: {
          leftArrow: ["left_key_up.png", "left_key_down.png"],
          rightArrow: ["right_key_up.png", "right_key_down.png"],
          upArrow: ["up_key_up.png", "up_key_down.png"]
        }
      }
    };
  }
  loadedItems++;

  // Map data
  let mapPaths = [];
  if (gameConfigData.mapPaths && Array.isArray(gameConfigData.mapPaths)) {
    mapPaths = gameConfigData.mapPaths;
  } else {
    console.warn('mapPaths not defined in gameConfig.json, using fallback paths');
    mapPaths = [
      "assets/datas/mapTutorialActions.json",
      "assets/datas/map_0.json",
      "assets/datas/map_1.json",
      "assets/datas/map_2.json",
      "assets/datas/map_3.json"
    ];
  }
  totalItems += mapPaths.length;

  mapsData = await Promise.all(mapPaths.map(async (path, idx) => {
    try {
      const map = await loadJSONAsync(path);
      currentLoadingFile = path;
      console.log(`Map ${idx} loaded`, map);
      return map;
    } catch {
      console.warn(`Failed to load ${path}, using fallback`);
      return createFallbackMap(idx);
    }
    loadedItems++;
  }));

  // Load images
  GameManager.tileImages = await loadTileImagesAsync(gameConfigData.tileImages, (imgName) => {
    loadedItems++;
    currentLoadingFile = imgName || "Tile image";
  });
  GameManager.uiImages = await loadUIImagesAsync(gameConfigData.uiImages, (imgName) => {
    loadedItems++;
    currentLoadingFile = imgName || "UI image";
  });

  console.log('All images loaded');

  // Load fonts
  GameManager.fonts = await loadFontsAsync(gameConfigData, (fontName) => {
    loadedItems++;
    currentLoadingFile = fontName || "Font";
  });

  console.log('All fonts loaded');

  preloadCompleted = true;
  initializeGame();
}

function setup() {
  console.log('=== SETUP START ===');
  pixelDensity(_pixelDensity);
  createCanvas(BASE_CANVAS_SIZE.x * scaleFactor, BASE_CANVAS_SIZE.y * scaleFactor);
  internalCanvas = createGraphics(BASE_CANVAS_SIZE.x, BASE_CANVAS_SIZE.y);
  internalCanvas.noSmooth();
  internalCanvas.noStroke();
  noSmooth();
  noStroke();
  frameRate(maxFps);
  resizeCanvas(windowWidth, windowHeight);
  console.log('Canvas created:', width, 'x', height);
}

function initializeGame() {
  console.log('=== INITIALIZING GAME ===');

  // Initialize GameManager
  gameManager = new GameManager(internalCanvas);
  gameManager.tileImages = GameManager.tileImages;
  gameManager.uiImages = GameManager.uiImages;
  gameManager.initialize();

  // Load maps
  gameManager.loadMaps(mapsData);
  gameManager.loadMap(0);

  console.log('=== GAME INITIALIZED ===');
}

function draw() {
  if (!gameManager) {
    background(50);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(
      `Loading...`,
      width / 2,
      height / 2
    );
    return;
  }

  internalCanvas.background(0);
  internalCanvas.push();

  const dt = Math.min(deltaTime / 1000, 1 / 30);
  accumulator += dt;

  try {
    let iterations = 0;
    const maxIterations = 5;
    while (accumulator >= FIXED_TIMESTEP && iterations < maxIterations) {
      gameManager.fixedUpdate(FIXED_TIMESTEP);
      accumulator -= FIXED_TIMESTEP;
      iterations++;
    }

    gameManager.update(dt);
    gameManager.render(internalCanvas);

  } catch (error) {
    console.error('Error in game loop:', error);
    background(255, 100, 100);
    fill(255);
    textAlign(CENTER, CENTER);
    text('Game Error: ' + error.message, width / 2, height / 2);
  }
  internalCanvas.pop();

  // Rendering internalCanvas
  scaleFactor = Math.floor(Math.min(width / BASE_CANVAS_SIZE.x, height / BASE_CANVAS_SIZE.y));
  offsetX = Math.floor((width - BASE_CANVAS_SIZE.x * scaleFactor) / 2);
  offsetY = Math.floor((height - BASE_CANVAS_SIZE.y * scaleFactor) / 2);
  image(internalCanvas, offsetX, offsetY, BASE_CANVAS_SIZE.x * scaleFactor, BASE_CANVAS_SIZE.y * scaleFactor);
}

function loadJSONAsync(path) {
  return new Promise((resolve, reject) => {
    loadJSON(
      path,
      (data) => resolve(data),
      (err) => reject(err)
    );
  });
}

function loadImageAsync(path) {
  return new Promise((resolve, reject) => {
    loadImage(path,
      (img) => resolve(img),
      (err) => {
        console.error('Failed to load image:', path, err);
        resolve(null); // null でフォールバック
      }
    );
  });
}

function loadFontAsync(path) {
  return new Promise((resolve, reject) => {
    loadFont(path,
      (font) => resolve(font),
      (err) => {
        console.error('Failed to load font:', path, err);
        resolve(null); // null でフォールバック
      }
    );
  });
}

async function loadTileImagesAsync(imageList) {
  if (!imageList || !Array.isArray(imageList)) return [];
  const promises = imageList.map(imgName => {
    if (!imgName) return Promise.resolve(null);
    const path = "assets/images/tiles/" + imgName + "?v=" + Math.random().toString(36).slice(2);
    return loadImageAsync(path);
  });
  return await Promise.all(promises);
}

async function loadUIImagesAsync(uiImageData) {
  const loadedUIImages = { keys: {}, icons: {} };
  if (!uiImageData || !uiImageData.keys) return loadedUIImages;

  const keyPromises = [];

  for (const keyName in uiImageData.keys) {
    const imgs = uiImageData.keys[keyName];
    loadedUIImages.keys[keyName] = [];

    imgs.forEach((imgName, idx) => {
      if (!imgName) {
        loadedUIImages.keys[keyName][idx] = null;
        return;
      }
      const path = "assets/images/ui/" + imgName + "?v=" + Math.random().toString(36).slice(2);
      const promise = loadImageAsync(path).then(img => {
        loadedUIImages.keys[keyName][idx] = img;
      });
      keyPromises.push(promise);
    });
  }

  await Promise.all(keyPromises);

  if (uiImageData.icons) {
    const iconPromises = [];

    for (const iconName in uiImageData.icons) {
      const imgName = uiImageData.icons[iconName];
      if (!imgName) {
        loadedUIImages.icons[iconName] = null;
        continue;
      }
      const path = "assets/images/ui/" + imgName + "?v=" + Math.random().toString(36).slice(2);
      const promise = loadImageAsync(path).then(img => {
        loadedUIImages.icons[iconName] = img; // ✅ single image
      });
      iconPromises.push(promise);
    }

    await Promise.all(iconPromises);
  }

  return loadedUIImages;
}

async function loadFontsAsync(fontConfig) {
  if (!fontConfig || !fontConfig.fonts) return {};
  const fonts = {};
  const promises = [];

  for (let family in fontConfig.fonts) {
    fonts[family] = {};
    for (let style in fontConfig.fonts[family]) {
      const path = fontConfig.fonts[family][style];

      const p = loadFontAsync(path).then(font => {
        fonts[family][style] = font;
      });

      promises.push(p);
    }
  }

  await Promise.all(promises);

  return fonts;
}

function createFallbackMap(mapIndex) {
  console.log(`Creating fallback map ${mapIndex}`);

  const mapWidth = 40;
  const mapHeight = 23;
  const tiles = [];

  // Create a basically map layout
  for (let y = 0; y < mapHeight; y++) {
    const row = [];
    for (let x = 0; x < mapWidth; x++) {
      if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
        row.push(1); // Wall tile
      } else if (y === mapHeight - 2) {
        row.push(1); // Ground tile
      } else {
        row.push(0); // Sky
      }
    }
    tiles.push(row);
  }

  return {
    playerStart: { x: 16, y: 160 }, // Considering tileSize 8
    ballVelocity: { x: -60, y: 40 },
    tiles: tiles, // Tiles properties, not layout
    taggedTiles: []
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setFullscreen(newValue) {
  if (newValue == undefined) {
    let fs = fullscreen();
    fullscreen(!fs);
  } else {
    fullscreen(newValue);
  }
  scaleFactor = Math.floor(Math.min(windowWidth / BASE_CANVAS_SIZE.x, windowHeight / BASE_CANVAS_SIZE.y));
  offsetX = Math.floor((windowWidth - BASE_CANVAS_SIZE.x * scaleFactor) / 2);
  offsetY = Math.floor((windowHeight - BASE_CANVAS_SIZE.y * scaleFactor) / 2);
}

function keyPressed() {
  if (gameManager) {
    if (key === 'r' || key === 'R') {
      console.log('Manual reload requested');
      gameManager.reloadMap();
    }

    if (key === 'd' || key === 'D') {
      console.log('=== DEBUG INFO ===');
      const player = gameManager.getPlayer();
      const ball = gameManager.getBall();

      console.log('Player:', player);
      if (player) {
        console.log('  Position:', player.position);
        console.log('  Velocity:', player.rigidBody.velocity);
        console.log('  Is grounded:', player.rigidBody.isGrounded);
        console.log('  Collider active:', player.rigidBody.collider.isActive);
        console.log('  Is static:', player.rigidBody.isStatic);
        console.log('  In physics engine:', gameManager.physicsEngine.bodies.includes(player.rigidBody));
      }

      console.log('Ball:', ball);
      console.log('Entities:', gameManager.entities.length);
      console.log('Physics bodies:', gameManager.physicsEngine.bodies.length);

      // Debug UI images
      console.log('UI Images:', GameManager.uiImages);
      console.log('Keys:', GameManager.uiImages?.keys);

      if (gameManager.tileMap) {
        // Check tile under the player's feet
        const playerTileX = Math.floor(player.position.x / 8);
        const playerTileY = Math.floor((player.position.y + player.size.y + 1) / 8);
        const tileBelow = gameManager.tileMap.getTile(playerTileX, playerTileY);
        console.log(`Tile below player (${playerTileX}, ${playerTileY}):`, tileBelow);
        if (tileBelow) {
          console.log('  Collider active:', tileBelow.isColliderActive);
          console.log('  Is static:', tileBelow.rigidBody.isStatic);
        }
      }
    }

    if (key === 's' || key === 'S') {
      // Switch showing debug
      gameManager.switchShowDebugInfo();
    }

    if (key === 'f' || key === 'F') {
      // Switch window mode
      setFullscreen();
    }
  }
}