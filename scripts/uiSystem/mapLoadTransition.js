class MapLoadTransition extends EventEmitter {
  constructor(player, delay, duration, mode = "open") {
    super();
    this.player = player;
    this.duration = duration;
    this.progress = -delay;
    this.mode = mode;
    this.isJustFinished = false;

    // Pre-create black screen graphics
    this.blackScreen = createGraphics(0, 0);
    this._lastWidth = 0;
    this._lastHeight = 0;

    // Register event listener (bind to avoid immediate call)
    this.on("mapLoadTransitionFinished", this._onFinished.bind(this));
  }

  update(dt) {
    const wasFinished = this.isFinished();

    // Update progress
    this.progress += dt / this.duration;

    // Check finished state transition
    this.isJustFinished = !wasFinished && this.isFinished();

    if (this.isJustFinished) {
      this.emit("mapLoadTransitionFinished");
    }
  }

  render(g) {
    this._resizeBlackScreenIfNeeded(g);

    const center = this.player.position.add(this.player.size.div(2));
    const maxDiameter = dist(0, this.blackScreen.height, this.blackScreen.width, 0) * 2.0;
    const easedProgress = this._easeInOut(constrain(this.progress, 0, 1));
    const diameter = this._calculateDiameter(easedProgress, maxDiameter);

    this._drawBlackScreen(diameter, center);
    g.image(this.blackScreen, 0, 0);
  }

  _resizeBlackScreenIfNeeded(g) {
    if (g.width !== this._lastWidth || g.height !== this._lastHeight) {
      this.blackScreen = createGraphics(g.width, g.height);
      this._lastWidth = g.width;
      this._lastHeight = g.height;
    }
  }

  _calculateDiameter(progress, maxDiameter) {
    return this.mode === "open"
      ? lerp(0, maxDiameter, progress)
      : lerp(maxDiameter, 0, progress);
  }

  _drawBlackScreen(diameter, center) {
    const g = this.blackScreen;
    g.push();
    g.noStroke();
    g.fill(0);
    g.rect(0, 0, g.width, g.height);

    g.erase();
    g.ellipse(center.x, center.y, diameter);
    g.noErase();
    g.pop();
  }

  _easeInOut(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  _onFinished() {
    if (!GameManager.instance?.uiManager) {
      console.warn('MapLoadTransition: UIManager not available for cleanup');
      return;
    }

    const removeUIDelay = 100;
    setTimeout(() => {
      // Check if this UI is actually in the manager before trying to remove it
      if (GameManager.instance.uiManager.uis.includes(this)) {
        GameManager.instance.uiManager.removeUI(this);
        console.log('MapLoadTransition: Successfully removed from UIManager');
      } else {
        console.log('MapLoadTransition: Already removed or not found in UIManager');
      }
    }, removeUIDelay);
  }

  isFinished() {
    return this.progress >= 1;
  }
}