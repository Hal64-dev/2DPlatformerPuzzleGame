class InputHandler {
  constructor() {
    this.moveInput = 0;

    // Action key's current frame state
    this.currentStates = {
      jump: false,
      interact: false,
      mapReload: false
    };
    // Action key's previous frame state
    this.previousStates = { ...this.currentStates };

    this.jumpInput = false;
    this.interactInput = false;
    this.mapReloadInput = false;

    // Save inputs as object to use value as call by reference
    this.inputRefs = {
      left: { value: false },
      right: { value: false },
      jump: { value: false },
      interact: { value: false },
      mapReload: { value: false }
    };
  }

  update() {
    this.previousStates = { ...this.currentStates };

    this.currentStates = {
      jump: keyIsDown(UP_ARROW),
      interact: keyIsDown(DOWN_ARROW),
      mapReload: keyIsDown(82)
    };

    this.moveInput = 0;
    if (keyIsDown(LEFT_ARROW)) this.moveInput -= 1;
    if (keyIsDown(RIGHT_ARROW)) this.moveInput += 1;

    this.jumpInput = this.currentStates.jump;
    this.interactInput = this.currentStates.interact;
    this.mapReloadInput = this.currentStates.mapReload;

    this.inputRefs.left.value = this.moveInput === -1;
    this.inputRefs.right.value = this.moveInput === 1;
    this.inputRefs.jump.value = this.jumpInput;
    this.inputRefs.interact.value = this.interactInput;
    this.inputRefs.mapReload.value = this.mapReloadInput;
  }

  isJustPressed(action) {
    return this.currentStates[action] && !this.previousStates[action];
  }

  isJustReleased(action) {
    return !this.currentStates[action] && this.previousStates[action];
  }
}