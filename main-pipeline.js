const { processComboVideo } = require('./src/video/videoUtils');
const { downloadHighestQualityVideo } = require('./src/video/youtube');

const videoId = process.argv[2];
const downloadDestinationVideo = process.argv[3];
const downloadDestinationAudio = process.argv[4];
const finalFile = process.argv[5];
const text = process.argv[6];
const x = parseInt(process.argv[7]);
const y = parseInt(process.argv[8]);

async function run(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile, text, x, y) {
  await downloadHighestQualityVideo(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile);
  const inputFile = finalFile;

  await processComboVideo(inputFile, text, x, y, './artifacts/pipeline/');
}

run(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile, text, x, y).catch(console.error);
