class IconUI {
  constructor(image, position) {
    this.image = image;
    this.position = position;
  }

  render(g) {
    g.image(
      this.image,
      this.position.x,
      this.position.y,
    );
  }
}