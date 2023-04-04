const { searchAndCopyFiles } = require('../src/image/imageGen');
const { createDirectory } = require('../src/utils/createDirectory');
const { checkFileExists } = require('../src/utils/copyFileToDirectory');
const { v4: uuidv4 } = require('uuid');

jest.setTimeout(20000000);

describe('util functions', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/imager/';
    await createDirectory(dirPath);   
    
  });
  
  test('should create AVG for unknown images', async () => {
    const text = 'd df f 1+2 r';
    const directories = ['./assets/games/Tekken7/images', './assets/games/common/images'];

    const jobID = uuidv4();
    const jobDirectory = './artifacts/imager/' + jobID;
    await createDirectory(jobDirectory)
  //assets\games\Tekken7\inputs
    try {
      await searchAndCopyFiles(text, directories, jobDirectory);
    //  console.log('All files copied successfully!');
    } catch (err) {
      console.error('An error occurred:', err);
    }
  });

  test('should create SVG by expanding shortcuts', async () => {
    const text = 'hcf 1+2 r';
    const directories = ['./assets/games/Tekken7/images', './assets/games/common/images'];

    const jobID = uuidv4();
    const jobDirectory = './artifacts/imager/' + jobID;
    await createDirectory(jobDirectory)
    try {
      await searchAndCopyFiles(text, directories, jobDirectory);
   //   console.log('All files copied successfully!');
    } catch (err) {
      console.error('An error occurred:', err);
    }
  });


  test('should move custom image to job directory', async () => {
    const text = 'hcf 1+2 r smile';
    const directories = ['./assets/games/Tekken7/images', './assets/games/common/images', './assets/tests/images'];

    const jobID = uuidv4();
    const jobDirectory = './artifacts/imager/' + jobID;
    await createDirectory(jobDirectory)

    const targetWrongFile = jobDirectory + '/smilea.svg'
    const targetCorrectFile = jobDirectory + '/smile.svg'

    try {
      await searchAndCopyFiles(text, directories, jobDirectory);
      const wrongFile = await checkFileExists(targetWrongFile);
 
      expect(await checkFileExists(targetWrongFile)).toBe(false);
      expect(await checkFileExists(targetCorrectFile)).toBe(true);

    } catch (err) {
      console.error('An error occurred:', err);
    }
  });


});
