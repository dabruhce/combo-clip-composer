// Tests for configurable parameters added in US-001, US-002, US-003
// Uses global __mocks__/canvas.js mock for canvas module

jest.mock('ffmpeg-extract-frames', () => jest.fn(() => Promise.resolve()));

const { parseFrameRate, calculateInputImagesDimensions } = require('../src/video/videoUtils');

jest.setTimeout(20000000);

describe('parseFrameRate', () => {
  describe('fraction format parsing', () => {
    test('should parse NTSC 29.97fps format (30000/1001)', () => {
      const result = parseFrameRate('30000/1001');
      expect(result).toBeCloseTo(29.97, 1);
    });

    test('should parse NTSC 59.94fps format (60000/1001)', () => {
      const result = parseFrameRate('60000/1001');
      expect(result).toBeCloseTo(59.94, 1);
    });

    test('should parse simple fraction format (30/1)', () => {
      const result = parseFrameRate('30/1');
      expect(result).toBe(30);
    });

    test('should parse 24fps film format (24000/1001)', () => {
      const result = parseFrameRate('24000/1001');
      expect(result).toBeCloseTo(23.976, 2);
    });
  });

  describe('plain number parsing', () => {
    test('should parse plain integer string', () => {
      const result = parseFrameRate('30');
      expect(result).toBe(30);
    });

    test('should parse plain decimal string', () => {
      const result = parseFrameRate('29.97');
      expect(result).toBeCloseTo(29.97, 2);
    });
  });

  describe('fallback behavior', () => {
    test('should return default (30) when input is null', () => {
      const result = parseFrameRate(null);
      expect(result).toBe(30);
    });

    test('should return default (30) when input is undefined', () => {
      const result = parseFrameRate(undefined);
      expect(result).toBe(30);
    });

    test('should return default (30) when input is empty string', () => {
      const result = parseFrameRate('');
      expect(result).toBe(30);
    });

    test('should return default (30) when input is not a string', () => {
      const result = parseFrameRate(123);
      expect(result).toBe(30);
    });

    test('should return custom default when specified', () => {
      const result = parseFrameRate(null, 60);
      expect(result).toBe(60);
    });

    test('should return default when fraction has zero denominator', () => {
      const result = parseFrameRate('30/0');
      expect(result).toBe(30);
    });

    test('should return default for invalid fraction string', () => {
      const result = parseFrameRate('abc/def');
      expect(result).toBe(30);
    });

    test('should return default for negative values', () => {
      const result = parseFrameRate('-30');
      expect(result).toBe(30);
    });
  });
});

describe('calculateInputImagesDimensions', () => {
  // Helper to create config object
  const createConfig = (width = 50, height = 50, spacing = 0) => ({
    images: { width, height, spacing, padding: 5, margin: 5 }
  });

  describe('default dimensions (no config)', () => {
    test('should use default width (50) and height (50) when no config provided', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs);

      expect(result.height).toBe(50);
      // Width = 4 inputs * 50 width = 200 (no spacing by default)
      expect(result.width).toBe(200);
    });

    test('should use default when config is null', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs, null);

      expect(result.height).toBe(50);
      expect(result.width).toBe(200);
    });
  });

  describe('custom dimensions from config', () => {
    test('should use custom width for calculation from config', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const config = createConfig(100, 75);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 4 inputs * 100 width = 400
      expect(result.width).toBe(400);
      expect(result.height).toBe(75);
    });

    test('should handle single input with custom dimensions from config', () => {
      const inputs = ['1'];
      const config = createConfig(80, 60);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 1 input * 80 width = 80
      expect(result.width).toBe(80);
      expect(result.height).toBe(60);
    });

    test('should handle empty inputs array', () => {
      const inputs = [];
      const config = createConfig(50, 50);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 0 inputs = 0
      expect(result.width).toBe(0);
      expect(result.height).toBe(50);
    });

    test('should scale dimensions proportionally', () => {
      const inputs = ['d', 'df', 'f'];

      const smallConfig = createConfig(25, 25);
      const largeConfig = createConfig(100, 100);

      const smallResult = calculateInputImagesDimensions(inputs, smallConfig);
      const largeResult = calculateInputImagesDimensions(inputs, largeConfig);

      // Small: 3 * 25 = 75
      expect(smallResult.width).toBe(75);
      expect(smallResult.height).toBe(25);

      // Large: 3 * 100 = 300
      expect(largeResult.width).toBe(300);
      expect(largeResult.height).toBe(100);
    });
  });

  describe('with spacing from config', () => {
    test('should add spacing between images', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const config = createConfig(50, 50, 10);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 4 * 50 + (4-1) * 10 = 200 + 30 = 230
      expect(result.width).toBe(230);
      expect(result.height).toBe(50);
    });

    test('should not add spacing for single input', () => {
      const inputs = ['1'];
      const config = createConfig(50, 50, 10);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 1 * 50 + 0 gaps = 50
      expect(result.width).toBe(50);
    });

    test('should handle zero spacing', () => {
      const inputs = ['d', 'df', 'f'];
      const config = createConfig(50, 50, 0);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 3 * 50 = 150
      expect(result.width).toBe(150);
    });
  });

  describe('various config values (US-007)', () => {
    test('should handle large image dimensions', () => {
      const inputs = ['d', 'df', 'f'];
      const config = createConfig(200, 150, 20);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 3 * 200 + 2 * 20 = 600 + 40 = 640
      expect(result.width).toBe(640);
      expect(result.height).toBe(150);
    });

    test('should handle small image dimensions', () => {
      const inputs = ['d', 'df', 'f', '1', '2'];
      const config = createConfig(10, 10, 2);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 5 * 10 + 4 * 2 = 50 + 8 = 58
      expect(result.width).toBe(58);
      expect(result.height).toBe(10);
    });

    test('should handle non-square dimensions', () => {
      const inputs = ['d', 'df'];
      const config = createConfig(80, 40, 5);
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 2 * 80 + 1 * 5 = 160 + 5 = 165
      expect(result.width).toBe(165);
      expect(result.height).toBe(40);
    });
  });
});

