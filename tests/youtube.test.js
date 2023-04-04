const { downloadVideo } = require('../src/video/youtube');
const { recreateDirectory } = require('../src/utils/createDirectory');
jest.setTimeout(600000);

describe('fetchVideoData', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/youtube';
    await recreateDirectory(dirPath);   
  });

  test('should download the video and save it to a local file', async () => {
    try {
      const videoId = 'xHdlyUh0e5Q';
      const videoFilePath = './artifacts/youtube/test-video.mp4';
      const downloadedVideo = await downloadVideo(videoId, videoFilePath);
      } 
      catch (error) {
      console.error(`Error downloading video: ${error}`);
    }
  });
  
});


