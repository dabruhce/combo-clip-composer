const path = require('path');
const fs = require('fs');
const { validateConfig, validateProperty, configSchema } = require('../src/config/schema');
const { loadConfig, loadDefaults, loadConfigFile, deepMerge, validateConfigObject } = require('../src/config/configLoader');

describe('Config Schema', () => {
  describe('validateConfig', () => {
    test('should validate a valid config object', () => {
      const config = {
        text: {
          font: 'THEBOLDFONT',
          fontSize: 50,
          color: 'yellow',
          position: { x: 10, y: 50 }
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-object config', () => {
      const result = validateConfig('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    test('should reject null config', () => {
      const result = validateConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    test('should reject array config', () => {
      const result = validateConfig([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    test('should validate empty config object', () => {
      const result = validateConfig({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateProperty', () => {
    test('should validate string type', () => {
      const errors = validateProperty('hello', { type: 'string' }, 'test');
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid string type', () => {
      const errors = validateProperty(123, { type: 'string' }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('expected string');
    });

    test('should validate number type', () => {
      const errors = validateProperty(42, { type: 'number' }, 'test');
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid number type', () => {
      const errors = validateProperty('not a number', { type: 'number' }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('expected number');
    });

    test('should validate number minimum', () => {
      const errors = validateProperty(0, { type: 'number', minimum: 1 }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('must be >= 1');
    });

    test('should validate number maximum', () => {
      const errors = validateProperty(100, { type: 'number', maximum: 50 }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('must be <= 50');
    });

    test('should validate boolean type', () => {
      const errors = validateProperty(true, { type: 'boolean' }, 'test');
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid boolean type', () => {
      const errors = validateProperty('true', { type: 'boolean' }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('expected boolean');
    });

    test('should validate enum values', () => {
      const errors = validateProperty('fade', { type: 'string', enum: ['none', 'fade'] }, 'test');
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid enum value', () => {
      const errors = validateProperty('slide', { type: 'string', enum: ['none', 'fade'] }, 'test');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('must be one of');
    });

    test('should validate nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        }
      };
      const errors = validateProperty({ x: 10, y: 20 }, schema, 'position');
      expect(errors).toHaveLength(0);
    });

    test('should validate required properties in objects', () => {
      const schema = {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        },
        required: ['x', 'y']
      };
      const errors = validateProperty({ x: 10 }, schema, 'position');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('required property is missing');
    });

    test('should handle undefined values gracefully', () => {
      const errors = validateProperty(undefined, { type: 'string' }, 'test');
      expect(errors).toHaveLength(0);
    });

    test('should handle null values gracefully', () => {
      const errors = validateProperty(null, { type: 'string' }, 'test');
      expect(errors).toHaveLength(0);
    });
  });

  describe('text section validation', () => {
    test('should validate complete text config', () => {
      const config = {
        text: {
          font: 'Arial',
          fontPath: './fonts/arial.ttf',
          fontSize: 24,
          color: '#FF0000',
          position: { x: 100, y: 200 },
          dropshadow: {
            enabled: true,
            color: '#000000',
            blur: 5,
            offsetX: 2,
            offsetY: 2
          }
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid fontSize', () => {
      const config = {
        text: {
          fontSize: 0
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('fontSize'))).toBe(true);
    });

    test('should require dropshadow.enabled when dropshadow is present', () => {
      const config = {
        text: {
          dropshadow: {
            color: '#000',
            blur: 5
          }
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
    });
  });

  describe('images section validation', () => {
    test('should validate complete images config', () => {
      const config = {
        images: {
          width: 50,
          height: 50,
          spacing: 5,
          padding: 10,
          margin: 15
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should reject negative spacing', () => {
      const config = {
        images: {
          spacing: -5
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('spacing'))).toBe(true);
    });
  });

  describe('animation section validation', () => {
    test('should validate animation config', () => {
      const config = {
        animation: {
          type: 'fade',
          duration: 500,
          delay: 100
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid animation type', () => {
      const config = {
        animation: {
          type: 'slide'
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('animation.type'))).toBe(true);
    });

    test('should validate perCharacter boolean true', () => {
      const config = {
        animation: {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: true
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should validate perCharacter boolean false', () => {
      const config = {
        animation: {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: false
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid perCharacter type (string)', () => {
      const config = {
        animation: {
          perCharacter: 'true'
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('perCharacter') && e.includes('expected boolean'))).toBe(true);
    });

    test('should reject invalid perCharacter type (number)', () => {
      const config = {
        animation: {
          perCharacter: 1
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('perCharacter') && e.includes('expected boolean'))).toBe(true);
    });

    test('should validate complete animation config with perCharacter', () => {
      const config = {
        animation: {
          type: 'fade',
          duration: 1000,
          delay: 200,
          perCharacter: true
        }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Config Loader', () => {
  describe('deepMerge', () => {
    test('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    test('should merge nested objects', () => {
      const target = { a: { x: 1, y: 2 }, b: 3 };
      const source = { a: { y: 5, z: 6 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: { x: 1, y: 5, z: 6 }, b: 3 });
    });

    test('should not modify original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
    });

    test('should handle null source', () => {
      const target = { a: 1 };
      const result = deepMerge(target, null);
      expect(result).toEqual({ a: 1 });
    });

    test('should handle undefined source', () => {
      const target = { a: 1 };
      const result = deepMerge(target, undefined);
      expect(result).toEqual({ a: 1 });
    });

    test('should handle array source (return target)', () => {
      const target = { a: 1 };
      const result = deepMerge(target, [1, 2, 3]);
      expect(result).toEqual({ a: 1 });
    });

    test('should override array values in target with source', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };
      const result = deepMerge(target, source);
      expect(result).toEqual({ arr: [4, 5] });
    });

    test('should deeply merge nested config', () => {
      const target = {
        text: {
          font: 'Default',
          fontSize: 50,
          dropshadow: {
            enabled: false,
            color: '#000',
            blur: 0
          }
        }
      };
      const source = {
        text: {
          color: 'red',
          dropshadow: {
            enabled: true,
            blur: 5
          }
        }
      };
      const result = deepMerge(target, source);
      expect(result).toEqual({
        text: {
          font: 'Default',
          fontSize: 50,
          color: 'red',
          dropshadow: {
            enabled: true,
            color: '#000',
            blur: 5
          }
        }
      });
    });
  });

  describe('loadConfigFile', () => {
    const testConfigDir = path.join(__dirname, 'fixtures');
    const validConfigPath = path.join(testConfigDir, 'valid-config.json');
    const invalidJsonPath = path.join(testConfigDir, 'invalid-json.json');

    beforeAll(() => {
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }
      fs.writeFileSync(validConfigPath, JSON.stringify({
        text: { fontSize: 30 }
      }));
      fs.writeFileSync(invalidJsonPath, '{ invalid json }');
    });

    afterAll(() => {
      if (fs.existsSync(validConfigPath)) fs.unlinkSync(validConfigPath);
      if (fs.existsSync(invalidJsonPath)) fs.unlinkSync(invalidJsonPath);
      if (fs.existsSync(testConfigDir)) fs.rmdirSync(testConfigDir);
    });

    test('should load valid JSON config file', () => {
      const config = loadConfigFile(validConfigPath);
      expect(config).toEqual({ text: { fontSize: 30 } });
    });

    test('should throw error for non-existent file', () => {
      expect(() => loadConfigFile('./nonexistent.json')).toThrow('Configuration file not found');
    });

    test('should throw error for invalid JSON', () => {
      expect(() => loadConfigFile(invalidJsonPath)).toThrow('Invalid JSON');
    });
  });

  describe('loadDefaults', () => {
    test('should load default configuration', () => {
      const defaults = loadDefaults();
      expect(defaults).toBeDefined();
      expect(defaults.text).toBeDefined();
      expect(defaults.images).toBeDefined();
      expect(defaults.animation).toBeDefined();
    });

    test('should have animation.type set to "none" for backward compatibility', () => {
      const defaults = loadDefaults();
      expect(defaults.animation.type).toBe('none');
    });

    test('should have animation.perCharacter set to false by default', () => {
      const defaults = loadDefaults();
      expect(defaults.animation.perCharacter).toBe(false);
    });

    test('should have complete animation defaults', () => {
      const defaults = loadDefaults();
      expect(defaults.animation).toEqual({
        type: 'none',
        duration: 500,
        delay: 0,
        perCharacter: false
      });
    });
  });

  describe('loadConfig', () => {
    const testConfigDir = path.join(__dirname, 'fixtures');
    const customConfigPath = path.join(testConfigDir, 'custom-config.json');
    const invalidConfigPath = path.join(testConfigDir, 'invalid-config.json');

    beforeAll(() => {
      if (!fs.existsSync(testConfigDir)) {
        fs.mkdirSync(testConfigDir, { recursive: true });
      }
      fs.writeFileSync(customConfigPath, JSON.stringify({
        text: {
          color: 'red',
          fontSize: 30
        }
      }));
      fs.writeFileSync(invalidConfigPath, JSON.stringify({
        text: {
          fontSize: 'not a number'
        }
      }));
    });

    afterAll(() => {
      if (fs.existsSync(customConfigPath)) fs.unlinkSync(customConfigPath);
      if (fs.existsSync(invalidConfigPath)) fs.unlinkSync(invalidConfigPath);
      if (fs.existsSync(testConfigDir)) fs.rmdirSync(testConfigDir);
    });

    test('should return defaults when no config path provided', () => {
      const config = loadConfig();
      const defaults = loadDefaults();
      expect(config).toEqual(defaults);
    });

    test('should merge custom config with defaults', () => {
      const config = loadConfig(customConfigPath);
      expect(config.text.color).toBe('red');
      expect(config.text.fontSize).toBe(30);
      // Should still have default values for unspecified properties
      expect(config.text.font).toBe('THEBOLDFONT');
    });

    test('should throw error for invalid config', () => {
      expect(() => loadConfig(invalidConfigPath)).toThrow('invalid');
    });
  });

  describe('validateConfigObject', () => {
    test('should validate config object', () => {
      const result = validateConfigObject({
        text: { fontSize: 24 }
      });
      expect(result.valid).toBe(true);
    });

    test('should return errors for invalid config', () => {
      const result = validateConfigObject({
        text: { fontSize: 'invalid' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
