/**
 * Unit tests for Keyframe data model
 */

const {
  Keyframe,
  KeyframeTrack,
  KeyframeManager,
  interpolate,
  INTERPOLATION_TYPES
} = require('../editor/models/keyframe.js');

describe('INTERPOLATION_TYPES', () => {
  test('should have all required interpolation types', () => {
    expect(INTERPOLATION_TYPES.LINEAR).toBe('linear');
    expect(INTERPOLATION_TYPES.EASE_IN).toBe('ease-in');
    expect(INTERPOLATION_TYPES.EASE_OUT).toBe('ease-out');
    expect(INTERPOLATION_TYPES.EASE_IN_OUT).toBe('ease-in-out');
    expect(INTERPOLATION_TYPES.STEP).toBe('step');
  });
});

describe('Keyframe', () => {
  describe('constructor', () => {
    test('should create a keyframe with valid parameters', () => {
      const kf = new Keyframe(10, 'position.x', 100);
      expect(kf.frame).toBe(10);
      expect(kf.property).toBe('position.x');
      expect(kf.value).toBe(100);
      expect(kf.interpolation).toBe('linear');
    });

    test('should accept custom interpolation type', () => {
      const kf = new Keyframe(10, 'opacity', 0.5, 'ease-in');
      expect(kf.interpolation).toBe('ease-in');
    });

    test('should throw error for negative frame', () => {
      expect(() => new Keyframe(-1, 'prop', 100)).toThrow('Frame must be a non-negative integer');
    });

    test('should throw error for non-integer frame', () => {
      expect(() => new Keyframe(1.5, 'prop', 100)).toThrow('Frame must be a non-negative integer');
    });

    test('should throw error for non-number frame', () => {
      expect(() => new Keyframe('10', 'prop', 100)).toThrow('Frame must be a non-negative integer');
    });

    test('should throw error for empty property', () => {
      expect(() => new Keyframe(10, '', 100)).toThrow('Property must be a non-empty string');
    });

    test('should throw error for non-string property', () => {
      expect(() => new Keyframe(10, 123, 100)).toThrow('Property must be a non-empty string');
    });

    test('should throw error for invalid interpolation type', () => {
      expect(() => new Keyframe(10, 'prop', 100, 'invalid')).toThrow('Invalid interpolation type');
    });

    test('should allow frame 0', () => {
      const kf = new Keyframe(0, 'prop', 100);
      expect(kf.frame).toBe(0);
    });

    test('should allow any value type', () => {
      const kf1 = new Keyframe(0, 'prop', 'string value');
      expect(kf1.value).toBe('string value');

      const kf2 = new Keyframe(0, 'prop', { x: 1, y: 2 });
      expect(kf2.value).toEqual({ x: 1, y: 2 });

      const kf3 = new Keyframe(0, 'prop', [1, 2, 3]);
      expect(kf3.value).toEqual([1, 2, 3]);
    });
  });

  describe('clone', () => {
    test('should create an independent copy', () => {
      const original = new Keyframe(10, 'position.x', 100, 'ease-out');
      const clone = original.clone();

      expect(clone.frame).toBe(original.frame);
      expect(clone.property).toBe(original.property);
      expect(clone.value).toBe(original.value);
      expect(clone.interpolation).toBe(original.interpolation);
      expect(clone).not.toBe(original);
    });
  });

  describe('toJSON / fromJSON', () => {
    test('should serialize and deserialize correctly', () => {
      const original = new Keyframe(10, 'opacity', 0.75, 'ease-in-out');
      const json = original.toJSON();
      const restored = Keyframe.fromJSON(json);

      expect(restored.frame).toBe(10);
      expect(restored.property).toBe('opacity');
      expect(restored.value).toBe(0.75);
      expect(restored.interpolation).toBe('ease-in-out');
    });

    test('toJSON should return plain object', () => {
      const kf = new Keyframe(5, 'scale', 2);
      const json = kf.toJSON();

      expect(json).toEqual({
        frame: 5,
        property: 'scale',
        value: 2,
        interpolation: 'linear'
      });
    });
  });
});

