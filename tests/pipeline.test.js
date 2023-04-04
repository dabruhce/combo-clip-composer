const { processComboVideo, processVideo } = require('../src/video/videoUtils');
const { recreateDirectory } = require('../src/utils/createDirectory');
const { downloadVideo, downloadHighestQualityVideo, fetchVideoInfo } = require('../src/video/youtube');
const { readFile } = require('../src/utils/readFile');

jest.setTimeout(20000000);

describe('do 2 videos in a row', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/pipeline';
    await recreateDirectory(dirPath); 
    
  });
  
  test('should download high quality, reassemble video, then process as combo video', async () => {

    const videoId = 'xHdlyUh0e5Q';
    await fetchVideoInfo(videoId);
    const downloadDestinationVideo = './artifacts/pipeline/temp-pipeline-video.mp4';
    const downloadDestinationAudio = './artifacts/pipeline/temp-pipeline-audio.aac';
    const finalFile = './artifacts/pipeline/final-pipeline-video.mp4';
    const downloadedVideo = await downloadHighestQualityVideo(videoId, downloadDestinationVideo, downloadDestinationAudio, finalFile);
    const inputFile = finalFile;
    const text = 'd df f 2'
    const x = 100;
    const y = 900;

    await processComboVideo(inputFile, text, x, y, './artifacts/pipeline/');
  });


});
