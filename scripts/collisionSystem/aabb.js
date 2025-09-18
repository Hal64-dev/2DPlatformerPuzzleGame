class AABB {
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  intersects(other) {
    return !(this.right < other.left ||
      this.left > other.right ||
      this.bottom < other.top ||
      this.top > other.bottom);
  }

  get width() { return this.right - this.left; }
  get height() { return this.bottom - this.top; }
  get center() { return new Vec2((this.left + this.right) / 2, (this.top + this.bottom) / 2); }

  contains(point) {
    return point.x >= this.left && point.x <= this.right &&
      point.y >= this.top && point.y <= this.bottom;
  }

  static fromPositionAndSize(pos, size) {
    return new AABB(pos.x, pos.y, pos.x + size.x, pos.y + size.y);
  }
}