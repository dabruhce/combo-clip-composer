/**
 * Markup Renderer for rendering parsed markup segments to canvas
 * Renders text with inline styling (colors, bold, italic, underline)
 *
 * @module markupRenderer
 */

const { createCanvas } = require('canvas');
const { parseMarkup, getActiveColor, STYLE_TAGS } = require('./markupParser');

/**
 * Check if a style is active in the styles array
 * @param {string[]} styles - Array of active styles
 * @param {string} styleName - Style to check for
 * @returns {boolean} - True if style is active
 */
function hasStyle(styles, styleName) {
  if (!styles || !Array.isArray(styles)) {
    return false;
  }
  return styles.includes(styleName);
}

/**
 * Build a font string with styles applied
 * @param {string} baseFont - Base font family
 * @param {number} fontSize - Font size in pixels
 * @param {boolean} isBold - Whether to apply bold
 * @param {boolean} isItalic - Whether to apply italic
 * @returns {string} - CSS font string
 */
function buildFontString(baseFont, fontSize, isBold, isItalic) {
  const parts = [];

  if (isItalic) {
    parts.push('italic');
  }
  if (isBold) {
    parts.push('bold');
  }

  parts.push(`${fontSize}px`);
  parts.push(baseFont);

  return parts.join(' ');
}

/**
 * Measure the width of text with given styles
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to measure
 * @param {string} font - Font family
 * @param {number} fontSize - Font size
 * @param {string[]} styles - Active styles
 * @returns {number} - Width in pixels
 */
function measureStyledText(ctx, text, font, fontSize, styles) {
  const isBold = hasStyle(styles, 'bold');
  const isItalic = hasStyle(styles, 'italic');

  ctx.font = buildFontString(font, fontSize, isBold, isItalic);
  const metrics = ctx.measureText(text);

  return metrics.width;
}

/**
 * Calculate the total dimensions needed for rendered markup
 * @param {Array<{ text: string, styles: string[], isNewline?: boolean }>} segments - Parsed segments
 * @param {string} font - Base font family
 * @param {number} fontSize - Font size in pixels
 * @param {number} lineHeight - Line height multiplier (default 1.2)
 * @returns {{ width: number, height: number, lines: Array<{ width: number, segments: Array }> }} - Dimensions and line info
 */
function calculateMarkupDimensions(segments, font, fontSize, lineHeight = 1.2) {
  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext('2d');

  const actualLineHeight = fontSize * lineHeight;
  const lines = [];
  let currentLine = { width: 0, segments: [] };
  let maxWidth = 0;

  for (const segment of segments) {
    if (segment.isNewline) {
      // End current line, start new one
      maxWidth = Math.max(maxWidth, currentLine.width);
      lines.push(currentLine);
      currentLine = { width: 0, segments: [] };
      continue;
    }

    const segmentWidth = measureStyledText(ctx, segment.text, font, fontSize, segment.styles);
    currentLine.width += segmentWidth;
    currentLine.segments.push({ ...segment, width: segmentWidth });
  }

  // Push last line
  if (currentLine.segments.length > 0 || lines.length === 0) {
    maxWidth = Math.max(maxWidth, currentLine.width);
    lines.push(currentLine);
  }

  return {
    width: maxWidth,
    height: lines.length * actualLineHeight,
    lines
  };
}

/**
 * Render parsed markup segments to a canvas context
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Array<{ text: string, styles: string[], isNewline?: boolean }>} segments - Parsed markup segments
 * @param {number} x - Starting X position
 * @param {number} y - Starting Y position (baseline)
 * @param {object} baseConfig - Base configuration object
 * @param {string} baseConfig.font - Base font family (default: 'THEBOLDFONT')
 * @param {number} baseConfig.fontSize - Base font size (default: 50)
 * @param {string} baseConfig.color - Default text color (default: 'yellow')
 * @param {number} baseConfig.lineHeight - Line height multiplier (default: 1.2)
 * @returns {{ endX: number, endY: number, linesRendered: number }} - Final position info
 */
