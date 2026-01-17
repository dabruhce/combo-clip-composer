/**
 * Configuration loader for Combo Clip Composer
 * Loads, validates, and merges configuration from JSON files
 */

const fs = require('fs');
const path = require('path');
const { validateConfig } = require('./schema');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../config/defaults.json');

/**
 * Deep merges two objects, with source values overriding target values
 * @param {object} target - The target object (defaults)
 * @param {object} source - The source object (overrides)
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }

  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Both are objects, merge recursively
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // Source has a value, use it
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Loads a JSON configuration file from disk
 * @param {string} configPath - Path to the JSON config file
 * @returns {object} Parsed configuration object
 * @throws {Error} If file cannot be read or parsed
 */
function loadConfigFile(configPath) {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Configuration file not found: ${absolutePath}`);
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file ${absolutePath}: ${err.message}`);
    }
    throw new Error(`Failed to read configuration file ${absolutePath}: ${err.message}`);
  }
}

/**
 * Loads default configuration from config/defaults.json
 * @returns {object} Default configuration object
 * @throws {Error} If defaults file cannot be loaded
 */
function loadDefaults() {
  return loadConfigFile(DEFAULT_CONFIG_PATH);
}

/**
 * Loads and validates a configuration file, merging with defaults
 * @param {string} [configPath] - Path to job-specific config file (optional)
 * @returns {object} Merged and validated configuration
 * @throws {Error} If validation fails or files cannot be loaded
 */
function loadConfig(configPath) {
  // Load defaults
  const defaults = loadDefaults();

  // If no job config provided, just return validated defaults
  if (!configPath) {
    const validation = validateConfig(defaults);
    if (!validation.valid) {
      throw new Error(`Default configuration is invalid:\n${validation.errors.join('\n')}`);
    }
    return defaults;
  }

  // Load job-specific config
  const jobConfig = loadConfigFile(configPath);

  // Validate job config before merging
  const jobValidation = validateConfig(jobConfig);
  if (!jobValidation.valid) {
    throw new Error(`Job configuration is invalid:\n${jobValidation.errors.join('\n')}`);
  }

  // Merge job config with defaults
  const mergedConfig = deepMerge(defaults, jobConfig);

  // Validate merged config
  const mergedValidation = validateConfig(mergedConfig);
  if (!mergedValidation.valid) {
    throw new Error(`Merged configuration is invalid:\n${mergedValidation.errors.join('\n')}`);
  }

  return mergedConfig;
}

/**
 * Validates a configuration object without loading from file
 * Useful for testing or programmatic config creation
 * @param {object} config - Configuration object to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
function validateConfigObject(config) {
  return validateConfig(config);
}

module.exports = {
  loadConfig,
  loadDefaults,
  loadConfigFile,
  deepMerge,
  validateConfigObject,
  DEFAULT_CONFIG_PATH
};
