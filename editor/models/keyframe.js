/**
 * Keyframe Data Model
 *
 * Provides classes for managing keyframes and keyframe tracks for animation
 * properties that change over time.
 */

/**
 * Supported interpolation types for keyframe transitions
 */
const INTERPOLATION_TYPES = {
  LINEAR: 'linear',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  STEP: 'step'
};

/**
 * Represents a single keyframe at a specific frame number
 */
class Keyframe {
  /**
   * Creates a new Keyframe
   * @param {number} frame - The frame number (0-indexed)
   * @param {string} property - The property name this keyframe affects
   * @param {*} value - The value at this keyframe
   * @param {string} interpolation - Interpolation type to next keyframe (default: 'linear')
   */
  constructor(frame, property, value, interpolation = INTERPOLATION_TYPES.LINEAR) {
    if (typeof frame !== 'number' || frame < 0 || !Number.isInteger(frame)) {
      throw new Error('Frame must be a non-negative integer');
    }
    if (typeof property !== 'string' || property.trim() === '') {
      throw new Error('Property must be a non-empty string');
    }
    if (!Object.values(INTERPOLATION_TYPES).includes(interpolation)) {
      throw new Error(`Invalid interpolation type: ${interpolation}. Must be one of: ${Object.values(INTERPOLATION_TYPES).join(', ')}`);
    }

    this.frame = frame;
    this.property = property;
    this.value = value;
    this.interpolation = interpolation;
  }

  /**
   * Creates a copy of this keyframe
   * @returns {Keyframe} A new Keyframe instance with the same values
   */
  clone() {
    return new Keyframe(this.frame, this.property, this.value, this.interpolation);
  }

  /**
   * Converts the keyframe to a plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      frame: this.frame,
      property: this.property,
      value: this.value,
      interpolation: this.interpolation
    };
  }

  /**
   * Creates a Keyframe from a plain object
   * @param {Object} obj - Plain object with keyframe data
   * @returns {Keyframe} New Keyframe instance
   */
  static fromJSON(obj) {
    return new Keyframe(obj.frame, obj.property, obj.value, obj.interpolation);
  }
}

/**
 * Represents a track of keyframes for a single property
 */
class KeyframeTrack {
  /**
   * Creates a new KeyframeTrack
   * @param {string} property - The property name this track controls
   */
  constructor(property) {
    if (typeof property !== 'string' || property.trim() === '') {
      throw new Error('Property must be a non-empty string');
    }

    this.property = property;
    this.keyframes = [];
  }

  /**
   * Adds a keyframe to the track, maintaining sorted order by frame number
   * If a keyframe at the same frame already exists, it is replaced
   * @param {Keyframe} keyframe - The keyframe to add
   * @returns {KeyframeTrack} This track for chaining
   */
  addKeyframe(keyframe) {
    if (!(keyframe instanceof Keyframe)) {
      throw new Error('Must add a Keyframe instance');
    }
    if (keyframe.property !== this.property) {
      throw new Error(`Keyframe property "${keyframe.property}" does not match track property "${this.property}"`);
    }

    // Remove existing keyframe at same frame if present
    this.removeKeyframeAt(keyframe.frame);

    // Insert in sorted order
    const insertIndex = this.keyframes.findIndex(kf => kf.frame > keyframe.frame);
    if (insertIndex === -1) {
      this.keyframes.push(keyframe);
    } else {
      this.keyframes.splice(insertIndex, 0, keyframe);
    }

    return this;
  }

  /**
   * Removes the keyframe at the specified frame
   * @param {number} frame - Frame number
   * @returns {Keyframe|null} The removed keyframe, or null if none existed
   */
  removeKeyframeAt(frame) {
    const index = this.keyframes.findIndex(kf => kf.frame === frame);
    if (index === -1) {
      return null;
    }
    return this.keyframes.splice(index, 1)[0];
  }

  /**
   * Gets the keyframe at the specified frame
   * @param {number} frame - Frame number
   * @returns {Keyframe|null} The keyframe at this frame, or null if none exists
   */
  getKeyframeAt(frame) {
    return this.keyframes.find(kf => kf.frame === frame) || null;
  }

  /**
   * Gets the keyframe before or at the specified frame
   * @param {number} frame - Frame number
   * @returns {Keyframe|null} The keyframe, or null if none exists before this frame
   */
  getKeyframeBefore(frame) {
    for (let i = this.keyframes.length - 1; i >= 0; i--) {
      if (this.keyframes[i].frame <= frame) {
        return this.keyframes[i];
      }
    }
    return null;
  }

