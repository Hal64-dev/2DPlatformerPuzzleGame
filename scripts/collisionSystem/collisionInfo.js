class CollisionInfo {
  constructor(entity = null, tile = null, normal = Vec2.zero(), point = Vec2.zero()) {
    this.entity = entity;
    this.tile = tile;
    this.normal = normal;
    this.point = point;
  }
}