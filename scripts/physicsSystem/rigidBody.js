class RigidBody {
  constructor(position, entity = null, tile = null, mass = 1, applyGravity = true, isStatic = false) {
    this.position = position.copy();
    this.velocity = Vec2.zero();
    this.force = Vec2.zero();
    this.mass = isStatic ? Infinity : mass;
    this.invMass = isStatic ? 0 : 1 / mass;
    this.applyGravity = applyGravity;
    this.isStatic = isStatic;
    this.entity = entity;
    this.tile = tile;
    this.collider = null;
    this.isGrounded = false;
    this.bounce = 0;
    this.friction = 0;
  }

  setCollider(collider) {
    this.collider = collider;
    collider.body = this;
  }

  applyForce(force, mode = 'Force') {
    if (this.isStatic) return;

    switch (mode) {
      case 'Force':
        this.force = this.force.add(force);
        break;
      case 'Impulse':
        this.velocity = this.velocity.add(force.mul(this.invMass));
        break;
    }
  }
}