  /**
   * Gets the keyframe after the specified frame
   * @param {number} frame - Frame number
   * @returns {Keyframe|null} The keyframe, or null if none exists after this frame
   */
  getKeyframeAfter(frame) {
    return this.keyframes.find(kf => kf.frame > frame) || null;
  }

  /**
   * Gets the surrounding keyframes for interpolation
   * @param {number} frame - Frame number
   * @returns {{before: Keyframe|null, after: Keyframe|null}} The surrounding keyframes
   */
  getSurroundingKeyframes(frame) {
    return {
      before: this.getKeyframeBefore(frame),
      after: this.getKeyframeAfter(frame)
    };
  }

  /**
   * Gets the interpolated value at the specified frame
   * @param {number} frame - Frame number
   * @returns {*} The interpolated value, or null if no keyframes exist
   */
  getValueAt(frame) {
    if (this.keyframes.length === 0) {
      return null;
    }

    // Check for exact keyframe
    const exactKeyframe = this.getKeyframeAt(frame);
    if (exactKeyframe) {
      return exactKeyframe.value;
    }

    const { before, after } = this.getSurroundingKeyframes(frame);

    // If no keyframe before, use first keyframe value
    if (!before) {
      return this.keyframes[0].value;
    }

    // If no keyframe after, use last keyframe value (before)
    if (!after) {
      return before.value;
    }

    // Interpolate between before and after
    return interpolate(before.value, after.value, before.frame, after.frame, frame, before.interpolation);
  }

  /**
   * Moves a keyframe from one frame to another
   * @param {number} fromFrame - Source frame number
   * @param {number} toFrame - Target frame number
   * @returns {boolean} True if the keyframe was moved, false if source didn't exist
   */
  moveKeyframe(fromFrame, toFrame) {
    const keyframe = this.removeKeyframeAt(fromFrame);
    if (!keyframe) {
      return false;
    }

    // Create new keyframe at target frame with same value and interpolation
    const newKeyframe = new Keyframe(toFrame, this.property, keyframe.value, keyframe.interpolation);
    this.addKeyframe(newKeyframe);
    return true;
  }

  /**
   * Gets the number of keyframes in this track
   * @returns {number} Number of keyframes
   */
  get length() {
    return this.keyframes.length;
  }

  /**
   * Checks if the track has any keyframes
   * @returns {boolean} True if track has keyframes
   */
  isEmpty() {
    return this.keyframes.length === 0;
  }

  /**
   * Gets all frame numbers that have keyframes
   * @returns {number[]} Array of frame numbers
   */
  getKeyframeFrames() {
    return this.keyframes.map(kf => kf.frame);
  }

  /**
   * Converts the track to a plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      property: this.property,
      keyframes: this.keyframes.map(kf => kf.toJSON())
    };
  }

  /**
   * Creates a KeyframeTrack from a plain object
   * @param {Object} obj - Plain object with track data
   * @returns {KeyframeTrack} New KeyframeTrack instance
   */
  static fromJSON(obj) {
    const track = new KeyframeTrack(obj.property);
    for (const kfData of obj.keyframes) {
      track.addKeyframe(Keyframe.fromJSON(kfData));
    }
    return track;
  }
}

/**
 * Interpolates between two values based on interpolation type
 * @param {number} startValue - Value at start keyframe
 * @param {number} endValue - Value at end keyframe
 * @param {number} startFrame - Start frame number
 * @param {number} endFrame - End frame number
 * @param {number} currentFrame - Current frame to calculate value for
 * @param {string} interpolationType - Type of interpolation
 * @returns {number} Interpolated value
 */
function interpolate(startValue, endValue, startFrame, endFrame, currentFrame, interpolationType) {
  // Handle non-numeric values (use step interpolation)
  if (typeof startValue !== 'number' || typeof endValue !== 'number') {
    return startValue;
  }

  const range = endFrame - startFrame;
  if (range === 0) {
    return startValue;
  }

  // Calculate normalized time t (0 to 1)
  let t = (currentFrame - startFrame) / range;
  t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

  // Apply easing based on interpolation type
  switch (interpolationType) {
    case INTERPOLATION_TYPES.LINEAR:
      // t stays as is
      break;

    case INTERPOLATION_TYPES.EASE_IN:
      // Quadratic ease in: t^2
      t = t * t;
      break;

    case INTERPOLATION_TYPES.EASE_OUT:
      // Quadratic ease out: 1 - (1-t)^2
      t = 1 - (1 - t) * (1 - t);
      break;

    case INTERPOLATION_TYPES.EASE_IN_OUT:
      // Cubic ease in-out
      t = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      break;

    case INTERPOLATION_TYPES.STEP:
      // No interpolation, use start value until end frame
      return startValue;

    default:
      // Default to linear
      break;
  }

  // Linear interpolation with eased t
  return startValue + (endValue - startValue) * t;
}

