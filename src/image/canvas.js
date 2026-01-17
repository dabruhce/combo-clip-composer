const { createCanvas, registerFont, loadImage, Image } = require('canvas');
const path = require('path');
const fs = require('fs');

// Track registered fonts to avoid duplicate registration
const registeredFonts = new Set();

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
      const color = textConfig.color || 'yellow';

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

  module.exports = { createTextCanvasOfSize, estimateTextSize, createTextCanvas, registerCustomFont, isFontRegistered };