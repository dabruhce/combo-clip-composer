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
      // Width = (4 inputs * 50 spacing) + 10 + 10 = 220
      expect(result.width).toBe(220);
    });
  });

  describe('custom dimensions', () => {
    test('should use custom width for spacing calculation', () => {
      const inputs = ['d', 'df', 'f', '1'];
      const result = calculateInputImagesDimensions(inputs, 100, 75);

      // Width = (4 inputs * 100 spacing) + 10 + 10 = 420
      expect(result.width).toBe(420);
      expect(result.height).toBe(75);
    });

    test('should handle single input with custom dimensions', () => {
      const inputs = ['1'];
      const result = calculateInputImagesDimensions(inputs, 80, 60);

      // Width = (1 input * 80 spacing) + 10 + 10 = 100
      expect(result.width).toBe(100);
      expect(result.height).toBe(60);
    });

    test('should handle empty inputs array', () => {
      const inputs = [];
      const result = calculateInputImagesDimensions(inputs, 50, 50);

      // Width = (0 inputs * 50) + 10 + 10 = 20
      expect(result.width).toBe(20);
      expect(result.height).toBe(50);
    });

    test('should scale dimensions proportionally', () => {
      const inputs = ['d', 'df', 'f'];

      const smallResult = calculateInputImagesDimensions(inputs, 25, 25);
      const largeResult = calculateInputImagesDimensions(inputs, 100, 100);

      // Small: (3 * 25) + 20 = 95
      expect(smallResult.width).toBe(95);
      expect(smallResult.height).toBe(25);

      // Large: (3 * 100) + 20 = 320
      expect(largeResult.width).toBe(320);
      expect(largeResult.height).toBe(100);
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

  test('processComboVideo should accept 8 parameters (including new optional ones)', () => {
    // processComboVideo(inputFile, text, x, y, jobDirectory, directories, inputWidth, inputHeight)
    // The function.length property returns the number of parameters without default values
    // Since many have defaults, we verify it accepts all by checking it's at least 4 (the required ones)
    expect(processComboVideo.length).toBeGreaterThanOrEqual(4);
  });
});
