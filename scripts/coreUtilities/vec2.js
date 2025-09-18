class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  copy() { return new Vec2(this.x, this.y); }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSqr() { return this.x * this.x + this.y * this.y; }

  normalize() {
    const len = this.length();
    return len === 0 ? Vec2.zero() : this.div(len);
  }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s) { return new Vec2(this.x * s, this.y * s); }
  div(s) { return new Vec2(this.x / s, this.y / s); }
  dot(v) { return this.x * v.x + this.y * v.y; }

  static zero() { return new Vec2(0, 0); }
  static one() { return new Vec2(1, 1); }
  static right() { return new Vec2(1, 0); }
  static up() { return new Vec2(0, -1); }
}