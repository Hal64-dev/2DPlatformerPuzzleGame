class Player extends Entity {
  constructor(position, size, inputHandler, internalCanvas, mass = 2) {
    super(position, size, mass);
    this.moveSpeed = 64;
    this.maxFallSpeed = 256;
    this.moveAcceleration = 92;
    this.moveDeceleration = 114;
    this.velocityPower = 0.96;

    this.jumpForce = 230;
    this.jumpCutMultiplier = 0.3;

    this.coyoteTime = 0.15;
    this.coyoteTimeCounter = 0;
    this.wasGrounded = false;

    this.jumpInputBufferTime = 0.125;
    this.jumpInputBufferCounter = 0;
    this.wasJumpInput = false;

    this.additionalFallGravity = 280;

    this.isJumping = false;

    this.interactRadius = 1;

    this.inputHandler = inputHandler;
    this.canvas = internalCanvas;
  }

  update(deltaTime) {
    super.update(deltaTime);

    this._updateCoyoteTime(deltaTime);
    this._updateJumpInputBufferTime(deltaTime);
    this._handleMovement();
    this._handleJump();
    this._handleIsJumping();
    this._handleJumpReleased();
    this._handleFallGravity();
    this._handleInteraction();
    this._limitFallSpeed();
    this._checkOffScreen();
    this._checkGoal();
  }

  _updateCoyoteTime(deltaTime) {
    // If currently grounded, reset coyote time counter
    if (this.rigidBody.isGrounded) {
      this.coyoteTimeCounter = this.coyoteTime;
      this.wasGrounded = true;
    }
    // If was grounded but now airborne, start counting down coyote time
    else if (this.wasGrounded && !this.rigidBody.isGrounded) {
      this.coyoteTimeCounter -= deltaTime;
      if (this.coyoteTimeCounter <= 0) {
        this.wasGrounded = false;
      }
    }
  }

  _updateJumpInputBufferTime(deltaTime) {
    if (this.inputHandler.isJustPressed("jump")) {
      this.jumpInputBufferCounter = this.jumpInputBufferTime;
      this.wasJumpInput = true;
    }
    else if (this.wasJumpInput && !this.inputHandler.isJustPressed("jump")) {
      this.jumpInputBufferCounter -= deltaTime;
      if (this.jumpInputBufferCounter <= 0) {
        this.wasJumpInput = false;
      }
    }
  }

  _handleMovement() {
    const targetSpeed = this.inputHandler.moveInput * this.moveSpeed;
    const speedDiff = targetSpeed - this.rigidBody.velocity.x;
    const accelRate = Math.abs(speedDiff) > 1 ? this.moveAcceleration : this.moveDeceleration;
    const forceX = Math.pow(Math.abs(speedDiff) * accelRate, this.velocityPower) * Math.sign(speedDiff);

    this.rigidBody.applyForce(new Vec2(forceX, 0));
  }

  _handleJump() {
    // Allow jump if currently grounded OR within coyote time
    const canJump = this.rigidBody.isGrounded || (this.coyoteTimeCounter > 0);

    if (canJump && this.jumpInputBufferCounter > 0) {
      this.rigidBody.velocity.y = 0;
      this.rigidBody.applyForce(new Vec2(0, -this.jumpForce), 'Impulse');
      this.rigidBody.isGrounded = false;
      this.isJumping = true;
      this.coyoteTimeCounter = 0;
      this.jumpInputBufferCounter = 0;
      this.wasGrounded = false;
    }
  }

  _handleIsJumping() {
    if (!this.rigidBody.isGrounded) return;
    this.isJumping = false;
  }

  _handleJumpReleased() {
    if (!this.inputHandler.isJustReleased("jump")) return;
    if (!this.isJumping) return;
    if (this.rigidBody.velocity.y >= 0) return;
    this.rigidBody.velocity.y *= this.jumpCutMultiplier;
  }

  _handleFallGravity() {
    if (this.rigidBody.velocity.y <= 0) return;
    this.rigidBody.applyForce(new Vec2(0, this.additionalFallGravity));
  }

  _handleInteraction() {
    if (this.inputHandler.isJustPressed("interact")) {
      const tileMap = GameManager.instance.tileMap;
      const tilePos = this._getTilePosition(tileMap);

      for (let dy = -this.interactRadius; dy <= this.interactRadius; dy++) {
        for (let dx = -this.interactRadius; dx <= this.interactRadius; dx++) {
          const tile = tileMap.getTile(tilePos.x + dx, tilePos.y + dy);
          if (tile?.onPlayerInteract) {
            tile.onPlayerInteract();
          }
        }
      }
    }
  }

  _limitFallSpeed() {
    if (this.rigidBody.velocity.y > this.maxFallSpeed) {
      this.rigidBody.velocity.y = this.maxFallSpeed;
    }
  }

  _checkOffScreen() {
    const deadZone = new Vec2(0, 8);
    const safeZone = new Vec2(this.canvas.width, this.canvas.height).sub(deadZone);
    if (!this._isOnScreen(safeZone, this.position, this.size)) {
      this._death();
    }
  }

  _checkGoal() {
    const tileMap = GameManager.instance.tileMap;
    const tilePos = this._getTilePosition(tileMap);
    const tile = tileMap.getTile(tilePos.x, tilePos.y);

    if (tile?.onEntityHit) {
      tile.onEntityHit(this);
    }
  }

  _getTilePosition(tileMap) {
    const center = this.position.add(this.size.mul(0.5));
    return new Vec2(
      Math.floor(center.x / tileMap.tileSize),
      Math.floor(center.y / tileMap.tileSize)
    );
  }

  _isOnScreen(canvas, pos, size) {
    return !(pos.x + size.w < 0 || pos.x > canvas.x || pos.y + size.h < 0 || pos.y > canvas.y);
  }

  _death() {
    GameManager.instance.reloadMap();
  }

  render(g) {
    const roundedPos = new Vec2(Math.round(this.position.x), Math.round(this.position.y));
    g.fill('limegreen');
    g.rect(roundedPos.x, roundedPos.y, this.size.x, this.size.y);
  }
}