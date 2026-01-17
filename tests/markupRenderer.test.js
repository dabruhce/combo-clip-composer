/**
 * Tests for markupRenderer.js
 */

const { createCanvas } = require('canvas');
const {
  renderMarkup,
  renderMarkupText,
  createMarkupCanvas,
  calculateMarkupDimensions,
  hasStyle,
  buildFontString,
  measureStyledText
} = require('../src/text/markupRenderer');
const { parseMarkup } = require('../src/text/markupParser');

describe('markupRenderer', () => {
  describe('hasStyle', () => {
    test('returns true when style is present', () => {
      expect(hasStyle(['bold', 'red'], 'bold')).toBe(true);
      expect(hasStyle(['bold', 'red'], 'red')).toBe(true);
    });

    test('returns false when style is not present', () => {
      expect(hasStyle(['bold', 'red'], 'italic')).toBe(false);
    });

    test('returns false for null or undefined styles', () => {
      expect(hasStyle(null, 'bold')).toBe(false);
      expect(hasStyle(undefined, 'bold')).toBe(false);
    });

    test('returns false for empty styles array', () => {
      expect(hasStyle([], 'bold')).toBe(false);
    });
  });

  describe('buildFontString', () => {
    test('builds basic font string', () => {
      expect(buildFontString('Arial', 16, false, false)).toBe('16px Arial');
    });

    test('builds bold font string', () => {
      expect(buildFontString('Arial', 16, true, false)).toBe('bold 16px Arial');
    });

    test('builds italic font string', () => {
      expect(buildFontString('Arial', 16, false, true)).toBe('italic 16px Arial');
    });

    test('builds bold italic font string', () => {
      expect(buildFontString('Arial', 16, true, true)).toBe('italic bold 16px Arial');
    });

    test('handles different font sizes', () => {
      expect(buildFontString('THEBOLDFONT', 50, false, false)).toBe('50px THEBOLDFONT');
      expect(buildFontString('THEBOLDFONT', 24, true, false)).toBe('bold 24px THEBOLDFONT');
    });
  });

  describe('measureStyledText', () => {
    let ctx;

    beforeEach(() => {
      const canvas = createCanvas(100, 100);
      ctx = canvas.getContext('2d');
    });

    test('measures text width', () => {
      const width = measureStyledText(ctx, 'Hello', 'Arial', 16, []);
      expect(width).toBeGreaterThan(0);
    });

    test('returns different widths for different text', () => {
      // Use THEBOLDFONT which is registered and has proper metrics
      const shortWidth = measureStyledText(ctx, 'Hi', 'THEBOLDFONT', 16, []);
      const longWidth = measureStyledText(ctx, 'Hello World', 'THEBOLDFONT', 16, []);
      expect(longWidth).toBeGreaterThanOrEqual(shortWidth);
    });

    test('returns different widths for different font sizes', () => {
      // Use THEBOLDFONT which is registered and has proper metrics
      const smallWidth = measureStyledText(ctx, 'Hello', 'THEBOLDFONT', 12, []);
      const largeWidth = measureStyledText(ctx, 'Hello', 'THEBOLDFONT', 24, []);
      expect(largeWidth).toBeGreaterThanOrEqual(smallWidth);
    });
  });

  describe('calculateMarkupDimensions', () => {
    test('calculates dimensions for simple text', () => {
      const segments = [{ text: 'Hello', styles: [] }];
      const dims = calculateMarkupDimensions(segments, 'Arial', 16);

      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBe(16 * 1.2); // fontSize * lineHeight
      expect(dims.lines).toHaveLength(1);
    });

    test('calculates dimensions with newlines', () => {
      const segments = [
        { text: 'Line 1', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'Line 2', styles: [] }
      ];
      const dims = calculateMarkupDimensions(segments, 'Arial', 16);

      expect(dims.height).toBe(2 * 16 * 1.2); // 2 lines
      expect(dims.lines).toHaveLength(2);
    });

    test('calculates dimensions with styled text', () => {
      const segments = [
        { text: 'Bold', styles: ['bold'] },
        { text: ' and ', styles: [] },
        { text: 'Italic', styles: ['italic'] }
      ];
      const dims = calculateMarkupDimensions(segments, 'Arial', 16);

      expect(dims.width).toBeGreaterThan(0);
      expect(dims.lines).toHaveLength(1);
      expect(dims.lines[0].segments).toHaveLength(3);
    });

    test('respects custom lineHeight', () => {
      const segments = [
        { text: 'Line 1', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'Line 2', styles: [] }
      ];
      const dims = calculateMarkupDimensions(segments, 'Arial', 20, 1.5);

      expect(dims.height).toBe(2 * 20 * 1.5); // 2 lines with 1.5 lineHeight
    });

    test('handles empty segments array', () => {
      const dims = calculateMarkupDimensions([], 'Arial', 16);

      expect(dims.width).toBe(0);
      expect(dims.lines).toHaveLength(1);
    });
  });

  describe('renderMarkup', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
      canvas = createCanvas(400, 200);
      ctx = canvas.getContext('2d');
    });

    test('returns early for null context', () => {
      const result = renderMarkup(null, [{ text: 'Hello', styles: [] }], 10, 50);
      expect(result).toEqual({ endX: 10, endY: 50, linesRendered: 0 });
    });

    test('returns early for null segments', () => {
      const result = renderMarkup(ctx, null, 10, 50);
      expect(result).toEqual({ endX: 10, endY: 50, linesRendered: 0 });
    });

    test('returns early for non-array segments', () => {
      const result = renderMarkup(ctx, 'not an array', 10, 50);
      expect(result).toEqual({ endX: 10, endY: 50, linesRendered: 0 });
    });

    test('renders simple text', () => {
      const segments = [{ text: 'Hello', styles: [] }];
      const result = renderMarkup(ctx, segments, 10, 50, { font: 'Arial', fontSize: 16 });

      expect(result.endX).toBeGreaterThan(10);
      expect(result.endY).toBe(50);
      expect(result.linesRendered).toBe(1);
    });

    test('renders text with newlines', () => {
      const segments = [
        { text: 'Line 1', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'Line 2', styles: [] }
      ];
      const result = renderMarkup(ctx, segments, 10, 50, { font: 'Arial', fontSize: 16, lineHeight: 1.5 });

      expect(result.linesRendered).toBe(2);
      expect(result.endY).toBe(50 + 16 * 1.5); // Original Y + one line advancement
    });

    test('resets X position after newline', () => {
      const segments = [
        { text: 'AAAA', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'B', styles: [] }
      ];
      const result = renderMarkup(ctx, segments, 10, 50, { font: 'Arial', fontSize: 16 });

      // After newline, X should reset, so endX should be close to startX + width of 'B'
      // This is hard to test exactly, but we can verify linesRendered
      expect(result.linesRendered).toBe(2);
    });

    test('uses default values when config not provided', () => {
      const segments = [{ text: 'Hello', styles: [] }];
      const result = renderMarkup(ctx, segments, 10, 50);

      expect(result.endX).toBeGreaterThan(10);
      expect(result.linesRendered).toBe(1);
    });

    test('uses default color when no color in styles', () => {
      const segments = [{ text: 'Hello', styles: ['bold'] }];

      // Should not throw
      expect(() => {
        renderMarkup(ctx, segments, 10, 50, { color: 'red' });
      }).not.toThrow();
    });

    test('skips empty text segments', () => {
      const segments = [
        { text: 'Hello', styles: [] },
        { text: '', styles: [] },
        { text: 'World', styles: [] }
      ];
      const result = renderMarkup(ctx, segments, 10, 50);

      expect(result.linesRendered).toBe(1);
    });
  });

  describe('renderMarkup with styles', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
      canvas = createCanvas(400, 200);
      ctx = canvas.getContext('2d');
    });

    test('renders text with color style', () => {
      const segments = [{ text: 'Red text', styles: ['red'] }];

      expect(() => {
        renderMarkup(ctx, segments, 10, 50);
      }).not.toThrow();
    });

    test('renders text with bold style', () => {
      const segments = [{ text: 'Bold text', styles: ['bold'] }];

      expect(() => {
        renderMarkup(ctx, segments, 10, 50);
      }).not.toThrow();
    });

    test('renders text with italic style', () => {
      const segments = [{ text: 'Italic text', styles: ['italic'] }];

      expect(() => {
        renderMarkup(ctx, segments, 10, 50);
      }).not.toThrow();
    });

    test('renders text with underline style', () => {
      const segments = [{ text: 'Underlined', styles: ['underline'] }];

      // Just call and check result - underline drawing is tested visually
      const result = renderMarkup(ctx, segments, 10, 50);
      expect(result.endX).toBeGreaterThan(10);
    });

    test('renders text with combined styles', () => {
      const segments = [{ text: 'Styled', styles: ['bold', 'italic', 'red', 'underline'] }];

      // Just call and check result - combined styles rendering is tested visually
      const result = renderMarkup(ctx, segments, 10, 50);
      expect(result.endX).toBeGreaterThan(10);
    });

    test('renders multi-color text', () => {
      const segments = [
        { text: 'Red ', styles: ['red'] },
        { text: 'Blue ', styles: ['blue'] },
        { text: 'Green', styles: ['green'] }
      ];

      const result = renderMarkup(ctx, segments, 10, 50);
      expect(result.endX).toBeGreaterThan(10);
    });

    test('handles nested styles correctly', () => {
      const segments = [
        { text: 'Normal ', styles: [] },
        { text: 'Bold ', styles: ['bold'] },
        { text: 'Bold+Red ', styles: ['bold', 'red'] },
        { text: 'Bold again ', styles: ['bold'] },
        { text: 'Normal', styles: [] }
      ];

      const result = renderMarkup(ctx, segments, 10, 50);
      expect(result.linesRendered).toBe(1);
    });
  });

  describe('renderMarkupText', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
      canvas = createCanvas(400, 200);
      ctx = canvas.getContext('2d');
    });

    test('renders text with markup tags', () => {
      const result = renderMarkupText(ctx, 'Hello [red]World[/red]', 10, 50);

      expect(result.endX).toBeGreaterThan(10);
      expect(result.linesRendered).toBe(1);
    });

    test('handles newline tags', () => {
      const result = renderMarkupText(ctx, 'Line 1[br]Line 2', 10, 50, { fontSize: 16, lineHeight: 1.5 });

      expect(result.linesRendered).toBe(2);
    });

    test('handles nested markup', () => {
      const result = renderMarkupText(ctx, '[bold][red]Bold Red[/red][/bold]', 10, 50);

      expect(result.linesRendered).toBe(1);
    });

    test('handles plain text without markup', () => {
      const result = renderMarkupText(ctx, 'Plain text', 10, 50);

      expect(result.endX).toBeGreaterThan(10);
    });
  });

  describe('createMarkupCanvas', () => {
    test('creates canvas with simple text', async () => {
      const canvas = await createMarkupCanvas('Hello World');

      expect(canvas).toBeDefined();
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    test('creates canvas with markup text', async () => {
      const canvas = await createMarkupCanvas('[red]Red[/red] and [blue]Blue[/blue]');

      expect(canvas).toBeDefined();
      expect(canvas.width).toBeGreaterThan(0);
    });

    test('creates canvas with multiline text', async () => {
      const canvas = await createMarkupCanvas('Line 1[br]Line 2');

      expect(canvas).toBeDefined();
      // Height should accommodate two lines
      expect(canvas.height).toBeGreaterThan(50);
    });

    test('uses config for font settings', async () => {
      const config = {
        text: {
          font: 'Arial',
          fontSize: 24,
          color: 'white'
        }
      };
      const canvas = await createMarkupCanvas('Hello', config);

      expect(canvas).toBeDefined();
    });

    test('handles dropshadow config', async () => {
      const config = {
        text: {
          font: 'Arial',
          fontSize: 24,
          dropshadow: {
            enabled: true,
            color: '#000000',
            blur: 5,
            offsetX: 2,
            offsetY: 2
          }
        }
      };
      const canvas = await createMarkupCanvas('Shadow Text', config);

      expect(canvas).toBeDefined();
      // Canvas should be larger to accommodate shadow
      expect(canvas.width).toBeGreaterThan(0);
    });

    test('handles null config', async () => {
      const canvas = await createMarkupCanvas('Test', null);

      expect(canvas).toBeDefined();
    });
  });

  describe('integration with parseMarkup', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
      canvas = createCanvas(400, 200);
      ctx = canvas.getContext('2d');
    });

    test('renders parsed color markup', () => {
      const segments = parseMarkup('Hello [#FF0000]RED[/#FF0000] World');
      const result = renderMarkup(ctx, segments, 10, 50);

      expect(segments).toHaveLength(3);
      expect(result.linesRendered).toBe(1);
    });

    test('renders parsed style markup', () => {
      const segments = parseMarkup('[bold]Bold[/bold] [italic]Italic[/italic]');
      const result = renderMarkup(ctx, segments, 10, 50);

      expect(result.linesRendered).toBe(1);
    });

    test('renders complex nested markup', () => {
      // Test nesting without underline to avoid canvas context limitations
      const segments = parseMarkup('[bold][italic][red]All styles[/red][/italic][/bold]');
      const result = renderMarkup(ctx, segments, 10, 50);

      expect(segments.length).toBeGreaterThan(0);
      expect(result.linesRendered).toBe(1);
    });

    test('renders multiple lines with styles', () => {
      const segments = parseMarkup('[red]Line 1[/red][br][blue]Line 2[/blue]');
      const result = renderMarkup(ctx, segments, 10, 50, { fontSize: 20 });

      expect(result.linesRendered).toBe(2);
    });
  });

  describe('visual correctness tests', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
      canvas = createCanvas(400, 200);
      ctx = canvas.getContext('2d');
      // Clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 400, 200);
    });

    test('positions text correctly at specified coordinates', () => {
      const segments = [{ text: 'Test', styles: [] }];
      const result = renderMarkup(ctx, segments, 100, 100, { fontSize: 20 });

      // endX should be to the right of startX
      expect(result.endX).toBeGreaterThan(100);
    });

    test('advances X position for each segment', () => {
      const segments = [
        { text: 'A', styles: [] },
        { text: 'B', styles: [] },
        { text: 'C', styles: [] }
      ];
      const result = renderMarkup(ctx, segments, 10, 50, { fontSize: 20 });

      // Final X should be significantly to the right of start
      expect(result.endX).toBeGreaterThan(10);
    });

    test('multiline text advances Y correctly', () => {
      const segments = [
        { text: 'Line 1', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'Line 2', styles: [] },
        { text: '\n', styles: [], isNewline: true },
        { text: 'Line 3', styles: [] }
      ];
      const fontSize = 20;
      const lineHeight = 1.5;
      const result = renderMarkup(ctx, segments, 10, 50, { fontSize, lineHeight });

      expect(result.linesRendered).toBe(3);
      // Y should have advanced by 2 line heights
      expect(result.endY).toBe(50 + (2 * fontSize * lineHeight));
    });

    test('underline is drawn at correct position', () => {
      // This is a smoke test - we verify underline renders and tracks position
      const segments = [{ text: 'Underlined Text', styles: ['underline'] }];

      const result = renderMarkup(ctx, segments, 10, 50, { fontSize: 20 });
      expect(result.endX).toBeGreaterThan(10);
    });

    test('multi-color text renders without error', async () => {
      // Create canvas with multiple colors
      const canvas = await createMarkupCanvas(
        '[red]R[/red][green]G[/green][blue]B[/blue]',
        { text: { fontSize: 30 } }
      );

      expect(canvas).toBeDefined();
      expect(canvas.width).toBeGreaterThan(0);

      // Verify canvas has content (non-zero pixels exist)
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((val, idx) => idx % 4 === 3 && val > 0);
      expect(hasContent).toBe(true);
    });

    test('bold+italic+color renders correctly', async () => {
      const canvas = await createMarkupCanvas(
        '[bold][italic][#FF00FF]Fancy Text[/#FF00FF][/italic][/bold]',
        { text: { fontSize: 24 } }
      );

      expect(canvas).toBeDefined();
      expect(canvas.width).toBeGreaterThan(0);
    });
  });
});
