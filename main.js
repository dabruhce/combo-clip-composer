const { processComboVideo, trimVideo } = require('./src/video/videoUtils');
const { createDirectory } = require('./src/utils/createDirectory');
const path = require('path');

const inputFile = process.argv[2];
const text = process.argv[3];
const x = Number(process.argv[4]);
const y = Number(process.argv[5]);
const destination = process.argv[6];

// Optional trim parameters
const startTime = process.argv[7];
const startOffset = process.argv[8] ? Number(process.argv[8]) : undefined;
const endTime = process.argv[9];
const endOffset = process.argv[10] ? Number(process.argv[10]) : undefined;

async function run() {
  await createDirectory(destination);

  let videoToProcess = inputFile;

  // If trim parameters are provided, trim the video first
  if (startTime && endTime) {
    const trimmedDir = path.join(destination, 'trimmed');
    await createDirectory(trimmedDir);

    await trimVideo({
      inputFileLocation: inputFile,
      outputFileDestination: trimmedDir,
      startTime,
      startOffset: startOffset || 0,
      endTime,
      endOffset: endOffset || 0
    });

    videoToProcess = path.join(trimmedDir, path.basename(inputFile));
  }

  await processComboVideo(videoToProcess, text, x, y, destination);
}

run();