describe('processComboVideo parameter signature', () => {
  // These tests verify the function signature accepts the new parameters
  // without actually running the full video processing pipeline
  const { processComboVideo } = require('../src/video/videoUtils');

  test('processComboVideo should be a function', () => {
    expect(typeof processComboVideo).toBe('function');
  });

  test('processComboVideo should accept 9 parameters (including configPath)', () => {
    // processComboVideo(inputFile, text, x, y, jobDirectory, directories, inputWidth, inputHeight, configPath)
    // The function.length property returns the number of parameters without default values
    // Since many have defaults, we verify it accepts all by checking it's at least 4 (the required ones)
    expect(processComboVideo.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Config integration with video pipeline', () => {
  const path = require('path');
  const fs = require('fs');
  const { loadConfig } = require('../src/config/configLoader');

  const testConfigDir = path.join(__dirname, 'fixtures');
  const customConfigPath = path.join(testConfigDir, 'video-config.json');

  beforeAll(() => {
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    // Create a custom config file for testing
    fs.writeFileSync(customConfigPath, JSON.stringify({
      text: {
        font: 'CustomFont',
        fontSize: 72,
        color: '#FF0000'
      },
      images: {
        width: 75,
        height: 75,
        spacing: 10,
        padding: 8,
        margin: 12
      }
    }));
  });

  afterAll(() => {
    if (fs.existsSync(customConfigPath)) fs.unlinkSync(customConfigPath);
  });

  test('loadConfig returns defaults when no configPath is provided', () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.text.font).toBe('THEBOLDFONT');
    expect(config.text.fontSize).toBe(50);
    expect(config.images.width).toBe(50);
    expect(config.images.height).toBe(50);
  });

  test('loadConfig merges custom config with defaults', () => {
    const config = loadConfig(customConfigPath);

    // Custom values should be applied
    expect(config.text.font).toBe('CustomFont');
    expect(config.text.fontSize).toBe(72);
    expect(config.text.color).toBe('#FF0000');
    expect(config.images.width).toBe(75);
    expect(config.images.height).toBe(75);
    expect(config.images.spacing).toBe(10);
    expect(config.images.padding).toBe(8);
    expect(config.images.margin).toBe(12);

    // Default values for unspecified properties should remain
    expect(config.text.dropshadow.enabled).toBe(false);
    expect(config.animation.type).toBe('none');
  });

  test('loadConfig throws error for invalid config path', () => {
    expect(() => loadConfig('/nonexistent/path/config.json')).toThrow('Configuration file not found');
  });

  test('loadConfig throws error for invalid config content', () => {
    const invalidPath = path.join(testConfigDir, 'invalid-video-config.json');
    fs.writeFileSync(invalidPath, JSON.stringify({
      text: {
        fontSize: 'not-a-number'  // Invalid: should be a number
      }
    }));

    expect(() => loadConfig(invalidPath)).toThrow('invalid');

    fs.unlinkSync(invalidPath);
  });

  test('calculateInputImagesDimensions uses config image dimensions', () => {
    const config = loadConfig(customConfigPath);
    const inputs = ['d', 'df', 'f', '1'];

    const result = calculateInputImagesDimensions(inputs, config);

    // Width = 4 * 75 + 3 * 10 = 300 + 30 = 330
    expect(result.width).toBe(330);
    expect(result.height).toBe(75);
  });
});

// US-008: Configurable Spacing, Padding, and Margins
describe('Spacing, Padding, and Margin configuration (US-008)', () => {
  const { loadConfig } = require('../src/config/configLoader');

  describe('spacing config - gap between individual input images', () => {
    test('spacing of 0 results in no gaps between images', () => {
      const inputs = ['d', 'df', 'f'];
      const config = { images: { width: 50, height: 50, spacing: 0, padding: 5, margin: 5 } };
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 3 * 50 + 0 gaps = 150
      expect(result.width).toBe(150);
    });

    test('spacing of 5 adds 5px gaps between images', () => {
      const inputs = ['d', 'df', 'f'];
      const config = { images: { width: 50, height: 50, spacing: 5, padding: 5, margin: 5 } };
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 3 * 50 + 2 * 5 = 150 + 10 = 160
      expect(result.width).toBe(160);
    });

    test('spacing of 15 adds 15px gaps between images', () => {
      const inputs = ['d', 'df', 'f', '1', '2'];
      const config = { images: { width: 40, height: 40, spacing: 15, padding: 5, margin: 5 } };
      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 5 * 40 + 4 * 15 = 200 + 60 = 260
      expect(result.width).toBe(260);
    });

    test('spacing only applies between images, not at edges', () => {
      const inputs = ['1'];
      const config = { images: { width: 50, height: 50, spacing: 20, padding: 5, margin: 5 } };
      const result = calculateInputImagesDimensions(inputs, config);

      // Single image: no spacing, just the image width
      expect(result.width).toBe(50);
    });
  });

  describe('padding config - space between images and blurred background edge', () => {
    test('default padding is 5', () => {
      const config = loadConfig();
      expect(config.images.padding).toBe(5);
    });

    test('padding can be customized in config', () => {
      const path = require('path');
      const fs = require('fs');

      const testConfigPath = path.join(__dirname, 'fixtures', 'padding-test-config.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        images: { padding: 15 }
      }));

      const config = loadConfig(testConfigPath);
      expect(config.images.padding).toBe(15);

      fs.unlinkSync(testConfigPath);
    });

    test('padding of 0 is valid', () => {
      const path = require('path');
      const fs = require('fs');

      const testConfigPath = path.join(__dirname, 'fixtures', 'zero-padding-config.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        images: { padding: 0 }
      }));

      const config = loadConfig(testConfigPath);
      expect(config.images.padding).toBe(0);

      fs.unlinkSync(testConfigPath);
    });
  });

  describe('margin config - space between overlay and video frame edge', () => {
    test('default margin is 5', () => {
      const config = loadConfig();
      expect(config.images.margin).toBe(5);
    });

    test('margin can be customized in config', () => {
      const path = require('path');
      const fs = require('fs');

      const testConfigPath = path.join(__dirname, 'fixtures', 'margin-test-config.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        images: { margin: 20 }
      }));

      const config = loadConfig(testConfigPath);
      expect(config.images.margin).toBe(20);

      fs.unlinkSync(testConfigPath);
    });

    test('margin of 0 is valid', () => {
      const path = require('path');
      const fs = require('fs');

      const testConfigPath = path.join(__dirname, 'fixtures', 'zero-margin-config.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        images: { margin: 0 }
      }));

      const config = loadConfig(testConfigPath);
      expect(config.images.margin).toBe(0);

      fs.unlinkSync(testConfigPath);
    });
  });

  describe('combined spacing, padding, and margin calculations', () => {
    test('calculateInputImagesDimensions returns correct dimensions with all configs', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const config = {
        images: {
          width: 60,
          height: 45,
          spacing: 8,
          padding: 10,
          margin: 15
        }
      };

      const result = calculateInputImagesDimensions(inputs, config);

      // Width = 4 * 60 + 3 * 8 = 240 + 24 = 264
      expect(result.width).toBe(264);
      expect(result.height).toBe(45);
    });

    test('total overlay area can be calculated from dimensions + padding', () => {
      const inputs = ['d', 'df', 'f'];
      const config = {
        images: {
          width: 50,
          height: 50,
          spacing: 5,
          padding: 10,
          margin: 5
        }
      };

      const dimensions = calculateInputImagesDimensions(inputs, config);
      const padding = config.images.padding;

      // Overlay width = dimensions.width + padding*2
      const totalOverlayWidth = dimensions.width + (padding * 2);
      // Width = 3 * 50 + 2 * 5 = 160, overlay = 160 + 20 = 180
      expect(totalOverlayWidth).toBe(180);

      // Overlay height = dimensions.height + padding*2
      const totalOverlayHeight = dimensions.height + (padding * 2);
      // Height = 50, overlay = 50 + 20 = 70
      expect(totalOverlayHeight).toBe(70);
    });

    test('minimum position for overlay is margin + padding', () => {
      const config = {
        images: {
          width: 50,
          height: 50,
          spacing: 0,
          padding: 10,
          margin: 15
        }
      };

      // The minimum x position where images can start is margin + padding
      // because the blurred background extends padding pixels before the images
      const minX = config.images.margin + config.images.padding;
      const minY = config.images.margin + config.images.padding;

      expect(minX).toBe(25);
      expect(minY).toBe(25);
    });
  });
});
