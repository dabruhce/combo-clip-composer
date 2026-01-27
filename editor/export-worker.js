/**
 * Export worker script - runs video processing in a separate Node.js process
 * This avoids Electron's Node.js version mismatch with native canvas module
 */

const path = require('path');
const fs = require('fs');

// Change to project root directory
process.chdir(path.join(__dirname, '..'));

// Get arguments from command line
const args = JSON.parse(process.argv[2]);
const {
  videoPath,
  comboText,
  xOffset,
  yOffset,
  jobDir,
  assetDirs,
  imageWidth,
  imageHeight,
  configPath,
  outputPath
} = args;

async function runExport() {
  try {
    const { processComboVideo } = require('../src/video/videoUtils');

    console.error('Starting video processing...');
    console.error('Input video:', videoPath);

    const result = await processComboVideo(
      videoPath,
      comboText,
      xOffset,
      yOffset,
      jobDir,
      assetDirs,
      imageWidth,
      imageHeight,
      configPath
    );

    console.error('Result file:', result);

    if (result && fs.existsSync(result)) {
      // Copy to output path
      console.error('Copying to:', outputPath);
      fs.copyFileSync(result, outputPath);
      console.log(JSON.stringify({ success: true, outputPath }));
    } else {
      console.log(JSON.stringify({ success: false, error: 'Video processing did not produce output' }));
    }
  } catch (error) {
    console.error('Export error:', error);
    console.log(JSON.stringify({ success: false, error: error.message }));
  }
}

runExport();
