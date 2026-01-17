/**
 * Inline Markup Parser for text styling
 * Supports color tags: [red], [#FF0000], [color:red]
 * Supports newline tags: [br], [newline]
 *
 * @module markupParser
 */

/**
 * Named colors supported by the parser (must match canvas.js NAMED_COLORS)
 */
const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'lime', 'navy',
  'teal', 'aqua', 'fuchsia', 'silver', 'maroon', 'olive', 'transparent'
]);

/**
 * Text style tags supported by the parser
 */
const STYLE_TAGS = new Set(['bold', 'italic', 'underline']);

/**
 * Collected warnings from parsing (reset on each parseMarkup call)
 * @type {string[]}
 */
let parsingWarnings = [];

/**
 * Check if a string is a valid color value
 * @param {string} value - Value to check
 * @returns {boolean} - True if valid color
 */
function isValidColor(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim().toLowerCase();

  // Check named colors
  if (NAMED_COLORS.has(trimmed)) {
    return true;
  }

  // Check hex colors (#RGB, #RRGGBB, #RRGGBBAA)
  const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  if (hexPattern.test(value.trim())) {
    return true;
  }

  // Check rgb() format
  const rgbPattern = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
  if (rgbPattern.test(value.trim())) {
    return true;
  }

  // Check rgba() format
  const rgbaPattern = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i;
  if (rgbaPattern.test(value.trim())) {
    return true;
  }

  return false;
}

/**
 * Normalize a color value to a consistent format
 * @param {string} color - Color value to normalize
 * @returns {string} - Normalized color value
 */
