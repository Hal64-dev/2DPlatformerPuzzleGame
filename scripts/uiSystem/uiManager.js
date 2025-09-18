class UIManager extends EventEmitter {
  constructor() {
    super();
    this.uis = [];
  }

  // Adds a UI element to be managed
  addUI(uiElement) {
    if (!uiElement) {
      console.warn('UIManager: Attempted to add null/undefined UI element');
      return;
    }

    this.uis.push(uiElement);
  }

  // Removes a UI element from management
  removeUI(uiElement) {
    const initialLength = this.uis.length;
    this.uis = this.uis.filter(ui => ui !== uiElement);

    if (this.uis.length === initialLength) {
      console.warn('UIManager: Attempted to remove UI element that was not found');
    }
  }

  // Initialize all managed UI elements
  init() {
    this.uis.forEach((ui, index) => {
      try {
        if (ui.init) {
          ui.init();
        }
      } catch (error) {
        console.error(`UIManager: Error initializing UI at index ${index}:`, error);
      }
    });
  }

  // Updates all managed UI elements
  update(dt) {
    this.uis.forEach((ui, index) => {
      try {
        if (ui.update) {
          ui.update(dt);
        }
      } catch (error) {
        console.error(`UIManager: Error updating UI at index ${index}:`, error);
      }
    });
  }

  // s all managed UI elements
  render(g) {
    this.uis.forEach((ui, index) => {
      try {
        if (ui.render) {
          ui.render(g);
        }
      } catch (error) {
        console.error(`UIManager: Error rendering UI at index ${index}:`, error);
      }
    });
  }

  // Gets the number of currently managed UI elements
  getUICount() {
    return this.uis.length;
  }

  // Removes all UI elements
  clear() {
    this.uis = [];
    this.uis.length = 0;
  }
}