/**
 * Manages multiple keyframe tracks for a complete animation
 */
class KeyframeManager {
  constructor() {
    this.tracks = new Map();
  }

  /**
   * Gets or creates a track for the specified property
   * @param {string} property - Property name
   * @returns {KeyframeTrack} The track for this property
   */
  getTrack(property) {
    if (!this.tracks.has(property)) {
      this.tracks.set(property, new KeyframeTrack(property));
    }
    return this.tracks.get(property);
  }

  /**
   * Adds a keyframe to the appropriate track
   * @param {number} frame - Frame number
   * @param {string} property - Property name
   * @param {*} value - Value at this keyframe
   * @param {string} interpolation - Interpolation type
   * @returns {Keyframe} The created keyframe
   */
  addKeyframe(frame, property, value, interpolation = INTERPOLATION_TYPES.LINEAR) {
    const keyframe = new Keyframe(frame, property, value, interpolation);
    this.getTrack(property).addKeyframe(keyframe);
    return keyframe;
  }

  /**
   * Removes a keyframe at the specified frame and property
   * @param {number} frame - Frame number
   * @param {string} property - Property name
   * @returns {Keyframe|null} The removed keyframe, or null
   */
  removeKeyframe(frame, property) {
    const track = this.tracks.get(property);
    if (!track) {
      return null;
    }
    return track.removeKeyframeAt(frame);
  }

  /**
   * Gets the value of a property at the specified frame
   * @param {number} frame - Frame number
   * @param {string} property - Property name
   * @returns {*} The interpolated value, or null if no keyframes
   */
  getValueAt(frame, property) {
    const track = this.tracks.get(property);
    if (!track) {
      return null;
    }
    return track.getValueAt(frame);
  }

  /**
   * Gets all property values at the specified frame
   * @param {number} frame - Frame number
   * @returns {Object} Object with property names as keys and interpolated values
   */
  getAllValuesAt(frame) {
    const values = {};
    for (const [property, track] of this.tracks) {
      const value = track.getValueAt(frame);
      if (value !== null) {
        values[property] = value;
      }
    }
    return values;
  }

  /**
   * Gets all frame numbers that have any keyframe
   * @returns {number[]} Sorted array of unique frame numbers
   */
  getAllKeyframeFrames() {
    const frames = new Set();
    for (const track of this.tracks.values()) {
      for (const frame of track.getKeyframeFrames()) {
        frames.add(frame);
      }
    }
    return Array.from(frames).sort((a, b) => a - b);
  }

  /**
   * Gets all properties that have keyframe tracks
   * @returns {string[]} Array of property names
   */
  getProperties() {
    return Array.from(this.tracks.keys());
  }

  /**
   * Checks if any tracks have keyframes
   * @returns {boolean} True if at least one track has keyframes
   */
  hasKeyframes() {
    for (const track of this.tracks.values()) {
      if (!track.isEmpty()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Removes all keyframes from all tracks
   */
  clear() {
    this.tracks.clear();
  }

  /**
   * Converts to plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    const tracks = [];
    for (const track of this.tracks.values()) {
      if (!track.isEmpty()) {
        tracks.push(track.toJSON());
      }
    }
    return { tracks };
  }

  /**
   * Creates a KeyframeManager from a plain object
   * @param {Object} obj - Plain object with manager data
   * @returns {KeyframeManager} New KeyframeManager instance
   */
  static fromJSON(obj) {
    const manager = new KeyframeManager();
    if (obj.tracks) {
      for (const trackData of obj.tracks) {
        const track = KeyframeTrack.fromJSON(trackData);
        manager.tracks.set(track.property, track);
      }
    }
    return manager;
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Keyframe,
    KeyframeTrack,
    KeyframeManager,
    interpolate,
    INTERPOLATION_TYPES
  };
}