function normalizeColor(color) {
  if (!color) return color;
  const trimmed = color.trim();

  // Normalize named colors to lowercase
  if (NAMED_COLORS.has(trimmed.toLowerCase())) {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

/**
 * Parse a tag name to extract its type and value
 * @param {string} tagContent - The content inside the brackets (e.g., "red", "#FF0000", "color:red", "bold")
 * @returns {{ type: string, value: string|null } | null} - Parsed tag info or null if invalid
 */
function parseTagContent(tagContent) {
  if (!tagContent || typeof tagContent !== 'string') {
    return null;
  }

  const trimmed = tagContent.trim();

  // Check for newline tags
  if (trimmed.toLowerCase() === 'br' || trimmed.toLowerCase() === 'newline') {
    return { type: 'newline', value: null };
  }

  // Check for style tags (bold, italic, underline)
  if (STYLE_TAGS.has(trimmed.toLowerCase())) {
    return { type: 'style', value: trimmed.toLowerCase() };
  }

  // Check for explicit color: prefix (e.g., [color:red])
  if (trimmed.toLowerCase().startsWith('color:')) {
    const colorValue = trimmed.substring(6).trim();
    if (isValidColor(colorValue)) {
      return { type: 'color', value: normalizeColor(colorValue) };
    }
    return null;
  }

  // Check for hex color (e.g., [#FF0000])
  if (trimmed.startsWith('#') && isValidColor(trimmed)) {
    return { type: 'color', value: normalizeColor(trimmed) };
  }

  // Check for named color (e.g., [red])
  if (NAMED_COLORS.has(trimmed.toLowerCase())) {
    return { type: 'color', value: trimmed.toLowerCase() };
  }

  // Check for rgb/rgba format
  if (trimmed.toLowerCase().startsWith('rgb')) {
    if (isValidColor(trimmed)) {
      return { type: 'color', value: normalizeColor(trimmed) };
    }
    return null;
  }

  return null;
}

/**
 * Parse markup text into an array of segments with styles
 *
 * @param {string} text - Text with inline markup tags
 * @returns {Array<{ text: string, styles: string[] }>} - Array of text segments with their styles
 *
 * @example
 * parseMarkup("hello [red]world[/red]")
 * // Returns: [{ text: "hello ", styles: [] }, { text: "world", styles: ["red"] }]
 *
 * @example
 * parseMarkup("[bold][red]text[/red][/bold]")
 * // Returns: [{ text: "text", styles: ["bold", "red"] }]
 *
 * @example
 * parseMarkup("line1[br]line2")
 * // Returns: [{ text: "line1", styles: [] }, { text: "\n", styles: [], isNewline: true }, { text: "line2", styles: [] }]
 */
function parseMarkup(text) {
  // Reset warnings on each parse call
  parsingWarnings = [];

  if (!text || typeof text !== 'string') {
    return [];
  }

  if (text === '') {
    return [];
  }

  const segments = [];
  const styleStack = []; // Stack of currently active styles (with their tag names for matching)
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Check for opening or closing tag
    if (text[i] === '[') {
      const closingBracket = text.indexOf(']', i);

      if (closingBracket === -1) {
        // No closing bracket found, treat as literal text
        currentText += text[i];
        i++;
        continue;
      }

      const tagContent = text.substring(i + 1, closingBracket);

      // Check for closing tag (starts with /)
      if (tagContent.startsWith('/')) {
        const closingTagName = tagContent.substring(1).trim().toLowerCase();

        // Pop matching style from stack
        // Find and remove the matching style (handle both named colors, color: prefix, and style tags)
        let foundIndex = -1;
        for (let j = styleStack.length - 1; j >= 0; j--) {
          const stackEntry = styleStack[j];
          const tagName = stackEntry.tagName.toLowerCase();
          const value = stackEntry.value.toLowerCase();

          if (tagName === closingTagName ||
              value === closingTagName ||
              tagName === closingTagName.replace('color:', '') ||
              closingTagName === 'color' && isValidColor(value)) {
            foundIndex = j;
            break;
          }
        }

        // If we found a matching opening tag, treat this as a valid closing tag
        if (foundIndex !== -1) {
          // Check for malformed nesting (closing tag doesn't match the most recent opening tag)
          if (foundIndex !== styleStack.length - 1) {
            // We're closing a tag that isn't the most recent one - malformed nesting
            const expectedTag = styleStack[styleStack.length - 1].tagName;
            parsingWarnings.push(
              `Malformed nesting: closing [/${closingTagName}] but expected [/${expectedTag}]`
            );
          }

          // Save current text segment if any
          if (currentText) {
            segments.push({
              text: currentText,
              styles: styleStack.map(s => s.value)
            });
            currentText = '';
          }
          styleStack.splice(foundIndex, 1);
          i = closingBracket + 1;
          continue;
        }

        // No matching opening tag found - check if this is a valid tag format
        // If so, it's an orphan closing tag (just skip it)
        // If not, treat as literal text
        const parsedClosingTag = parseTagContent(closingTagName);
        if (parsedClosingTag !== null) {
          // Valid tag format but no matching opener - skip the closing tag
          if (currentText) {
            segments.push({
              text: currentText,
              styles: styleStack.map(s => s.value)
            });
            currentText = '';
          }
          i = closingBracket + 1;
          continue;
        }

        // Unknown tag format - treat as literal text
        currentText += text[i];
        i++;
        continue;
      }

      // Parse opening tag
      const parsed = parseTagContent(tagContent);

      if (parsed) {
        // Save current text segment if any
        if (currentText) {
          segments.push({
            text: currentText,
            styles: styleStack.map(s => s.value)
          });
          currentText = '';
        }

        if (parsed.type === 'newline') {
          // Add newline segment
          segments.push({
            text: '\n',
            styles: styleStack.map(s => s.value),
            isNewline: true
          });
        } else if (parsed.type === 'color' || parsed.type === 'style') {
          // Push color or style to stack with tag name for proper matching
          styleStack.push({
            tagName: tagContent.trim().toLowerCase(),
            value: parsed.value
          });
        }

        i = closingBracket + 1;
        continue;
      }

      // Unknown tag, treat as literal text
      currentText += text[i];
      i++;
    } else {
      // Regular character
      currentText += text[i];
      i++;
    }
  }

  // Add remaining text if any
  if (currentText) {
    segments.push({
      text: currentText,
      styles: styleStack.map(s => s.value)
    });
  }

  return segments;
}

/**
 * Get any warnings from the last parseMarkup call
 * @returns {string[]} - Array of warning messages
 */
function getParseWarnings() {
  return [...parsingWarnings];
}

/**
 * Get the active color from a list of styles
 * The last color in the styles array takes precedence
 * @param {string[]} styles - Array of style names
 * @returns {string|null} - Active color or null if no color specified
 */
function getActiveColor(styles) {
  if (!styles || !Array.isArray(styles)) {
    return null;
  }

  // Return the last color in the stack (most recently applied)
  for (let i = styles.length - 1; i >= 0; i--) {
    if (isValidColor(styles[i])) {
      return styles[i];
    }
  }

  return null;
}

module.exports = {
  parseMarkup,
  parseTagContent,
  isValidColor,
  normalizeColor,
  getActiveColor,
  getParseWarnings,
  NAMED_COLORS,
  STYLE_TAGS
};
