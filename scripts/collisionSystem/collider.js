class Collider {
  constructor(offset = Vec2.zero(), size = Vec2.zero(), isColliderActive = true) {
    this.offset = offset;
    this.size = size;
    this.isActive = isColliderActive;
    this.body = null;
    this.collisionListeners = [];
  }

  addCollisionListener(callback) {
    this.collisionListeners.push(callback);
  }

  triggerCollision(data) {
    this.collisionListeners.forEach(cb => cb(data));
  }

  get global() {
    const basePos = this.body?.position ?? Vec2.zero();
    return new AABB(
      basePos.x + this.offset.x,
      basePos.y + this.offset.y,
      basePos.x + this.offset.x + this.size.x,
      basePos.y + this.offset.y + this.size.y
    );
  }

  translate(position) {
    return new AABB(
      position.x + this.offset.x,
      position.y + this.offset.y,
      position.x + this.offset.x + this.size.x,
      position.y + this.offset.y + this.size.y
    );
  }
}