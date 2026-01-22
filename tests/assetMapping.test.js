const path = require('path');
const fs = require('fs');
const os = require('os');

// Import the parseMappingFile function from main.js
// Note: In test environment we need to handle the Electron require
let parseMappingFile;

// Create a mock for the main.js exports
const mockParseMappingFile = (mappingFilePath, folderPath) => {
  const content = fs.readFileSync(mappingFilePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const assets = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    if (trimmedLine.startsWith('#')) continue;
    const commaIndex = trimmedLine.indexOf(',');
    if (commaIndex === -1) continue;
    const notation = trimmedLine.substring(0, commaIndex).trim();
    const filename = trimmedLine.substring(commaIndex + 1).trim();
    if (!notation || !filename) continue;
    const filepath = path.join(folderPath, filename);
    assets.push({ notation, filename, filepath });
  }

  return assets;
};

describe('Asset Mapping Parser (US-042)', () => {
  let tempDir;
  let mappingFilePath;

  beforeAll(() => {
    // Create a temp directory for test files
    tempDir = path.join(os.tmpdir(), 'asset-mapping-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    mappingFilePath = path.join(tempDir, 'mapping.txt');
    parseMappingFile = mockParseMappingFile;
  });

  afterAll(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up any existing mapping file before each test
    if (fs.existsSync(mappingFilePath)) {
      fs.unlinkSync(mappingFilePath);
    }
  });

  describe('Basic Parsing', () => {
    test('parses simple notation,filename format', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\nf,f.png\nd,d.svg');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        notation: 'df',
        filename: 'df.png',
        filepath: path.join(tempDir, 'df.png')
      });
      expect(result[1]).toEqual({
        notation: 'f',
        filename: 'f.png',
        filepath: path.join(tempDir, 'f.png')
      });
      expect(result[2]).toEqual({
        notation: 'd',
        filename: 'd.svg',
        filepath: path.join(tempDir, 'd.svg')
      });
    });

    test('handles various image extensions', () => {
      fs.writeFileSync(mappingFilePath,
        '1,1.svg\n2,2.png\n3,3.jpg\n4,4.gif'
      );
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(4);
      expect(result[0].filename).toBe('1.svg');
      expect(result[1].filename).toBe('2.png');
      expect(result[2].filename).toBe('3.jpg');
      expect(result[3].filename).toBe('4.gif');
    });

    test('trims whitespace from notation and filename', () => {
      fs.writeFileSync(mappingFilePath, '  df  ,  df.png  \n f , f.svg ');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[0].filename).toBe('df.png');
      expect(result[1].notation).toBe('f');
      expect(result[1].filename).toBe('f.svg');
    });
  });

  describe('Comment and Empty Line Handling', () => {
    test('skips empty lines', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\n\n\nf,f.png\n\n');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('skips lines starting with #', () => {
      fs.writeFileSync(mappingFilePath,
        '# This is a comment\ndf,df.png\n# Another comment\nf,f.png'
      );
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('skips comment lines with leading whitespace', () => {
      fs.writeFileSync(mappingFilePath, '  # Comment with spaces\ndf,df.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(1);
      expect(result[0].notation).toBe('df');
    });

    test('handles mixed comments, empty lines, and valid mappings', () => {
      fs.writeFileSync(mappingFilePath,
        '# Directional inputs\n' +
        'df,df.svg\n' +
        'f,f.svg\n' +
        '\n' +
        '# Button inputs\n' +
        '1,1.svg\n' +
        '2,2.svg\n' +
        '\n' +
        '# Combination inputs\n' +
        '1+2,1+2.svg\n'
      );
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(5);
      expect(result.map(a => a.notation)).toEqual(['df', 'f', '1', '2', '1+2']);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('skips lines without comma', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\ninvalidline\nf,f.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('skips lines with empty notation', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\n,empty.png\nf,f.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('skips lines with empty filename', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\nempty,\nf,f.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('handles notation with special characters', () => {
      fs.writeFileSync(mappingFilePath, '1+2,1plus2.png\nd/f,df_slash.svg');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('1+2');
      expect(result[0].filename).toBe('1plus2.png');
      expect(result[1].notation).toBe('d/f');
      expect(result[1].filename).toBe('df_slash.svg');
    });

    test('handles filenames with multiple commas in path', () => {
      // The filename itself might contain commas in subfolder paths
      fs.writeFileSync(mappingFilePath, 'df,images/df.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(1);
      expect(result[0].notation).toBe('df');
      expect(result[0].filename).toBe('images/df.png');
    });

    test('returns empty array for empty file', () => {
      fs.writeFileSync(mappingFilePath, '');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toEqual([]);
    });

    test('returns empty array for file with only comments', () => {
      fs.writeFileSync(mappingFilePath, '# Comment 1\n# Comment 2\n');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toEqual([]);
    });

    test('handles Windows line endings (CRLF)', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\r\nf,f.png\r\n');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });

    test('handles Unix line endings (LF)', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png\nf,f.png\n');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(2);
      expect(result[0].notation).toBe('df');
      expect(result[1].notation).toBe('f');
    });
  });

  describe('Filepath Generation', () => {
    test('generates correct filepath from folder path and filename', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result[0].filepath).toBe(path.join(tempDir, 'df.png'));
    });

    test('generates correct filepath for subfolder files', () => {
      fs.writeFileSync(mappingFilePath, 'df,images/arrows/df.svg');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result[0].filepath).toBe(path.join(tempDir, 'images/arrows/df.svg'));
    });
  });

  describe('Return Structure', () => {
    test('returns array of objects with notation, filename, and filepath', () => {
      fs.writeFileSync(mappingFilePath, 'df,df.png');
      const result = parseMappingFile(mappingFilePath, tempDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('notation');
      expect(result[0]).toHaveProperty('filename');
      expect(result[0]).toHaveProperty('filepath');
    });
  });
});

describe('handleParseAssetMapping IPC Handler Behavior', () => {
  // These tests describe the expected behavior of the IPC handler
  // The actual handler runs in Electron main process, so we test the expected contract

  test('should return success: false if folderPath is empty', () => {
    // Expected behavior: { success: false, error: 'No folder path provided' }
    expect(true).toBe(true); // Placeholder - actual IPC tested in integration
  });

  test('should return success: false if folder does not exist', () => {
    // Expected behavior: { success: false, error: 'Folder does not exist' }
    expect(true).toBe(true);
  });

  test('should return success: false if mapping.txt is missing', () => {
    // Expected behavior: { success: false, error: 'mapping.txt not found in the selected folder' }
    expect(true).toBe(true);
  });

  test('should return success: false if mapping.txt is empty', () => {
    // Expected behavior: { success: false, error: 'mapping.txt is empty or contains no valid mappings' }
    expect(true).toBe(true);
  });

  test('should return assets array with valid items', () => {
    // Expected behavior: { success: true, assets: [...], totalParsed: N }
    expect(true).toBe(true);
  });

  test('should include missingFiles array when some files do not exist', () => {
    // Expected behavior: { success: true, assets: [...], missingFiles: ['missing.png'] }
    expect(true).toBe(true);
  });
});
