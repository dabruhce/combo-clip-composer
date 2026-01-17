/**
 * Unit tests for the inline markup parser
 */

const {
  parseMarkup,
  parseTagContent,
  isValidColor,
  normalizeColor,
  getActiveColor,
  NAMED_COLORS
} = require('../src/text/markupParser');

describe('markupParser', () => {
  describe('isValidColor', () => {
    test('returns true for named colors', () => {
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('blue')).toBe(true);
      expect(isValidColor('yellow')).toBe(true);
      expect(isValidColor('green')).toBe(true);
    });

    test('returns true for named colors case-insensitive', () => {
      expect(isValidColor('RED')).toBe(true);
      expect(isValidColor('Red')).toBe(true);
      expect(isValidColor('BLUE')).toBe(true);
    });

    test('returns true for hex colors', () => {
      expect(isValidColor('#FF0000')).toBe(true);
      expect(isValidColor('#00ff00')).toBe(true);
      expect(isValidColor('#F00')).toBe(true);
      expect(isValidColor('#AABBCCDD')).toBe(true);
    });

    test('returns true for rgb format', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('rgb(0, 128, 255)')).toBe(true);
    });

    test('returns true for rgba format', () => {
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(isValidColor('rgba(0, 128, 255, 1)')).toBe(true);
    });

    test('returns false for invalid colors', () => {
      expect(isValidColor('notacolor')).toBe(false);
      expect(isValidColor('#GG0000')).toBe(false);
      expect(isValidColor('')).toBe(false);
      expect(isValidColor(null)).toBe(false);
      expect(isValidColor(undefined)).toBe(false);
    });
  });

  describe('normalizeColor', () => {
    test('normalizes named colors to lowercase', () => {
      expect(normalizeColor('RED')).toBe('red');
      expect(normalizeColor('Blue')).toBe('blue');
      expect(normalizeColor('YELLOW')).toBe('yellow');
    });

    test('preserves hex colors', () => {
      expect(normalizeColor('#FF0000')).toBe('#FF0000');
      expect(normalizeColor('#f00')).toBe('#f00');
    });

    test('trims whitespace', () => {
      expect(normalizeColor('  red  ')).toBe('red');
      expect(normalizeColor(' #FF0000 ')).toBe('#FF0000');
    });

    test('handles null/undefined', () => {
      expect(normalizeColor(null)).toBe(null);
      expect(normalizeColor(undefined)).toBe(undefined);
    });
  });

  describe('parseTagContent', () => {
    test('parses named color tags', () => {
      expect(parseTagContent('red')).toEqual({ type: 'color', value: 'red' });
      expect(parseTagContent('blue')).toEqual({ type: 'color', value: 'blue' });
      expect(parseTagContent('yellow')).toEqual({ type: 'color', value: 'yellow' });
    });

    test('parses hex color tags', () => {
      expect(parseTagContent('#FF0000')).toEqual({ type: 'color', value: '#FF0000' });
      expect(parseTagContent('#00ff00')).toEqual({ type: 'color', value: '#00ff00' });
      expect(parseTagContent('#F00')).toEqual({ type: 'color', value: '#F00' });
    });

    test('parses color: prefix tags', () => {
      expect(parseTagContent('color:red')).toEqual({ type: 'color', value: 'red' });
      expect(parseTagContent('color:#FF0000')).toEqual({ type: 'color', value: '#FF0000' });
      expect(parseTagContent('color: blue')).toEqual({ type: 'color', value: 'blue' });
    });

    test('parses rgb/rgba color tags', () => {
      expect(parseTagContent('rgb(255, 0, 0)')).toEqual({ type: 'color', value: 'rgb(255, 0, 0)' });
      expect(parseTagContent('rgba(255, 0, 0, 0.5)')).toEqual({ type: 'color', value: 'rgba(255, 0, 0, 0.5)' });
    });

    test('parses newline tags', () => {
      expect(parseTagContent('br')).toEqual({ type: 'newline', value: null });
      expect(parseTagContent('BR')).toEqual({ type: 'newline', value: null });
      expect(parseTagContent('newline')).toEqual({ type: 'newline', value: null });
      expect(parseTagContent('NEWLINE')).toEqual({ type: 'newline', value: null });
    });

    test('returns null for invalid tags', () => {
      expect(parseTagContent('notacolor')).toBe(null);
      expect(parseTagContent('bold')).toBe(null); // Not supported in this phase
      expect(parseTagContent('')).toBe(null);
      expect(parseTagContent(null)).toBe(null);
    });
  });

  describe('parseMarkup', () => {
    describe('basic parsing', () => {
      test('parses plain text without tags', () => {
        const result = parseMarkup('hello world');
        expect(result).toEqual([
          { text: 'hello world', styles: [] }
        ]);
      });

      test('parses empty string', () => {
        expect(parseMarkup('')).toEqual([]);
      });

      test('handles null/undefined', () => {
        expect(parseMarkup(null)).toEqual([]);
        expect(parseMarkup(undefined)).toEqual([]);
      });
    });

    describe('color tags', () => {
      test('parses simple color tag', () => {
        const result = parseMarkup('[red]hello[/red]');
        expect(result).toEqual([
          { text: 'hello', styles: ['red'] }
        ]);
      });

      test('parses text before and after color tag', () => {
        const result = parseMarkup('hello [red]world[/red] test');
        expect(result).toEqual([
          { text: 'hello ', styles: [] },
          { text: 'world', styles: ['red'] },
          { text: ' test', styles: [] }
        ]);
      });

      test('parses hex color tag', () => {
        const result = parseMarkup('[#FF0000]red text[/#FF0000]');
        expect(result).toEqual([
          { text: 'red text', styles: ['#FF0000'] }
        ]);
      });

      test('parses color: prefix tag', () => {
        const result = parseMarkup('[color:blue]blue text[/color:blue]');
        expect(result).toEqual([
          { text: 'blue text', styles: ['blue'] }
        ]);
      });

      test('parses rgb color tag', () => {
        const result = parseMarkup('[rgb(255, 0, 0)]red text[/rgb(255, 0, 0)]');
        expect(result).toEqual([
          { text: 'red text', styles: ['rgb(255, 0, 0)'] }
        ]);
      });

      test('parses multiple different color tags', () => {
        const result = parseMarkup('[red]first[/red] and [blue]second[/blue]');
        expect(result).toEqual([
          { text: 'first', styles: ['red'] },
          { text: ' and ', styles: [] },
          { text: 'second', styles: ['blue'] }
        ]);
      });
    });

    describe('newline tags', () => {
      test('parses [br] tag', () => {
        const result = parseMarkup('line1[br]line2');
        expect(result).toEqual([
          { text: 'line1', styles: [] },
          { text: '\n', styles: [], isNewline: true },
          { text: 'line2', styles: [] }
        ]);
      });

      test('parses [newline] tag', () => {
        const result = parseMarkup('line1[newline]line2');
        expect(result).toEqual([
          { text: 'line1', styles: [] },
          { text: '\n', styles: [], isNewline: true },
          { text: 'line2', styles: [] }
        ]);
      });

      test('parses multiple newline tags', () => {
        const result = parseMarkup('a[br]b[br]c');
        expect(result).toEqual([
          { text: 'a', styles: [] },
          { text: '\n', styles: [], isNewline: true },
          { text: 'b', styles: [] },
          { text: '\n', styles: [], isNewline: true },
          { text: 'c', styles: [] }
        ]);
      });

      test('newline preserves active styles', () => {
        const result = parseMarkup('[red]line1[br]line2[/red]');
        expect(result).toEqual([
          { text: 'line1', styles: ['red'] },
          { text: '\n', styles: ['red'], isNewline: true },
          { text: 'line2', styles: ['red'] }
        ]);
      });
    });

    describe('edge cases', () => {
      test('handles unclosed tags', () => {
        const result = parseMarkup('[red]hello');
        expect(result).toEqual([
          { text: 'hello', styles: ['red'] }
        ]);
      });

      test('handles unmatched closing tags', () => {
        const result = parseMarkup('hello[/red] world');
        expect(result).toEqual([
          { text: 'hello', styles: [] },
          { text: ' world', styles: [] }
        ]);
      });

      test('handles unknown tags as literal text', () => {
        const result = parseMarkup('[unknown]hello[/unknown]');
        expect(result).toEqual([
          { text: '[unknown]hello[/unknown]', styles: [] }
        ]);
      });

      test('handles incomplete bracket as literal text', () => {
        const result = parseMarkup('hello [world');
        expect(result).toEqual([
          { text: 'hello [world', styles: [] }
        ]);
      });

      test('handles empty tags', () => {
        const result = parseMarkup('[]hello');
        expect(result).toEqual([
          { text: '[]hello', styles: [] }
        ]);
      });

      test('handles consecutive tags', () => {
        const result = parseMarkup('[red][blue]text[/blue][/red]');
        expect(result).toEqual([
          { text: 'text', styles: ['red', 'blue'] }
        ]);
      });
    });

    describe('complex examples', () => {
      test('parses combo notation example', () => {
        const result = parseMarkup('[yellow]qcf[/yellow] + [red]P[/red]');
        expect(result).toEqual([
          { text: 'qcf', styles: ['yellow'] },
          { text: ' + ', styles: [] },
          { text: 'P', styles: ['red'] }
        ]);
      });

      test('parses multiline colored text', () => {
        const result = parseMarkup('[red]Combo 1[/red][br][blue]Combo 2[/blue]');
        expect(result).toEqual([
          { text: 'Combo 1', styles: ['red'] },
          { text: '\n', styles: [], isNewline: true },
          { text: 'Combo 2', styles: ['blue'] }
        ]);
      });
    });
  });

  describe('getActiveColor', () => {
    test('returns last color in styles array', () => {
      expect(getActiveColor(['red', 'blue'])).toBe('blue');
      expect(getActiveColor(['red'])).toBe('red');
    });

    test('returns null for empty styles', () => {
      expect(getActiveColor([])).toBe(null);
      expect(getActiveColor(null)).toBe(null);
      expect(getActiveColor(undefined)).toBe(null);
    });

    test('returns last valid color', () => {
      expect(getActiveColor(['#FF0000'])).toBe('#FF0000');
      expect(getActiveColor(['red', '#00FF00', 'blue'])).toBe('blue');
    });
  });

  describe('NAMED_COLORS', () => {
    test('contains expected colors', () => {
      expect(NAMED_COLORS.has('red')).toBe(true);
      expect(NAMED_COLORS.has('blue')).toBe(true);
      expect(NAMED_COLORS.has('green')).toBe(true);
      expect(NAMED_COLORS.has('yellow')).toBe(true);
      expect(NAMED_COLORS.has('white')).toBe(true);
      expect(NAMED_COLORS.has('black')).toBe(true);
    });

    test('does not contain invalid colors', () => {
      expect(NAMED_COLORS.has('notacolor')).toBe(false);
      expect(NAMED_COLORS.has('rainbow')).toBe(false);
    });
  });
});
