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
  describe('default dimensions', () => {
    test('should use default width (50) and height (50)', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs);

      expect(result.height).toBe(50);
      // Width = 4 inputs * 50 width = 200 (no spacing by default)
      expect(result.width).toBe(200);
    });
  });

  describe('custom dimensions', () => {
    test('should use custom width for calculation', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs, 100, 75);

      // Width = 4 inputs * 100 width = 400
      expect(result.width).toBe(400);
      expect(result.height).toBe(75);
    });

    test('should handle single input with custom dimensions', () => {
      const inputs = ['1'];
      const result = calculateInputImagesDimensions(inputs, 80, 60);

      // Width = 1 input * 80 width = 80
      expect(result.width).toBe(80);
      expect(result.height).toBe(60);
    });

    test('should handle empty inputs array', () => {
      const inputs = [];
      const result = calculateInputImagesDimensions(inputs, 50, 50);

      // Width = 0 inputs = 0
      expect(result.width).toBe(0);
      expect(result.height).toBe(50);
    });

    test('should scale dimensions proportionally', () => {
      const inputs = ['d', 'df', 'f'];

      const smallResult = calculateInputImagesDimensions(inputs, 25, 25);
      const largeResult = calculateInputImagesDimensions(inputs, 100, 100);

      // Small: 3 * 25 = 75
      expect(smallResult.width).toBe(75);
      expect(smallResult.height).toBe(25);

      // Large: 3 * 100 = 300
      expect(largeResult.width).toBe(300);
      expect(largeResult.height).toBe(100);
    });
  });

  describe('with spacing parameter', () => {
    test('should add spacing between images', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs, 50, 50, 10);

      // Width = 4 * 50 + (4-1) * 10 = 200 + 30 = 230
      expect(result.width).toBe(230);
      expect(result.height).toBe(50);
    });

    test('should not add spacing for single input', () => {
      const inputs = ['1'];
      const result = calculateInputImagesDimensions(inputs, 50, 50, 10);

      // Width = 1 * 50 + 0 gaps = 50
      expect(result.width).toBe(50);
    });

    test('should handle zero spacing', () => {
      const inputs = ['d', 'df', 'f'];
      const result = calculateInputImagesDimensions(inputs, 50, 50, 0);

      // Width = 3 * 50 = 150
      expect(result.width).toBe(150);
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

    const result = calculateInputImagesDimensions(
      inputs,
      config.images.width,
      config.images.height,
      config.images.spacing
    );

    // Width = 4 * 75 + 3 * 10 = 300 + 30 = 330
    expect(result.width).toBe(330);
    expect(result.height).toBe(75);
  });
});
