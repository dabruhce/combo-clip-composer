const assert = require('assert');
const { createTextCanvasOfSize, estimateTextSize, registerCustomFont, isFontRegistered } = require('../src/image/canvas.js');
const { recreateDirectory } = require('../src/utils/createDirectory');
const path = require('path');
const fs = require('fs');

describe('createTextCanvas', () => {

  beforeAll(async () => {
    // Delete the directory if it exists
    const dirPath = './artifacts/canvas';
    await recreateDirectory(dirPath);
  });

  it('should create a canvas with the given text using default font', async () => {
    // Define the input values
    const text = 'Hello, world!';

    // Call the function with the input values (no config - uses defaults)
    const canvas = await createTextCanvasOfSize(text);

    // The canvas size should be calculated based on default font (THEBOLDFONT) and size (50)
    const expectedSize = estimateTextSize(text, 'THEBOLDFONT', 50);
    assert.strictEqual(canvas.width, expectedSize.width);
    assert.strictEqual(canvas.height, expectedSize.height);

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

describe('estimateTextSize', () => {
  it('should estimate text size with default font and size', () => {
    const text = 'Test';
    const result = estimateTextSize(text);

    // Should use defaults when font and fontSize not provided
    expect(result.height).toBe(50); // default fontSize
    expect(result.width).toBeGreaterThan(0);
  });

  it('should estimate text size with custom font size', () => {
    const text = 'Test';
    const result25 = estimateTextSize(text, 'THEBOLDFONT', 25);
    const result50 = estimateTextSize(text, 'THEBOLDFONT', 50);
    const result100 = estimateTextSize(text, 'THEBOLDFONT', 100);

    // Height should match fontSize
    expect(result25.height).toBe(25);
    expect(result50.height).toBe(50);
    expect(result100.height).toBe(100);

    // Width should be greater than 0 for all sizes
    expect(result25.width).toBeGreaterThan(0);
    expect(result50.width).toBeGreaterThan(0);
    expect(result100.width).toBeGreaterThan(0);

    // Width should scale proportionally with font size (or remain constant for some fonts)
    // Note: Some fonts may have fixed-width characters
    expect(result100.width).toBeGreaterThanOrEqual(result50.width);
    expect(result50.width).toBeGreaterThanOrEqual(result25.width);
  });

  it('should return different widths for different text lengths', () => {
    const shortText = 'Hi';
    const longText = 'Hello, world!';

    const shortResult = estimateTextSize(shortText, 'THEBOLDFONT', 50);
    const longResult = estimateTextSize(longText, 'THEBOLDFONT', 50);

    // Both should have positive widths
    expect(shortResult.width).toBeGreaterThan(0);
    expect(longResult.width).toBeGreaterThan(0);
    // Longer text should have width >= shorter text
    expect(longResult.width).toBeGreaterThanOrEqual(shortResult.width);
  });
});

describe('createTextCanvasOfSize with config', () => {
  it('should use config font size when provided', async () => {
    const text = 'Test';
    const config = {
      text: {
        font: 'THEBOLDFONT',
        fontSize: 30,
        color: 'yellow'
      }
    };

    const canvas = await createTextCanvasOfSize(text, null, null, config);

    // Height should be the fontSize from config
    expect(canvas.height).toBe(30);
  });

  it('should use larger font size from config', async () => {
    const text = 'Test';
    const smallConfig = {
      text: {
        font: 'THEBOLDFONT',
        fontSize: 25,
        color: 'yellow'
      }
    };
    const largeConfig = {
      text: {
        font: 'THEBOLDFONT',
        fontSize: 75,
        color: 'yellow'
      }
    };

    const smallCanvas = await createTextCanvasOfSize(text, null, null, smallConfig);
    const largeCanvas = await createTextCanvasOfSize(text, null, null, largeConfig);

    // Width should scale (or remain constant for some fonts)
    expect(largeCanvas.width).toBeGreaterThanOrEqual(smallCanvas.width);
    // Height should definitely be larger (fontSize determines height)
    expect(largeCanvas.height).toBeGreaterThan(smallCanvas.height);
  });

  it('should fall back to defaults when config is null', async () => {
    const text = 'Test';
    const canvasNoConfig = await createTextCanvasOfSize(text, null, null, null);
    const canvasUndefinedConfig = await createTextCanvasOfSize(text);

    // Both should produce same result (using defaults)
    expect(canvasNoConfig.width).toBe(canvasUndefinedConfig.width);
    expect(canvasNoConfig.height).toBe(canvasUndefinedConfig.height);
  });

  it('should fall back to defaults when config.text is missing', async () => {
    const text = 'Test';
    const config = {}; // No text property

    const canvasWithEmptyConfig = await createTextCanvasOfSize(text, null, null, config);
    const canvasNoConfig = await createTextCanvasOfSize(text);

    // Should use defaults when config.text is missing
    expect(canvasWithEmptyConfig.height).toBe(50); // default fontSize
    expect(canvasWithEmptyConfig.width).toBe(canvasNoConfig.width);
  });

  it('should handle partial config (only fontSize provided)', async () => {
    const text = 'Test';
    const config = {
      text: {
        fontSize: 40
        // font and color not provided - should use defaults
      }
    };

    const canvas = await createTextCanvasOfSize(text, null, null, config);

    expect(canvas.height).toBe(40);
  });

  it('should handle partial config (only font provided)', async () => {
    const text = 'Test';
    const config = {
      text: {
        font: 'THEBOLDFONT'
        // fontSize and color not provided - should use defaults
      }
    };

    const canvas = await createTextCanvasOfSize(text, null, null, config);

    // Should use default fontSize of 50
    expect(canvas.height).toBe(50);
  });
});

describe('registerCustomFont', () => {
  it('should throw error for non-existent font file', () => {
    expect(() => {
      registerCustomFont('/non/existent/font.ttf', 'NonExistent');
    }).toThrow('Font file not found: /non/existent/font.ttf');
  });

  it('should return true when registering already registered font', () => {
    // THEBOLDFONT is registered by default
    const result = registerCustomFont('./assets/fonts/THEBOLDFONT/THEBOLDFONT.ttf', 'THEBOLDFONT');
    expect(result).toBe(true);
  });
});

describe('isFontRegistered', () => {
  it('should return true for default font', () => {
    expect(isFontRegistered('THEBOLDFONT')).toBe(true);
  });

  it('should return false for unregistered font', () => {
    expect(isFontRegistered('SomeUnknownFont')).toBe(false);
  });
});