describe('KeyframeTrack', () => {
  describe('constructor', () => {
    test('should create empty track with property name', () => {
      const track = new KeyframeTrack('position.x');
      expect(track.property).toBe('position.x');
      expect(track.keyframes).toEqual([]);
      expect(track.length).toBe(0);
    });

    test('should throw error for empty property', () => {
      expect(() => new KeyframeTrack('')).toThrow('Property must be a non-empty string');
    });
  });

  describe('addKeyframe', () => {
    test('should add keyframes in sorted order', () => {
      const track = new KeyframeTrack('position.x');
      track.addKeyframe(new Keyframe(30, 'position.x', 300));
      track.addKeyframe(new Keyframe(10, 'position.x', 100));
      track.addKeyframe(new Keyframe(20, 'position.x', 200));

      expect(track.keyframes[0].frame).toBe(10);
      expect(track.keyframes[1].frame).toBe(20);
      expect(track.keyframes[2].frame).toBe(30);
    });

    test('should replace keyframe at same frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(10, 'opacity', 0.8));

      expect(track.length).toBe(1);
      expect(track.keyframes[0].value).toBe(0.8);
    });

    test('should throw error for non-Keyframe object', () => {
      const track = new KeyframeTrack('opacity');
      expect(() => track.addKeyframe({ frame: 10, value: 0.5 })).toThrow('Must add a Keyframe instance');
    });

    test('should throw error for mismatched property', () => {
      const track = new KeyframeTrack('opacity');
      const kf = new Keyframe(10, 'position.x', 100);
      expect(() => track.addKeyframe(kf)).toThrow('does not match track property');
    });

    test('should return track for chaining', () => {
      const track = new KeyframeTrack('opacity');
      const result = track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      expect(result).toBe(track);
    });
  });

  describe('removeKeyframeAt', () => {
    test('should remove keyframe at specified frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(20, 'opacity', 1.0));

      const removed = track.removeKeyframeAt(10);
      expect(removed.frame).toBe(10);
      expect(removed.value).toBe(0.5);
      expect(track.length).toBe(1);
    });

    test('should return null if no keyframe at frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      const removed = track.removeKeyframeAt(20);
      expect(removed).toBeNull();
      expect(track.length).toBe(1);
    });
  });

  describe('getKeyframeAt', () => {
    test('should return keyframe at exact frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      const kf = track.getKeyframeAt(10);
      expect(kf.value).toBe(0.5);
    });

    test('should return null if no keyframe at frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      expect(track.getKeyframeAt(20)).toBeNull();
    });
  });

  describe('getKeyframeBefore', () => {
    test('should return keyframe at or before frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      expect(track.getKeyframeBefore(10).frame).toBe(10);
      expect(track.getKeyframeBefore(20).frame).toBe(10);
      expect(track.getKeyframeBefore(30).frame).toBe(30);
    });

    test('should return null if no keyframe before frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      expect(track.getKeyframeBefore(5)).toBeNull();
    });
  });

  describe('getKeyframeAfter', () => {
    test('should return keyframe after frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      expect(track.getKeyframeAfter(10).frame).toBe(30);
      expect(track.getKeyframeAfter(20).frame).toBe(30);
    });

    test('should return null if no keyframe after frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      expect(track.getKeyframeAfter(10)).toBeNull();
      expect(track.getKeyframeAfter(20)).toBeNull();
    });
  });

  describe('getSurroundingKeyframes', () => {
    test('should return before and after keyframes', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      const { before, after } = track.getSurroundingKeyframes(20);
      expect(before.frame).toBe(10);
      expect(after.frame).toBe(30);
    });
  });

  describe('getValueAt', () => {
    test('should return null for empty track', () => {
      const track = new KeyframeTrack('opacity');
      expect(track.getValueAt(10)).toBeNull();
    });

    test('should return exact value at keyframe', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      expect(track.getValueAt(10)).toBe(0.5);
    });

    test('should return first value before first keyframe', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      expect(track.getValueAt(5)).toBe(0.5);
    });

    test('should return last value after last keyframe', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      expect(track.getValueAt(40)).toBe(1.0);
    });

    test('should interpolate value between keyframes', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(0, 'opacity', 0));
      track.addKeyframe(new Keyframe(100, 'opacity', 100));

      expect(track.getValueAt(50)).toBe(50);
      expect(track.getValueAt(25)).toBe(25);
      expect(track.getValueAt(75)).toBe(75);
    });
  });

  describe('moveKeyframe', () => {
    test('should move keyframe to new frame', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));

      const moved = track.moveKeyframe(10, 20);
      expect(moved).toBe(true);
      expect(track.getKeyframeAt(10)).toBeNull();
      expect(track.getKeyframeAt(20).value).toBe(0.5);
    });

    test('should return false if source frame has no keyframe', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));

      const moved = track.moveKeyframe(20, 30);
      expect(moved).toBe(false);
    });

    test('should preserve interpolation type when moving', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5, 'ease-out'));

      track.moveKeyframe(10, 20);
      expect(track.getKeyframeAt(20).interpolation).toBe('ease-out');
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty track', () => {
      const track = new KeyframeTrack('opacity');
      expect(track.isEmpty()).toBe(true);
    });

    test('should return false for track with keyframes', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      expect(track.isEmpty()).toBe(false);
    });
  });

  describe('getKeyframeFrames', () => {
    test('should return array of frame numbers', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0));
      track.addKeyframe(new Keyframe(20, 'opacity', 0.75));

      expect(track.getKeyframeFrames()).toEqual([10, 20, 30]);
    });
  });

  describe('toJSON / fromJSON', () => {
    test('should serialize and deserialize correctly', () => {
      const track = new KeyframeTrack('opacity');
      track.addKeyframe(new Keyframe(10, 'opacity', 0.5, 'ease-in'));
      track.addKeyframe(new Keyframe(30, 'opacity', 1.0, 'ease-out'));

      const json = track.toJSON();
      const restored = KeyframeTrack.fromJSON(json);

      expect(restored.property).toBe('opacity');
      expect(restored.length).toBe(2);
      expect(restored.keyframes[0].value).toBe(0.5);
      expect(restored.keyframes[1].value).toBe(1.0);
    });
  });
});

