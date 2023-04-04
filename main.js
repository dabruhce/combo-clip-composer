const { processComboVideo } = require('./src/video/videoUtils');
const { createDirectory } = require('./src/utils/createDirectory');

const inputFile = process.argv[2];
const text = process.argv[3];
const x = Number(process.argv[4]);
const y = Number(process.argv[5]);
const destination = process.argv[6];

async function run() {
  await createDirectory(destination);
  await processComboVideo(inputFile, text, x, y, destination);
}

run();
