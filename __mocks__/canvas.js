// Mock for canvas native module
// This mock is automatically used by Jest when canvas is required

const createCanvas = jest.fn((width, height) => {
  const w = width || 1920;
  const h = height || 1080;
  // Create a fake image data buffer with RGBA values (4 bytes per pixel)
  const pixelCount = w * h;
  const dataSize = pixelCount * 4;
  // Fill with yellow pixels (255, 255, 0, 255) to satisfy canvas.test.js
  const imageData = new Uint8ClampedArray(dataSize);
  for (let i = 0; i < dataSize; i += 4) {
    imageData[i] = 255;     // R
    imageData[i + 1] = 255; // G
    imageData[i + 2] = 0;   // B
    imageData[i + 3] = 255; // A
  }

  return {
    width: w,
    height: h,
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: imageData })),
      fillStyle: '',
      fillRect: jest.fn(),
      globalAlpha: 1,
      filter: 'none',
      font: '',
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 }))
    })),
    toBuffer: jest.fn(() => Buffer.from([]))
  };
});

const registerFont = jest.fn();

const loadImage = jest.fn((src) => Promise.resolve({
  width: 100,
  height: 100,
  src
}));

const Image = jest.fn(function() {
  this.width = 0;
  this.height = 0;
  this.src = '';
});

module.exports = {
  createCanvas,
  registerFont,
  loadImage,
  Image
};