describe('interpolate', () => {
  describe('linear interpolation', () => {
    test('should interpolate linearly', () => {
      expect(interpolate(0, 100, 0, 100, 50, 'linear')).toBe(50);
      expect(interpolate(0, 100, 0, 100, 25, 'linear')).toBe(25);
      expect(interpolate(0, 100, 0, 100, 75, 'linear')).toBe(75);
    });

    test('should clamp to start value before range', () => {
      expect(interpolate(0, 100, 10, 20, 5, 'linear')).toBe(0);
    });

    test('should clamp to end value after range', () => {
      expect(interpolate(0, 100, 10, 20, 25, 'linear')).toBe(100);
    });
  });

  describe('ease-in interpolation', () => {
    test('should start slow and speed up', () => {
      const midpoint = interpolate(0, 100, 0, 100, 50, 'ease-in');
      expect(midpoint).toBeLessThan(50); // ease-in is slower at the start
    });

    test('should reach exact values at endpoints', () => {
      expect(interpolate(0, 100, 0, 100, 0, 'ease-in')).toBe(0);
      expect(interpolate(0, 100, 0, 100, 100, 'ease-in')).toBe(100);
    });
  });

  describe('ease-out interpolation', () => {
    test('should start fast and slow down', () => {
      const midpoint = interpolate(0, 100, 0, 100, 50, 'ease-out');
      expect(midpoint).toBeGreaterThan(50); // ease-out is faster at the start
    });

    test('should reach exact values at endpoints', () => {
      expect(interpolate(0, 100, 0, 100, 0, 'ease-out')).toBe(0);
      expect(interpolate(0, 100, 0, 100, 100, 'ease-out')).toBe(100);
    });
  });

  describe('ease-in-out interpolation', () => {
    test('should be smooth at midpoint', () => {
      const midpoint = interpolate(0, 100, 0, 100, 50, 'ease-in-out');
      expect(midpoint).toBe(50); // Should be exactly 50 at midpoint
    });

    test('should reach exact values at endpoints', () => {
      expect(interpolate(0, 100, 0, 100, 0, 'ease-in-out')).toBe(0);
      expect(interpolate(0, 100, 0, 100, 100, 'ease-in-out')).toBe(100);
    });
  });

  describe('step interpolation', () => {
    test('should return start value until end frame', () => {
      expect(interpolate(0, 100, 0, 100, 0, 'step')).toBe(0);
      expect(interpolate(0, 100, 0, 100, 50, 'step')).toBe(0);
      expect(interpolate(0, 100, 0, 100, 99, 'step')).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should return start value for zero range', () => {
      expect(interpolate(50, 100, 10, 10, 10, 'linear')).toBe(50);
    });

    test('should return start value for non-numeric values', () => {
      expect(interpolate('hello', 'world', 0, 100, 50, 'linear')).toBe('hello');
    });

    test('should handle negative values', () => {
      expect(interpolate(-100, 100, 0, 100, 50, 'linear')).toBe(0);
    });
  });
});

