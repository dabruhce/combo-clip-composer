const { createCanvas, registerFont, loadImage, Image } = require('canvas');
const path = require('path');
const fs = require('fs');

// Track registered fonts to avoid duplicate registration
const registeredFonts = new Set();

// Named colors supported by canvas (subset of CSS named colors)
const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'lime', 'navy',
  'teal', 'aqua', 'fuchsia', 'silver', 'maroon', 'olive', 'transparent'
]);

/**
 * Validates and parses a color string
 * Supports: hex (#RGB, #RRGGBB, #RRGGBBAA), named colors, and rgba() format
 * @param {string} color - The color string to parse
 * @returns {{ valid: boolean, value: string, error?: string }} - Parse result
 */
function parseColor(color) {
  if (typeof color !== 'string' || color.trim() === '') {
    return { valid: false, value: null, error: 'Color must be a non-empty string' };
  }

  const trimmedColor = color.trim().toLowerCase();

  // Check for named colors
  if (NAMED_COLORS.has(trimmedColor)) {
    return { valid: true, value: trimmedColor };
  }

  // Check for hex colors (#RGB, #RRGGBB, #RRGGBBAA)
  const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  if (hexPattern.test(color.trim())) {
    return { valid: true, value: color.trim() };
  }

  // Check for rgb() format: rgb(r, g, b)
  const rgbPattern = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
  const rgbMatch = color.trim().match(rgbPattern);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    if (parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255) {
      return { valid: true, value: color.trim() };
    }
    return { valid: false, value: null, error: 'RGB values must be 0-255' };
  }

  // Check for rgba() format: rgba(r, g, b, a)
  const rgbaPattern = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i;
  const rgbaMatch = color.trim().match(rgbaPattern);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    if (parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255 && parseFloat(a) <= 1) {
      return { valid: true, value: color.trim() };
    }
    return { valid: false, value: null, error: 'Invalid RGBA values' };
  }

  return { valid: false, value: null, error: `Unknown color format: "${color}"` };
}

/**
 * Resolves a color value, returning the color if valid or a default color if not
 * @param {string} color - The color to resolve
 * @param {string} defaultColor - Default color to use if invalid (default: 'yellow')
 * @returns {string} - The resolved color value
 */
function resolveColor(color, defaultColor = 'yellow') {
  if (!color) {
    return defaultColor;
  }
  const parsed = parseColor(color);
  return parsed.valid ? parsed.value : defaultColor;
}

// Register the default font
registerFont('./assets/fonts/THEBOLDFONT/THEBOLDFONT.ttf', { family: 'THEBOLDFONT' });
registeredFonts.add('THEBOLDFONT');

/**
 * Register a custom font from a file path
 * @param {string} fontPath - Path to the font file (.ttf, .otf, etc.)
 * @param {string} fontFamily - Font family name to register
 * @returns {boolean} - True if font was registered successfully
 */
function registerCustomFont(fontPath, fontFamily) {
  if (registeredFonts.has(fontFamily)) {
    return true; // Already registered
  }

  // Check if font file exists
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Font file not found: ${fontPath}`);
  }

  registerFont(fontPath, { family: fontFamily });
  registeredFonts.add(fontFamily);
  return true;
}

/**
 * Check if a font is registered
 * @param {string} fontFamily - Font family name to check
 * @returns {boolean} - True if font is registered
 */
function isFontRegistered(fontFamily) {
  return registeredFonts.has(fontFamily);
}

//CANVAS
function estimateTextSize(text, font, fontSize) {
    // Use defaults if not provided
    const resolvedFont = font || 'THEBOLDFONT';
    const resolvedFontSize = fontSize || 50;

    const canvas = createCanvas(1, 1)
    const context = canvas.getContext('2d')

    context.font = `${resolvedFontSize}px ${resolvedFont}`
    const metrics = context.measureText(text)

    return { width: metrics.width, height: resolvedFontSize }
  }

  /**
   * Get position from config with CLI override capability
   * CLI values (cliX, cliY) take precedence over config values
   * @param {object} config - Config object with text.position settings
   * @param {number|null} cliX - CLI override for X position (null to use config)
   * @param {number|null} cliY - CLI override for Y position (null to use config)
   * @returns {{ x: number, y: number }} - Resolved position
   */
  function getPosition(config, cliX = null, cliY = null) {
    const defaultPosition = { x: 10, y: 50 };

    // Get config position or defaults
    const configPosition = config && config.text && config.text.position
      ? config.text.position
      : defaultPosition;

    // CLI overrides take precedence (check for non-null, allowing 0 as valid value)
    const x = cliX !== null ? cliX : (configPosition.x !== undefined ? configPosition.x : defaultPosition.x);
    const y = cliY !== null ? cliY : (configPosition.y !== undefined ? configPosition.y : defaultPosition.y);

    return { x, y };
  }

  /**
   * Create a text canvas with configurable styling
   * @param {string} text - Text to render
   * @param {number} width - Canvas width (optional, auto-calculated from config)
   * @param {number} height - Canvas height (optional, auto-calculated from config)
   * @param {object} config - Optional config object with text styling settings
   * @returns {Promise<Canvas>} - Canvas with rendered text
   */
  async function createTextCanvasOfSize(text, width, height, config = null) {
    return new Promise((resolve, reject) => {
      // Extract text config or use defaults
      const textConfig = config && config.text ? config.text : {};
      const font = textConfig.font || 'THEBOLDFONT';
      const fontSize = textConfig.fontSize || 50;
      const color = resolveColor(textConfig.color, 'yellow');

      const canvasSize = estimateTextSize(text, font, fontSize);

      // Create canvas
      const canvas = createCanvas(canvasSize.width, canvasSize.height);
      const ctx = canvas.getContext('2d');

      // Set global alpha to 0.0 for a fully transparent background
      ctx.globalAlpha = 0.0;

      // Set background color
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Reset global alpha to 1
      ctx.globalAlpha = 1;

      // Set font and color from config
      ctx.font = `${fontSize}px ${font}`;
      ctx.fillStyle = color;

      // Draw text at baseline position (y = fontSize for baseline alignment)
      ctx.fillText(text, 0, fontSize);

      resolve(canvas);
    });
  }

  async function createTextCanvas(text) {
    return new Promise((resolve, reject) => {
      // Create canvas
      const canvas = createCanvas(400, 200);
      const ctx = canvas.getContext('2d');
  
      // Set global alpha to 0.5 for a semi-transparent background
      ctx.globalAlpha = 0.0;
  
      // Set background color
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Reset global alpha to 1
      ctx.globalAlpha = 1;
  
      // Set font and color
      ctx.font = '50px THEBOLDFONT';
      ctx.fillStyle = 'yellow';
  
      // Draw text
      ctx.fillText(text, 10, 50);
  
      // Get PNG buffer from canvas
      const buffer = canvas.toBuffer('image/png');
  
      resolve(buffer);
    });
  }

  module.exports = { createTextCanvasOfSize, estimateTextSize, createTextCanvas, registerCustomFont, isFontRegistered, parseColor, resolveColor, getPosition };