const assert = require('assert');
const { createTextCanvasOfSize } = require('../src/image/canvas.js');
const { createDirectory } = require('../src/utils/createDirectory');

describe('createTextCanvas', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/canvas';
    await createDirectory(dirPath);
    
  });

  it('should create a canvas with the given text and size', async () => {
    // Define the input values
    const text = 'Hello, world!';
    const width = 319;
    const height = 50;

    // Call the function with the input values
    const canvas = await createTextCanvasOfSize(text, width, height);

    // Check the canvas size
    assert.strictEqual(canvas.width, width);
    assert.strictEqual(canvas.height, height);

    // Check the canvas content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const isYellowPixel = (r, g, b, a) => r === 255 && g === 255 && b === 0 && a === 255;
    let hasTextPixels = false;
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      if (isYellowPixel(r, g, b, a)) {
        hasTextPixels = true;
        break;
      }
    }
    assert(hasTextPixels, 'The canvas should contain yellow pixels for the text');
  });
});
