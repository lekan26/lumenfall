export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.keyPressed = new Set();
    this.mouseX = CONFIG_WIDTH_CENTER || 640;
    this.mouseY = CONFIG_HEIGHT_CENTER || 360;
    this.mouseDown = false;
    this.mouseClicked = false;

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) {
        this.keyPressed.add(e.code);
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    const updateMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };

    window.addEventListener('mousemove', updateMouse);
    window.addEventListener('mousedown', (e) => {
      updateMouse(e);
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });

    // Touch support
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        this.mouseX = (touch.clientX - rect.left) * (1280 / rect.width);
        this.mouseY = (touch.clientY - rect.top) * (720 / rect.height);
        this.mouseDown = true;
        this.mouseClicked = true;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.mouseDown = false;
    }, { passive: true });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isPressed(code) {
    if (this.keyPressed.has(code)) {
      this.keyPressed.delete(code);
      return true;
    }
    return false;
  }

  consumeClick() {
    const c = this.mouseClicked;
    this.mouseClicked = false;
    return c;
  }

  reset() {
    this.keyPressed.clear();
    this.mouseClicked = false;
  }
}

const CONFIG_WIDTH_CENTER = 640;
const CONFIG_HEIGHT_CENTER = 360;
