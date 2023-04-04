const { trimVideo } = require('../src/video/videoUtils');
const { recreateDirectory } = require('../src/utils/createDirectory');
const { v4: uuidv4 } = require('uuid');
jest.setTimeout(600000);


describe('trimVideo function', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/trim';
    await recreateDirectory(dirPath);
    
  });

  test('should trim video successfully', async () => {

    const jobID = uuidv4();
    const jobDirectory = './artifacts/trim/' + jobID;
    await recreateDirectory(jobDirectory)

    const inputFile = './assets/tests/video/video.mp4';

    const data = {
      "inputFileLocation": inputFile,
      "outputFileDestination": jobDirectory,
      "startTime": "00:01",
      "duration": 3
    };

    const result = await trimVideo(data);

   // await expect(await trimVideo(data)).resolves.toBeUndefined();
  });

  test('should reject promise if input is invalid', async () => {
    const invalidData = {
      "inputFileLocation": "./path/filename.mp4",
      "outputFileDestination": "./artifacts/trim/${jobid}/filename.mp4"
    };

   // await expect(await trimVideo(invalidData)).rejects.toThrow('Invalid input data');
  });
});

  
  