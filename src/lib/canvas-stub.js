// Stub para el módulo 'canvas' — pdfjs-dist lo requiere pero solo lo usamos
// para extraer texto (getTextContent), no para renderizar a imagen.
// Estas funciones son llamadas por NodeCanvasFactory pero como no renderizamos,
// cualquier llamada es un no-op seguro.

class FakeCanvas {
  constructor() {}
  getContext() {
    return {
      fillRect() {},
      clearRect() {},
      getImageData() { return { data: new Uint8ClampedArray(0) }; },
      putImageData() {},
      createImageData() { return { data: new Uint8ClampedArray(0) }; },
      setTransform() {},
      drawImage() {},
      save() {},
      fillText() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      translate() {},
      scale() {},
      rotate() {},
      arc() {},
      measureText() { return { width: 0 }; },
      transform() {},
      rect() {},
      clip() {},
    };
  }
  toDataURL() { return ""; }
  toBuffer() { return Buffer.alloc(0); }
  get width() { return 0; }
  get height() { return 0; }
  set width(_) {}
  set height(_) {}
}

module.exports = {
  createCanvas: () => new FakeCanvas(),
  createImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
  Canvas: FakeCanvas,
  Image: class {
    constructor() {}
    set src(_) {}
    get src() { return ""; }
  },
  loadImage: async () => new FakeCanvas(),
  registerFont() {},
  // API mínima que pdfjs espera de NodeCanvasFactory
  CanvasRenderingContext2D: {},
  CanvasGradient: class {},
  CanvasPattern: class {},
  Path2D: class {
    constructor() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    rect() {}
    closePath() {}
  },
  DOMMatrix: class {
    constructor() {}
    multiply() { return this; }
    inverse() { return this; }
  },
  ImageData: class {
    constructor() { this.data = new Uint8ClampedArray(0); }
  },
  GlobalFonts: { register() {} },
};
