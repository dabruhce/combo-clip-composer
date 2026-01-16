// Tests for frame offset functions added in US-001, US-002, US-005
// Uses global __mocks__/canvas.js mock for canvas module

jest.mock('ffmpeg-extract-frames', () => jest.fn(() => Promise.resolve()));

const { parseTimecode, calculateFrameOffsetTime, trimVideo } = require('../src/video/videoUtils');
const { recreateDirectory } = require('../src/utils/createDirectory');
const { generateJobId } = require('../src/utils/generateJobId');

jest.setTimeout(600000);

describe('parseTimecode', () => {
  describe('MM:SS format parsing', () => {
    test('should parse "2:01" to 121 seconds', () => {
      const result = parseTimecode('2:01');
      expect(result).toBe(121);
    });

    test('should parse "0:30" to 30 seconds', () => {
      const result = parseTimecode('0:30');
      expect(result).toBe(30);
    });

    test('should parse "10:00" to 600 seconds', () => {
      const result = parseTimecode('10:00');
      expect(result).toBe(600);
    });

    test('should parse "59:59" to 3599 seconds', () => {
      const result = parseTimecode('59:59');
      expect(result).toBe(3599);
    });
  });

  describe('H:MM:SS format parsing', () => {
    test('should parse "1:02:01" to 3721 seconds', () => {
      const result = parseTimecode('1:02:01');
      expect(result).toBe(3721);
    });

    test('should parse "0:00:45" to 45 seconds', () => {
      const result = parseTimecode('0:00:45');
      expect(result).toBe(45);
    });

    test('should parse "2:30:00" to 9000 seconds', () => {
      const result = parseTimecode('2:30:00');
      expect(result).toBe(9000);
    });
  });

  describe('SS format parsing', () => {
    test('should parse "45" to 45 seconds', () => {
      const result = parseTimecode('45');
      expect(result).toBe(45);
    });

    test('should parse "0" to 0 seconds', () => {
      const result = parseTimecode('0');
      expect(result).toBe(0);
    });

    test('should parse "120" to 120 seconds', () => {
      const result = parseTimecode('120');
      expect(result).toBe(120);
    });
  });

  describe('invalid input handling', () => {
    test('should throw error for null input', () => {
      expect(() => parseTimecode(null)).toThrow('Invalid timecode: must be a non-empty string');
    });

    test('should throw error for undefined input', () => {
      expect(() => parseTimecode(undefined)).toThrow('Invalid timecode: must be a non-empty string');
    });

    test('should throw error for empty string', () => {
      expect(() => parseTimecode('')).toThrow('Invalid timecode: must be a non-empty string');
    });

    test('should throw error for non-string input', () => {
      expect(() => parseTimecode(123)).toThrow('Invalid timecode: must be a non-empty string');
    });

    test('should throw error for invalid characters', () => {
      expect(() => parseTimecode('abc')).toThrow('Invalid timecode format');
    });

    test('should throw error for mixed valid/invalid segments', () => {
      expect(() => parseTimecode('1:ab:30')).toThrow('Invalid timecode format');
    });

    test('should throw error for too many segments', () => {
      expect(() => parseTimecode('1:2:3:4')).toThrow('Invalid timecode format');
    });

    test('should throw error for negative numbers', () => {
      expect(() => parseTimecode('-1:30')).toThrow('Invalid timecode format');
    });
  });
});