describe('KeyframeManager', () => {
  describe('getTrack', () => {
    test('should create new track if not exists', () => {
      const manager = new KeyframeManager();
      const track = manager.getTrack('opacity');
      expect(track).toBeInstanceOf(KeyframeTrack);
      expect(track.property).toBe('opacity');
    });

    test('should return existing track', () => {
      const manager = new KeyframeManager();
      const track1 = manager.getTrack('opacity');
      const track2 = manager.getTrack('opacity');
      expect(track1).toBe(track2);
    });
  });

  describe('addKeyframe', () => {
    test('should add keyframe to appropriate track', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      manager.addKeyframe(20, 'opacity', 1.0);
      manager.addKeyframe(10, 'position.x', 100);

      expect(manager.getTrack('opacity').length).toBe(2);
      expect(manager.getTrack('position.x').length).toBe(1);
    });

    test('should return created keyframe', () => {
      const manager = new KeyframeManager();
      const kf = manager.addKeyframe(10, 'opacity', 0.5, 'ease-in');

      expect(kf).toBeInstanceOf(Keyframe);
      expect(kf.value).toBe(0.5);
      expect(kf.interpolation).toBe('ease-in');
    });
  });

  describe('removeKeyframe', () => {
    test('should remove keyframe from track', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      manager.addKeyframe(20, 'opacity', 1.0);

      const removed = manager.removeKeyframe(10, 'opacity');
      expect(removed.value).toBe(0.5);
      expect(manager.getTrack('opacity').length).toBe(1);
    });

    test('should return null for non-existent track', () => {
      const manager = new KeyframeManager();
      expect(manager.removeKeyframe(10, 'opacity')).toBeNull();
    });
  });

  describe('getValueAt', () => {
    test('should return interpolated value', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(0, 'opacity', 0);
      manager.addKeyframe(100, 'opacity', 100);

      expect(manager.getValueAt(50, 'opacity')).toBe(50);
    });

    test('should return null for non-existent track', () => {
      const manager = new KeyframeManager();
      expect(manager.getValueAt(10, 'opacity')).toBeNull();
    });
  });

  describe('getAllValuesAt', () => {
    test('should return all property values at frame', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(0, 'opacity', 0);
      manager.addKeyframe(100, 'opacity', 1);
      manager.addKeyframe(0, 'position.x', 0);
      manager.addKeyframe(100, 'position.x', 200);

      const values = manager.getAllValuesAt(50);
      expect(values.opacity).toBe(0.5);
      expect(values['position.x']).toBe(100);
    });
  });

  describe('getAllKeyframeFrames', () => {
    test('should return sorted unique frame numbers', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      manager.addKeyframe(30, 'opacity', 1.0);
      manager.addKeyframe(10, 'position.x', 100);
      manager.addKeyframe(20, 'position.x', 200);

      const frames = manager.getAllKeyframeFrames();
      expect(frames).toEqual([10, 20, 30]);
    });
  });

  describe('getProperties', () => {
    test('should return all property names', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      manager.addKeyframe(10, 'position.x', 100);
      manager.addKeyframe(10, 'scale', 1);

      const props = manager.getProperties();
      expect(props).toContain('opacity');
      expect(props).toContain('position.x');
      expect(props).toContain('scale');
    });
  });

  describe('hasKeyframes', () => {
    test('should return false for empty manager', () => {
      const manager = new KeyframeManager();
      expect(manager.hasKeyframes()).toBe(false);
    });

    test('should return true when keyframes exist', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      expect(manager.hasKeyframes()).toBe(true);
    });
  });

  describe('clear', () => {
    test('should remove all tracks', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(10, 'opacity', 0.5);
      manager.addKeyframe(10, 'position.x', 100);

      manager.clear();
      expect(manager.hasKeyframes()).toBe(false);
      expect(manager.getProperties()).toEqual([]);
    });
  });

  describe('toJSON / fromJSON', () => {
    test('should serialize and deserialize correctly', () => {
      const manager = new KeyframeManager();
      manager.addKeyframe(0, 'opacity', 0, 'linear');
      manager.addKeyframe(100, 'opacity', 1, 'ease-out');
      manager.addKeyframe(0, 'position.x', 0);
      manager.addKeyframe(100, 'position.x', 200);

      const json = manager.toJSON();
      const restored = KeyframeManager.fromJSON(json);

      expect(restored.getProperties().sort()).toEqual(['opacity', 'position.x']);
      expect(restored.getValueAt(50, 'opacity')).toBeCloseTo(0.5, 1);
      expect(restored.getValueAt(50, 'position.x')).toBe(100);

      // Verify interpolation types are preserved
      expect(restored.getTrack('opacity').getKeyframeAt(0).interpolation).toBe('linear');
      expect(restored.getTrack('opacity').getKeyframeAt(100).interpolation).toBe('ease-out');
    });

    test('should skip empty tracks in serialization', () => {
      const manager = new KeyframeManager();
      manager.getTrack('empty'); // Create empty track
      manager.addKeyframe(10, 'opacity', 0.5);

      const json = manager.toJSON();
      expect(json.tracks.length).toBe(1);
      expect(json.tracks[0].property).toBe('opacity');
    });
  });
});
