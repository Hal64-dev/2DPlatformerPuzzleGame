class BallGeneratorTile extends InteractiveTile {
  constructor(tileSize, x, y, images, tileId, initialState, tag, tileMap, direction = 0, ballSpeed = 32) {
    super(tileSize, x, y, images, tileId, initialState, tag, tileMap, true);

    this.direction = direction % 8;
    this.enable = true;

    // Direction vectors and names
    this.directionVectors = [
      new Vec2(1, 0), new Vec2(1, -1), new Vec2(0, -1), new Vec2(-1, -1),
      new Vec2(-1, 0), new Vec2(-1, 1), new Vec2(0, 1), new Vec2(1, 1)
    ];
    this.directionNames = [
      'right', 'right-up', 'up', 'left-up',
      'left', 'left-down', 'down', 'right-down'
    ];

    this.ballDirection = this._getDirectionVector(this.direction);
    this.ballSize = new Vec2(4, 4);
    this.ballSpeed = ballSpeed;
    this.ballCooldown = 100; // ms
    this.lastBallGenerated = 0;
    this.generatedBalls = [];

    this._updateSprite();

    console.log(
      `BallGeneratorTile created at (${x}, ${y}) with tag: ${tag}, direction: ${this.directionNames[this.direction]}`
    );
  }

  // --- Direction helpers ---
  _getDirectionVector(direction) {
    return this.directionVectors[direction % 8].normalize();
  }

  setDirection(direction) {
    this.direction = direction % 8;
    this.ballDirection = this._getDirectionVector(this.direction);
    this._updateSprite();
  }

  rotateClockwise() {
    this.setDirection(this.direction + 1);
  }

  rotateCounterClockwise() {
    this.setDirection(this.direction - 1);
  }

  setBallDirection(direction) {
    this.ballDirection = direction.normalize();
  }

  setBallSpeed(speed) {
    this.ballSpeed = speed;
  }

  // --- Sprite ---
  _updateSprite() {
    if (!Array.isArray(this.images)) return;
    const spriteIndex = this.direction * 2 + (this.enable ? 0 : 1);
    this.image = this.images[spriteIndex] || this.images[0];
  }

  // --- Activation ---
  changeState() {
    if (!this.canActivate()) return false;
    this.state = !this.state;
    this.image = this.images[this.state ? 1 : 0];
    this.lastActivated = millis();
    this.emit('activated', this.state);
    return true;
  }

  activate() {
    if (!this.enable) return false;
    const wasActivated = this.changeState();
    this.enable = false;
    if (wasActivated) this.generateBall();
    return wasActivated;
  }

  toggle() { this.activate(); }

  // --- Ball generation ---
  canGenerateBall() {
    return (millis() - this.lastBallGenerated) >= this.ballCooldown;
  }

  generateBall() {
    if (!this.canGenerateBall()) return false;

    const spawnPos = new Vec2(
      this.position.x + this.tileSize / 2 - this.ballSize.x / 2,
      this.position.y + this.tileSize / 2 - this.ballSize.y / 2
    );

    const velocity = this.ballDirection.mul(this.ballSpeed);
    const ball = new Ball(spawnPos, this.ballSize, velocity);

    ball.on('destroyed', () => this.onBallDestroyed(ball));
    GameManager.instance.addEntity(ball);

    this.generatedBalls.push(ball);
    this.lastBallGenerated = millis();
    this.isGenerating = true;

    console.log(
      `Generated ball at (${spawnPos.x}, ${spawnPos.y}) with velocity (${velocity.x}, ${velocity.y})`
    );
    return true;
  }

  onBallDestroyed(ball) {
    const index = this.generatedBalls.indexOf(ball);
    if (index > -1) this.generatedBalls.splice(index, 1);
  }

  // --- Update ---
  update(deltaTime) {
    super.update(deltaTime);
    this.generatedBalls = this.generatedBalls.filter(ball =>
      !ball.destroyed && GameManager.instance.entities.includes(ball)
    );
  }

  // --- Rendering ---
  render(g) {
    if (this.image) {
      if (this.tag && this.tileMap?.getTagColor) {
        g.tint(this.tileMap.getTagColor(this.tag));
        g.image(this.image, this.position.x, this.position.y);
        g.noTint();
      } else {
        g.image(this.image, this.position.x, this.position.y);
      }
    } else {
      this._renderFallback(g);
    }

    if (GameManager.instance?.isShowDebugInfo) {
      this._renderDebugInfo(g);
    }
  }

  _renderFallback(g) {
    const center = this.position.add(new Vec2(this.tileSize / 2, this.tileSize / 2));
    const arrowEnd = center.add(this.ballDirection.mul(this.tileSize * 0.3));
    const arrowSize = 2;
    const perpendicular = new Vec2(-this.ballDirection.y, this.ballDirection.x);

    g.push();
    g.fill('#888');
    g.stroke(255);
    g.strokeWeight(1);
    g.rect(this.position.x, this.position.y, this.tileSize, this.tileSize);

    // Draw arrow
    g.strokeWeight(2);
    g.line(center.x, center.y, arrowEnd.x, arrowEnd.y);
    const arrowLeft = arrowEnd.add(this.ballDirection.mul(-arrowSize)).add(perpendicular.mul(arrowSize));
    const arrowRight = arrowEnd.add(this.ballDirection.mul(-arrowSize)).sub(perpendicular.mul(arrowSize));
    g.line(arrowEnd.x, arrowEnd.y, arrowLeft.x, arrowLeft.y);
    g.line(arrowEnd.x, arrowEnd.y, arrowRight.x, arrowRight.y);

    // Draw direction index
    g.fill(255);
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textSize(6);
    g.text(this.direction.toString(), center.x, center.y + this.tileSize / 3);
    g.pop();
  }

  _renderDebugInfo(g) {
    const center = this.position.add(new Vec2(this.tileSize / 2, this.tileSize / 2));
    const arrowEnd = center.add(this.ballDirection.mul(12));
    const arrowSize = 2;
    const perpendicular = new Vec2(-this.ballDirection.y, this.ballDirection.x);

    g.push();
    g.stroke('yellow');
    g.strokeWeight(1);
    g.noFill();

    g.line(center.x, center.y, arrowEnd.x, arrowEnd.y);
    const arrowLeft = arrowEnd.add(this.ballDirection.mul(-arrowSize)).add(perpendicular.mul(arrowSize));
    const arrowRight = arrowEnd.add(this.ballDirection.mul(-arrowSize)).sub(perpendicular.mul(arrowSize));
    g.line(arrowEnd.x, arrowEnd.y, arrowLeft.x, arrowLeft.y);
    g.line(arrowEnd.x, arrowEnd.y, arrowRight.x, arrowRight.y);

    g.fill('yellow');
    g.noStroke();
    g.textAlign(CENTER, CENTER);
    g.textSize(6);
    g.text(`Balls: ${this.generatedBalls.length}`, center.x, center.y + this.tileSize + 8);
    g.text(`Dir: ${this.directionNames[this.direction]}`, center.x, center.y + this.tileSize + 16);
    g.pop();
  }

  getDebugInfo() {
    return {
      position: this.position,
      tag: this.tag,
      direction: this.direction,
      directionName: this.directionNames[this.direction],
      ballDirection: this.ballDirection,
      ballSpeed: this.ballSpeed,
      canGenerate: this.canGenerateBall(),
      lastGenerated: this.lastBallGenerated,
      generatedBallsLength: this.generatedBalls.length,
      isGenerating: this.isGenerating
    };
  }

  // --- Static utilities ---
  static create(tileSize, x, y, images, tileId, direction, initialState = false, tag = null, tileMap = null) {
    return new BallGeneratorTile(tileSize, x, y, images, tileId, initialState, tag, tileMap, direction);
  }

  static getDirectionFromTileId(baseTileId, currentTileId) {
    return ((currentTileId - baseTileId) / 2) % 8;
  }
}
