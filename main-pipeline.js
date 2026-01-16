const { processComboVideo, trimVideo } = require('./src/video/videoUtils');
const { downloadHighestQualityVideo } = require('./src/video/youtube');
const { createDirectory } = require('./src/utils/createDirectory');
const path = require('path');

const videoId = process.argv[2];
const downloadDestinationVideo = process.argv[3];
const downloadDestinationAudio = process.argv[4];
const finalFile = process.argv[5];
const text = process.argv[6];
const x = parseInt(process.argv[7]);
const y = parseInt(process.argv[8]);

// Optional trim parameters
const startTime = process.argv[9];
const startOffset = process.argv[10] ? Number(process.argv[10]) : undefined;
const endTime = process.argv[11];
const endOffset = process.argv[12] ? Number(process.argv[12]) : undefined;

async function run(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile, text, x, y) {
  await downloadHighestQualityVideo(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile);
  let inputFile = finalFile;

  // If trim parameters are provided, trim the video first
  if (startTime && endTime) {
    const pipelineDir = './artifacts/pipeline/';
    const trimmedDir = path.join(pipelineDir, 'trimmed');
    await createDirectory(trimmedDir);

    await trimVideo({
      inputFileLocation: finalFile,
      outputFileDestination: trimmedDir,
      startTime,
      startOffset: startOffset || 0,
      endTime,
      endOffset: endOffset || 0
    });

    inputFile = path.join(trimmedDir, path.basename(finalFile));
  }

  await processComboVideo(inputFile, text, x, y, './artifacts/pipeline/');
}

run(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile, text, x, y).catch(console.error);