describe('calculateFrameOffsetTime', () => {
  describe('positive frame offset', () => {
    test('should calculate "2:01" + 20 frames at 30fps to ~121.667 seconds', () => {
      const result = calculateFrameOffsetTime('2:01', 20, 30);
      expect(result).toBeCloseTo(121.667, 2);
    });

    test('should calculate "0:00" + 15 frames at 30fps to 0.5 seconds', () => {
      const result = calculateFrameOffsetTime('0:00', 15, 30);
      expect(result).toBeCloseTo(0.5, 2);
    });

    test('should calculate "1:00" + 30 frames at 60fps to 60.5 seconds', () => {
      const result = calculateFrameOffsetTime('1:00', 30, 60);
      expect(result).toBeCloseTo(60.5, 2);
    });
  });

  describe('negative frame offset', () => {
    test('should calculate "2:31" - 5 frames at 30fps to ~150.833 seconds', () => {
      const result = calculateFrameOffsetTime('2:31', -5, 30);
      expect(result).toBeCloseTo(150.833, 2);
    });

    test('should calculate "1:00" - 15 frames at 30fps to 59.5 seconds', () => {
      const result = calculateFrameOffsetTime('1:00', -15, 30);
      expect(result).toBeCloseTo(59.5, 2);
    });

    test('should calculate "0:01" - 10 frames at 60fps to ~0.833 seconds', () => {
      const result = calculateFrameOffsetTime('0:01', -10, 60);
      expect(result).toBeCloseTo(0.833, 2);
    });
  });

  describe('zero frame offset', () => {
    test('should return exact timecode seconds with 0 offset', () => {
      const result = calculateFrameOffsetTime('2:00', 0, 30);
      expect(result).toBe(120);
    });
  });

  describe('clamping when offset exceeds FPS', () => {
    test('should clamp positive offset to fps-1 when offset >= fps', () => {
      // At 30fps, max offset is 29 frames
      // 40 frames should be clamped to 29 frames = 29/30 = 0.967 seconds offset
      const result = calculateFrameOffsetTime('1:00', 40, 30);
      expect(result).toBeCloseTo(60 + (29 / 30), 2);
    });

    test('should clamp negative offset to -(fps-1) when offset <= -fps', () => {
      // At 30fps, min offset is -29 frames
      // -50 frames should be clamped to -29 frames = -29/30 = -0.967 seconds offset
      const result = calculateFrameOffsetTime('1:00', -50, 30);
      expect(result).toBeCloseTo(60 - (29 / 30), 2);
    });

    test('should not clamp offset at exactly fps-1', () => {
      // At 30fps, 29 frames is valid and should not be clamped
      const result = calculateFrameOffsetTime('1:00', 29, 30);
      expect(result).toBeCloseTo(60 + (29 / 30), 2);
    });

    test('should not clamp offset at exactly -(fps-1)', () => {
      // At 30fps, -29 frames is valid and should not be clamped
      const result = calculateFrameOffsetTime('1:00', -29, 30);
      expect(result).toBeCloseTo(60 - (29 / 30), 2);
    });
  });

  describe('different FPS values', () => {
    test('should calculate correctly for 24fps', () => {
      // 12 frames at 24fps = 0.5 seconds
      const result = calculateFrameOffsetTime('1:00', 12, 24);
      expect(result).toBeCloseTo(60.5, 2);
    });

    test('should calculate correctly for 60fps', () => {
      // 30 frames at 60fps = 0.5 seconds
      const result = calculateFrameOffsetTime('1:00', 30, 60);
      expect(result).toBeCloseTo(60.5, 2);
    });

    test('should calculate correctly for NTSC 29.97fps', () => {
      // 15 frames at 29.97fps ≈ 0.5 seconds
      const result = calculateFrameOffsetTime('1:00', 15, 29.97);
      expect(result).toBeCloseTo(60.5, 1);
    });
  });
});

describe('trimVideo with frame offsets', () => {
  beforeAll(async () => {
    const dirPath = './artifacts/trim-offset';
    await recreateDirectory(dirPath);
  });

  test('should trim video with startOffset and endOffset', async () => {
    const jobID = generateJobId();
    const jobDirectory = './artifacts/trim-offset/' + jobID;
    await recreateDirectory(jobDirectory);

    const inputFile = './assets/tests/video/video.mp4';

    const data = {
      inputFileLocation: inputFile,
      outputFileDestination: jobDirectory,
      startTime: '00:01',
      startOffset: 10,
      endTime: '00:04',
      endOffset: -5
    };

    // This test verifies the function accepts frame offset parameters
    // and successfully processes the video
    const result = await trimVideo(data);
    // If no error thrown, the test passes
    expect(result).toBeUndefined();
  });

  test('should trim video with only startOffset (no endOffset)', async () => {
    const jobID = generateJobId();
    const jobDirectory = './artifacts/trim-offset/' + jobID;
    await recreateDirectory(jobDirectory);

    const inputFile = './assets/tests/video/video.mp4';

    const data = {
      inputFileLocation: inputFile,
      outputFileDestination: jobDirectory,
      startTime: '00:00',
      startOffset: 15,
      endTime: '00:03'
    };

    const result = await trimVideo(data);
    expect(result).toBeUndefined();
  });

  test('should maintain backward compatibility with startTime + duration', async () => {
    const jobID = generateJobId();
    const jobDirectory = './artifacts/trim-offset/' + jobID;
    await recreateDirectory(jobDirectory);

    const inputFile = './assets/tests/video/video.mp4';

    const data = {
      inputFileLocation: inputFile,
      outputFileDestination: jobDirectory,
      startTime: '00:01',
      duration: 2
    };

    // Existing usage without offsets should continue to work
    const result = await trimVideo(data);
    expect(result).toBeUndefined();
  });

  test('should reject when end time is before start time', async () => {
    const jobID = generateJobId();
    const jobDirectory = './artifacts/trim-offset/' + jobID;
    await recreateDirectory(jobDirectory);

    const inputFile = './assets/tests/video/video.mp4';

    const data = {
      inputFileLocation: inputFile,
      outputFileDestination: jobDirectory,
      startTime: '00:05',
      endTime: '00:02'
    };

    await expect(trimVideo(data)).rejects.toThrow('End time must be after start time');
  });
});
