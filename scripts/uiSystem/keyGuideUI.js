class KeyGuideUI {
  constructor(config) {
    this.targetObj = config.targetObj;
    this.inputHandler = config.inputHandler;
    this.tileMap = config.tileMap;
    this.keyConfigs = config.keyConfigs || [];

    // Tutorial-specific settings
    this.autoHide = config.autoHide !== false;
    this.hideDelay = config.hideDelay || 3000; // ms
    this.showCondition = config.showCondition || null;
    this.completionCondition = config.completionCondition || null;

    // Animation settings
    this.fadeInDuration = config.fadeInDuration || 500; // ms
    this.fadeOutDuration = config.fadeOutDuration || 300; // ms

    // State management
    this.state = 'showing'; // 'showing', 'visible', 'hiding', 'hidden'
    this.stateTimer = 0;
    this.completed = false;

    // Key size
    this.keySize = config.keySize || new Vec2(15, 16);

    this._initializeKeyUIs();
    this._initializeMultiKeyUI();
  }

  // Initialize individual KeyUI elements
  _initializeKeyUIs() {
    this.keyUIs = this.keyConfigs.map(cfg => {
      const keyState = this.inputHandler.inputRefs[cfg.inputRef];

      return new KeyUI({
        inputRef: keyState,
        keyImages: cfg.images,
        size: this.keySize,
        offset: cfg.offset || Vec2.zero(),
        symbol: cfg.symbol || '?',
        scale: cfg.scale || 1.0,
        animation: cfg.animation || null,
        popupAnimation: cfg.popupAnimation || null,
        alignment: cfg.alignment || 'center',
        visibilityCondition: cfg.visibilityCondition || null
      });
    });
  }

  // Initialize MultiKeyUI system
  _initializeMultiKeyUI() {
    this.multiKeyUI = new MultiKeyUI({
      targetObj: this.targetObj,
      keyUIList: this.keyUIs,
      tileMap: this.tileMap,
      layout: this.keyConfigs.layout || 'overlay',
      spacing: this.keyConfigs.spacing || 20,
      groupOffset: this.keyConfigs.groupOffset || Vec2.zero(),
      visibilityCondition: () => this.state === 'visible' || this.state === 'showing'
    });
  }

  // Update tutorial state and animations
  update(dt) {
    this.stateTimer += dt * 1000; // Convert to milliseconds

    // Check completion condition
    if (this.completionCondition && this.completionCondition()) {
      this.complete();
    }

    // Update state machine
    this._updateState();

    // Update MultiKeyUI
    if (this.multiKeyUI) {
      this.multiKeyUI.update(dt);
    }

    // Auto-hide logic
    if (this.autoHide && this.state === 'visible' && this.stateTimer > this.hideDelay) {
      this.hide();
    }
  }

  // Update state machine
  _updateState() {
    switch (this.state) {
      case 'showing':
        if (this.stateTimer >= this.fadeInDuration) {
          this.state = 'visible';
          this.stateTimer = 0;
        }
        break;
      case 'hiding':
        if (this.stateTimer >= this.fadeOutDuration) {
          this.state = 'hidden';
          this.stateTimer = 0;
        }
        break;
    }
  }

  // Render tutorial UI with state-based effects
  render(g) {
    if (this.state === 'hidden' || this.completed) {
      return;
    }

    // Show condition check
    if (this.showCondition && !this.showCondition()) {
      return;
    }

    // Apply fade effects
    g.push();

    let opacity = 1.0;
    if (this.state === 'showing') {
      opacity = this.stateTimer / this.fadeInDuration;
    } else if (this.state === 'hiding') {
      opacity = 1.0 - (this.stateTimer / this.fadeOutDuration);
    }

    if (opacity < 1.0) {
      g.tint(255, opacity * 255);
    }

    // Render MultiKeyUI
    if (this.multiKeyUI) {
      this.multiKeyUI.render(g);
    }

    g.pop();
  }

  // Public control methods
  show() {
    if (this.completed) return;
    this.state = 'showing';
    this.stateTimer = 0;
  }

  hide() {
    if (this.completed) return;
    this.state = 'hiding';
    this.stateTimer = 0;
  }

  complete() {
    this.completed = true;
    this.state = 'hidden';
  }

  reset() {
    this.completed = false;
    this.state = 'showing';
    this.stateTimer = 0;
  }

  // Add or remove key configurations dynamically
  addKeyConfig(keyConfig) {
    this.keyConfigs.push(keyConfig);
    this._initializeKeyUIs();
    this._initializeMultiKeyUI();
  }

  removeKeyConfig(inputRef) {
    this.keyConfigs = this.keyConfigs.filter(cfg => cfg.inputRef !== inputRef);
    this._initializeKeyUIs();
    this._initializeMultiKeyUI();
  }

  // Set tutorial conditions dynamically
  setShowCondition(condition) {
    this.showCondition = condition;
  }

  setCompletionCondition(condition) {
    this.completionCondition = condition;
  }
}