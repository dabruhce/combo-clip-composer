const { processComboVideo, processVideo } = require('../src/video/videoUtils');
const { recreateDirectory } = require('../src/utils/createDirectory');
const { readFile } = require('../src/utils/readFile');

jest.setTimeout(20000000);

describe('do 2 videos in a row', () => {

  beforeAll(async () => {
        
    // Delete the directory if it exists
    const dirPath = './artifacts/out';
    await recreateDirectory(dirPath); 
    
  });
  
  test('should create PNG with combos', async () => {
      const inputFile = './assets/tests/video/video.mp4';
  //   const text = 'd df f 1+2 w!, ss df 1 d 2, tt! df F 2 w!, ss 1 1 1, s!, f 3 set 1 2 1'
  //   const text = 'd x! d f r! set 1, 1 2 1'
      const text = 'd df f 1+2, w! ss, df 1 d 2, f Fp 2, w! ss 1 1 1, s! f 3 set 1 2 1'
      const x = 100;
      const y = 900;

      await processComboVideo(inputFile, text, x, y);
  });


  test('should run transform video as specified by json', async () => {

    const data = await readFile('./assets/tests/video/combos.json', 'utf-8');
    const jsonData = JSON.parse(data);

    for (const item of jsonData) {

      const sourceVideo = item.game_information.video_source;
    //  console.log(`${item.game_information.video_source}`)
      const overlays = item.video_transformations.overlays;
  
      let nextVideo = item.game_information.video_source;
      for (const overlay of overlays) {

        const xPos = overlay.render_detail.coordinates.x;
        const yPos = overlay.render_detail.coordinates.y;
        const detail = overlay.render_detail.detail;             
        if(overlay.render_type === 'text_display') {
          nextVideo = await processVideo(nextVideo, detail, xPos, yPos);
        }

        if(overlay.render_type === 'combo_notation_display') {
          nextVideo = await processComboVideo(nextVideo, detail, xPos, yPos)
        }

      }

      console.log(`${item.game_information.video_source}`)

    }
  });
  
  

});
