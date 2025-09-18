class BaseTile extends EventEmitter {
  constructor(tileSize, x, y, image, tileId, isColliderActive = true) {
    super();
    this.tileSize = tileSize;
    this.position = new Vec2(x, y);
    this.image = image;
    this.tileId = tileId;

    this.rigidBody = new RigidBody(this.position, null, this, 1, false, true);
    this._collider = new Collider(Vec2.zero(), new Vec2(tileSize, tileSize), isColliderActive);
    this.rigidBody.setCollider(this._collider);

    this._isColliderActive = isColliderActive;
  }

  update(deltaTime) {
    // Override in subclasses
  }

  backgroundRender(g) {
    // Override in subclasses
  }

  render(g) {
    if (this.image) {
      g.image(this.image, this.position.x, this.position.y);
    }
  }

  get collider() {
    return this._collider;
  }

  get globalCollider() {
    return this._collider.translate(this.position);
  }

  get isColliderActive() {
    if (this._isColliderActive !== undefined) {
      return this._isColliderActive;
    }
    return this._collider ? this._collider.isActive : true;
  }

  set isColliderActive(value) {
    this._isColliderActive = value;
    if (this._collider) {
      this._collider.isActive = value;
    }
  }
}