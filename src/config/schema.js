/**
 * Configuration schema definition for Combo Clip Composer
 * Defines the structure and validation rules for text, images, and animation settings
 */

const configSchema = {
  text: {
    type: 'object',
    properties: {
      font: { type: 'string', description: 'Font family name' },
      fontPath: { type: 'string', description: 'Path to custom font file (optional)' },
      fontSize: { type: 'number', minimum: 1, description: 'Font size in pixels' },
      color: { type: 'string', description: 'Text color (hex, named, or rgba)' },
      position: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X position in pixels' },
          y: { type: 'number', description: 'Y position in pixels' }
        },
        required: ['x', 'y']
      },
      dropshadow: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'Whether dropshadow is enabled' },
          color: { type: 'string', description: 'Shadow color' },
          blur: { type: 'number', minimum: 0, description: 'Shadow blur radius' },
          offsetX: { type: 'number', description: 'Horizontal shadow offset' },
          offsetY: { type: 'number', description: 'Vertical shadow offset' }
        },
        required: ['enabled']
      }
    }
  },
  images: {
    type: 'object',
    properties: {
      width: { type: 'number', minimum: 1, description: 'Image width in pixels' },
      height: { type: 'number', minimum: 1, description: 'Image height in pixels' },
      spacing: { type: 'number', minimum: 0, description: 'Gap between individual input images' },
      padding: { type: 'number', minimum: 0, description: 'Space between images and blurred background edge' },
      margin: { type: 'number', minimum: 0, description: 'Space between overlay and video frame edge' }
    }
  },
  animation: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['none', 'fade'], description: 'Animation type' },
      duration: { type: 'number', minimum: 0, description: 'Animation duration in milliseconds' },
      delay: { type: 'number', minimum: 0, description: 'Delay before animation starts in milliseconds' },
      perCharacter: { type: 'boolean', description: 'Whether to animate each character separately (staggered effect)' },
      fadeOutStart: { type: 'number', minimum: 0, description: 'When fade-out starts (frame number if > 1, percentage of duration if 0-1)' },
      fadeOutDuration: { type: 'number', minimum: 0, description: 'Fade-out duration in milliseconds (defaults to duration if not set)' }
    }
  },
  timing: {
    type: 'object',
    properties: {
      startFrame: { type: 'number', minimum: 0, description: 'Frame number when overlay appears' },
      endFrame: { type: 'number', minimum: 0, description: 'Frame number when overlay disappears (0 = end of video)' }
    }
  }
};

/**
 * Validates a value against a schema property definition
 * @param {*} value - The value to validate
 * @param {object} schema - The schema definition for the property
 * @param {string} path - The property path (for error messages)
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateProperty(value, schema, path) {
  const errors = [];

  if (value === undefined || value === null) {
    return errors;
  }

  // Type validation
  if (schema.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
      return errors;
    }

    // Validate nested properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propErrors = validateProperty(value[propName], propSchema, `${path}.${propName}`);
        errors.push(...propErrors);
      }
    }

    // Check required properties
    if (schema.required) {
      for (const reqProp of schema.required) {
        if (value[reqProp] === undefined || value[reqProp] === null) {
          errors.push(`${path}.${reqProp}: required property is missing`);
        }
      }
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${path}: expected string, got ${typeof value}`);
    } else if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: value must be one of [${schema.enum.join(', ')}], got "${value}"`);
    }
  } else if (schema.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${path}: expected number, got ${typeof value}`);
    } else {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: value must be >= ${schema.minimum}, got ${value}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: value must be <= ${schema.maximum}, got ${value}`);
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${path}: expected boolean, got ${typeof value}`);
    }
  }

  return errors;
}

/**
 * Validates a configuration object against the schema
 * @param {object} config - The configuration object to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
function validateConfig(config) {
  const errors = [];

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return {
      valid: false,
      errors: ['Configuration must be an object']
    };
  }

  // Validate each top-level section
  for (const [sectionName, sectionSchema] of Object.entries(configSchema)) {
    if (config[sectionName] !== undefined) {
      const sectionErrors = validateProperty(config[sectionName], sectionSchema, sectionName);
      errors.push(...sectionErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  configSchema,
  validateConfig,
  validateProperty
};
