class MathUtils {
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static map(value, min1, max1, min2, max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }
}