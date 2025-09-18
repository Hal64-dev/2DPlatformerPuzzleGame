class KeyUI {
  constructor(config) {
    // Basic configuration
    this.inputRef = config.inputRef || { value: false };
    this.keyImages = config.keyImages || null;
    this.size = config.size || new Vec2(16, 16);
    this.offset = config.offset || Vec2.zero();
    this.symbol = config.symbol || '?';

    // Visual customization
    this.scale = config.scale || 1.0;
    this.opacity = config.opacity || 1.0;
    this.rotation = config.rotation || 0;
    this.tint = config.tint || null;

    // Animation settings
    this.animation = config.animation || null;
    this.animationState = { time: 0, phase: 0 };

    // Popup animation settings
    this.popupAnimation = config.popupAnimation || null;
    this.popupState = {
      isPlaying: false,
      time: 0,
      initialScale: this.scale,
      targetScale: this.scale,
      completed: false
    };

    // Visibility settings
    this.visibilityCondition = config.visibilityCondition || null;
    this.visible = config.visible !== false;

    // Track previous condition
    this._prevShowCondition = this.visibilityCondition ? this.visibilityCondition() : this.visible;

    // Start popup on load if configured
    if (this.popupAnimation && this.visible) {
      this._startPopupAnimation();
    }

    // Layout settings
    this.alignment = config.alignment || 'center';
    this.margin = config.margin || Vec2.zero();

    this._validateInitialization();
  }

  // Start popup animation
  _startPopupAnimation() {
    if (!this.popupAnimation) return;
    this.popupState.isPlaying = true;
    this.popupState.time = 0;
    this.popupState.initialScale = 0;
    this.popupState.targetScale = this.scale;
    this.popupState.completed = false;
    this.scale = 0;
  }

  // Update method called every frame
  update(deltaTime) {
    // Always update popup animation first
    if (this.popupAnimation && this.popupState.isPlaying) {
        this._updatePopupAnimation(deltaTime);
    }

    // Regular animations only if popup not active
    if (this.animation && !this.popupState.isPlaying) {
        this._updateAnimation(deltaTime);
    }

    // Update visibility based on condition
    if(this.visibilityCondition){
      const showNow = this.visibilityCondition();
      if(showNow && !this._prevShowCondition){
        this._startPopupAnimation();  // Re-trigger popup
        this.visible = true;
      } else if(!showNow){
        this.visible = false;
      }
      this._prevShowCondition = showNow;
    }
  }

  // Internal method to update popup animation
  _updatePopupAnimation(deltaTime) {
    this.popupState.time += deltaTime * 1000;
    const config = this.popupAnimation;
    const duration = config.duration || 300;
    const overshoot = config.overshoot || 0.2;
    const easeType = config.easeType || 'bounce';
    const progress = Math.min(this.popupState.time / duration, 1.0);

    if (progress >= 1.0) {
      this.scale = this.popupState.targetScale;
      this.popupState.isPlaying = false;
      this.popupState.completed = true;
      return;
    }

    let easedProgress;
    switch (easeType) {
      case 'bounce': 
        easedProgress = this._easeOutBounce(progress); break;
      case 'elastic': 
        easedProgress = this._easeOutElastic(progress); break;
      case 'back': 
        easedProgress = this._easeOutBack(progress, overshoot); break;
      case 'overshoot': 
        easedProgress = this._easeOutOvershoot(progress, overshoot); break;
      default: easedProgress = progress;
    }

    this.scale = this.popupState.targetScale * easedProgress;
  }

  // Easing functions for popup animation
  _easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  _easeOutElastic(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    
    const p = 0.3;
    const s = p / 4;
    
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }

  _easeOutBack(t, overshoot = 1.70158) {
    const c1 = overshoot;
    const c3 = c1 + 1;
    
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  _easeOutOvershoot(t, overshoot = 0.2) {
    if (t < 0.8) {
      // First phase: scale up to 1 + overshoot
      const phase1Progress = t / 0.8;
      return (1 + overshoot) * this._easeOutQuart(phase1Progress);
    } else {
      // Second phase: scale down to final value
      const phase2Progress = (t - 0.8) / 0.2;
      const startScale = 1 + overshoot;
      return startScale - (overshoot * this._easeOutQuart(phase2Progress));
    }
  }

  _easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // Validates that the KeyUI was initialized with required resources
  _validateInitialization() {
    if (!this._hasValidImages()) {
      console.warn('KeyUI: Invalid or missing key images provided, using fallback');
    }
  }

  // Checks if key images are valid and complete
  _hasValidImages() {
    return this.keyImages && 
           Array.isArray(this.keyImages) && 
           this.keyImages.length >= 2 &&
           this.keyImages[0] && 
           this.keyImages[1];
  }

  // Renders the key UI at all specified parent positions
  render(g, parentPositions) {
    if (!this.visible || !this._canRender(parentPositions)) {
      return;
    }
    
    parentPositions.forEach(parentPos => {
      this._renderAtPosition(g, parentPos);
    });
  }

  // Checks if rendering is possible with current state
  _canRender(parentPositions) {
    if (!parentPositions || parentPositions.length === 0) {
      return false;
    }
    return true;
  }

  // Renders the key at a specific position
  _renderAtPosition(g, parentPos) {
    g.push();
    
    const renderPosition = this._calculateRenderPosition(parentPos);
    const snappedX = Math.round(renderPosition.x + this.size.x / 2);
    const snappedY = Math.round(renderPosition.y + this.size.y / 2);
    
    // Apply transformations
    g.translate(snappedX, snappedY);
    g.scale(this.scale);
    g.rotate(this.rotation);
    
    // Apply opacity and tint
    if (this.opacity < 1.0) {
      g.tint(255, this.opacity * 255);
    } else if (this.tint) {
      g.tint(this.tint);
    }
    
    // Render image or fallback
    if (this._hasValidImages()) {
      this._renderImage(g);
    } else {
      this._renderFallback(g);
    }
    
    g.pop();
  }

  // Calculate final render position based on alignment
  _calculateRenderPosition(parentPos) {
    let basePos = parentPos.add(this.offset).add(this.margin);
    
    // Apply alignment
    switch (this.alignment) {
      case 'top':
        basePos = basePos.add(new Vec2(-this.size.x / 2, -this.size.y));
        break;
      case 'bottom':
        basePos = basePos.add(new Vec2(-this.size.x / 2, 0));
        break;
      case 'left':
        basePos = basePos.add(new Vec2(-this.size.x, -this.size.y / 2));
        break;
      case 'right':
        basePos = basePos.add(new Vec2(0, -this.size.y / 2));
        break;
      case 'center':
      default:
        basePos = basePos.add(new Vec2(-this.size.x / 2, -this.size.y / 2));
        break;
    }
    
    return basePos;
  }

  // Render with images
  _renderImage(g) {
    const imageIndex = this.inputRef.value ? 1 : 0;
    const finalSize = this.size.mul(this.scale);
    g.image(
      this.keyImages[imageIndex], 
      -finalSize.x / 2, 
      -finalSize.y / 2,
      finalSize.x,
      finalSize.y
    );
  }

  // Fallback rendering method when images are not available
  _renderFallback(g) {
    const finalSize = this.size.mul(this.scale);
    
    // Draw rectangle
    g.fill(this.inputRef.value ? 200 : 100);
    g.stroke(255);
    g.strokeWeight(1);
    g.rect(-finalSize.x / 2, -finalSize.y / 2, finalSize.x, finalSize.y);
    
    // Draw symbol text
    g.fill(255);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textSize(8 * this.scale);
    g.text(this.symbol, 0, 0);
  }

  // Update regular animation state (only when popup is not active)
  _updateAnimation(deltaTime) {
    if (!this.animation) return;
    
    this.animationState.time += deltaTime;
    
    switch (this.animation.type) {
      case 'bounce':
        this.scale = this.popupState.targetScale + Math.abs(Math.sin(this.animationState.time * this.animation.speed) * this.animation.intensity);
        break;
      case 'pulse':
        this.opacity = 0.5 + Math.sin(this.animationState.time * this.animation.speed) * 0.5;
        break;
      case 'rotate':
        this.rotation = this.animationState.time * this.animation.speed;
        break;
      case 'float':
        this.offset.y += Math.sin(this.animationState.time * this.animation.speed) * this.animation.intensity;
        break;
    }
  }

  // Public methods for dynamic control
  setVisibility(visible) {
    const wasVisible = this.visible;
    this.visible = visible;
    
    // Trigger popup animation when becoming visible
    if (!wasVisible && visible && this.popupAnimation) {
      this._startPopupAnimation();
    }
  }

  setAnimation(animation) {
    this.animation = animation;
    this.animationState = { time: 0, phase: 0 };
  }

  setTint(tint) {
    this.tint = tint;
  }

  setScale(scale) {
    this.scale = scale;
    this.popupState.targetScale = scale;
  }

  // Set or update popup animation configuration
  setPopupAnimation(popupConfig) {
    this.popupAnimation = popupConfig;
  }

  // Trigger popup animation manually
  triggerPopup() {
    this._startPopupAnimation();
  }
}