const { generateJobId } = require('../src/utils/generateJobId');

describe('generateJobId', () => {
  describe('default behavior (timestamp-based)', () => {
    test('should return a timestamp string by default', () => {
      const before = Date.now();
      const jobId = generateJobId();
      const after = Date.now();

      const jobIdNum = parseInt(jobId, 10);
      expect(jobIdNum).toBeGreaterThanOrEqual(before);
      expect(jobIdNum).toBeLessThanOrEqual(after);
    });

    test('should return a string', () => {
      const jobId = generateJobId();
      expect(typeof jobId).toBe('string');
    });

    test('should return different values when called at different times', async () => {
      const jobId1 = generateJobId();
      await new Promise(resolve => setTimeout(resolve, 5));
      const jobId2 = generateJobId();
      expect(jobId1).not.toBe(jobId2);
    });
  });

  describe('UUID override behavior', () => {
    test('should return UUID format when useUuid is true', () => {
      const jobId = generateJobId({ useUuid: true });
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(jobId).toMatch(uuidPattern);
    });

    test('should return different UUIDs on each call', () => {
      const jobId1 = generateJobId({ useUuid: true });
      const jobId2 = generateJobId({ useUuid: true });
      expect(jobId1).not.toBe(jobId2);
    });
  });

  describe('options handling', () => {
    test('should use timestamp when useUuid is false', () => {
      const before = Date.now();
      const jobId = generateJobId({ useUuid: false });
      const after = Date.now();

      const jobIdNum = parseInt(jobId, 10);
      expect(jobIdNum).toBeGreaterThanOrEqual(before);
      expect(jobIdNum).toBeLessThanOrEqual(after);
    });

    test('should handle empty options object', () => {
      const before = Date.now();
      const jobId = generateJobId({});
      const after = Date.now();

      const jobIdNum = parseInt(jobId, 10);
      expect(jobIdNum).toBeGreaterThanOrEqual(before);
      expect(jobIdNum).toBeLessThanOrEqual(after);
    });
  });
});