function renderMarkup(ctx, segments, x, y, baseConfig = {}) {
  if (!ctx || !segments || !Array.isArray(segments)) {
    return { endX: x, endY: y, linesRendered: 0 };
  }

  const font = baseConfig.font || 'THEBOLDFONT';
  const fontSize = baseConfig.fontSize || 50;
  const defaultColor = baseConfig.color || 'yellow';
  const lineHeight = baseConfig.lineHeight || 1.2;

  const actualLineHeight = fontSize * lineHeight;
  let currentX = x;
  let currentY = y;
  let linesRendered = 1;

  for (const segment of segments) {
    // Handle newline
    if (segment.isNewline) {
      currentX = x; // Reset to start X
      currentY += actualLineHeight; // Advance Y
      linesRendered++;
      continue;
    }

    // Skip empty segments
    if (!segment.text) {
      continue;
    }

    // Determine styles
    const styles = segment.styles || [];
    const isBold = hasStyle(styles, 'bold');
    const isItalic = hasStyle(styles, 'italic');
    const isUnderline = hasStyle(styles, 'underline');

    // Determine color (last color in styles takes precedence)
    const activeColor = getActiveColor(styles);
    const color = activeColor || defaultColor;

    // Set font with styles
    ctx.font = buildFontString(font, fontSize, isBold, isItalic);
    ctx.fillStyle = color;

    // Draw text
    ctx.fillText(segment.text, currentX, currentY);

    // Measure the drawn text width
    const textWidth = ctx.measureText(segment.text).width;

    // Draw underline if needed (check for method availability for test environments)
    if (isUnderline && typeof ctx.beginPath === 'function') {
      const underlineY = currentY + fontSize * 0.1; // Slightly below baseline
      const underlineThickness = Math.max(1, fontSize / 20);

      ctx.strokeStyle = color;
      ctx.lineWidth = underlineThickness;
      ctx.beginPath();
      ctx.moveTo(currentX, underlineY);
      ctx.lineTo(currentX + textWidth, underlineY);
      ctx.stroke();
    }

    // Advance X position
    currentX += textWidth;
  }

  return {
    endX: currentX,
    endY: currentY,
    linesRendered
  };
}

/**
 * Render markup text (with tags) directly to a canvas context
 * This is a convenience function that combines parseMarkup and renderMarkup
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {string} text - Text with markup tags
 * @param {number} x - Starting X position
 * @param {number} y - Starting Y position (baseline)
 * @param {object} baseConfig - Base configuration
 * @returns {{ endX: number, endY: number, linesRendered: number }} - Final position info
 */
function renderMarkupText(ctx, text, x, y, baseConfig = {}) {
  const segments = parseMarkup(text);
  return renderMarkup(ctx, segments, x, y, baseConfig);
}

/**
 * Create a canvas with markup text rendered on it
 * Used for integration with existing createTextCanvasOfSize flow
 *
 * @param {string} text - Text with markup tags
 * @param {object} config - Configuration object with text styling settings
 * @returns {Promise<Canvas>} - Canvas with rendered markup text
 */
async function createMarkupCanvas(text, config = null) {
  return new Promise((resolve) => {
    // Extract text config or use defaults
    const textConfig = config && config.text ? config.text : {};
    const font = textConfig.font || 'THEBOLDFONT';
    const fontSize = textConfig.fontSize || 50;
    const color = textConfig.color || 'yellow';
    const lineHeight = textConfig.lineHeight || 1.2;

    // Extract dropshadow config
    const dropshadow = textConfig.dropshadow || {};
    const shadowEnabled = dropshadow.enabled === true;
    const shadowColor = dropshadow.color || '#000000';
    const shadowBlur = typeof dropshadow.blur === 'number' ? dropshadow.blur : 0;
    const shadowOffsetX = typeof dropshadow.offsetX === 'number' ? dropshadow.offsetX : -2;
    const shadowOffsetY = typeof dropshadow.offsetY === 'number' ? dropshadow.offsetY : 3;

    // Parse markup
    const segments = parseMarkup(text);

    // Calculate dimensions needed
    const dimensions = calculateMarkupDimensions(segments, font, fontSize, lineHeight);

    // Add padding for dropshadow if enabled
    const shadowPadding = shadowEnabled
      ? Math.max(Math.abs(shadowOffsetX), Math.abs(shadowOffsetY)) + shadowBlur
      : 0;

    const canvasWidth = dimensions.width + (shadowPadding * 2) + 10; // Extra padding for safety
    const canvasHeight = dimensions.height + (shadowPadding * 2) + fontSize * 0.2; // Extra for underline

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.globalAlpha = 0.0;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    // Apply dropshadow if enabled
    if (shadowEnabled) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
    }

    // Render markup
    const baseConfig = { font, fontSize, color, lineHeight };
    const startX = shadowPadding;
    const startY = shadowPadding + fontSize; // Start at baseline (fontSize from top)

    renderMarkup(ctx, segments, startX, startY, baseConfig);

    // Reset shadow
    if (shadowEnabled) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    resolve(canvas);
  });
}

module.exports = {
  renderMarkup,
  renderMarkupText,
  createMarkupCanvas,
  calculateMarkupDimensions,
  hasStyle,
  buildFontString,
  measureStyledText
};
