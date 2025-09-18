class Entity extends EventEmitter {
  constructor(position, size, mass = 1, applyGravity = true, isStatic = false) {
    super();
    this.position = position.copy();
    this.size = size.copy();
    this.velocity = Vec2.zero();
    this.mass = mass;

    // Physics
    this.rigidBody = new RigidBody(this.position, this, null, mass, applyGravity, isStatic);
    this._collider = new Collider(Vec2.zero(), this.size, true);
    this.rigidBody.setCollider(this._collider);

    // State
    this.active = true;
    this.destroyed = false;
  }

  init() {
    // Override in subclasses
  }

  update(deltaTime) {
    if (!this.active) return;

    // Sync with physics
    this.position = this.rigidBody.position.copy();
    this.velocity = this.rigidBody.velocity.copy();
  }

  render(g) {
    // Override in subclasses
  }

  destroy() {
    this.destroyed = true;
    this.active = false;
    this.emit('destroyed');
  }

  get collider() {
    return this._collider;
  }

  get globalCollider() {
    return this._collider.global;
  }
}