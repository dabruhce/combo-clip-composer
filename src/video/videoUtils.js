const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
/*
const { SVG, Rect, Text, registerWindow } = require('@svgdotjs/svg.js');
const { getImageBEA } = require('../src/directionalMap');
const { createSVGWindow, setFontDir, setFontFamilyMappings, preloadFonts } = require('svgdom')
const { createReadStream } = require('fs');
const csv = require('csv-parser');
*/
const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, registerFont, loadImage, Image } = require('canvas');
const fs = require('fs');
const fsp = require('fs').promises;
const sizeOf = require('image-size');
const path = require('path');
const extractFrames = require('ffmpeg-extract-frames')
const { v4: uuidv4 } = require('uuid');
const { searchAndCopyFiles, findFileInDirectory, expandShortcuts, checkAndConvertCase } = require('../image/imageGen');
const { createTextCanvasOfSize, estimateTextSize } = require('../image/canvas');
const { recreateDirectory } = require('../utils/createDirectory');

registerFont('./assets/fonts/THEBOLDFONT/THEBOLDFONT.ttf', { family: 'THEBOLDFONT' });

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


  async function getFileName(filePath) {
    return path.basename(filePath);
  }

  async function processComboVideo(inputFile, text, x, y, jobDirectory = './artifacts/out/') {
    const { audio, video, duration, fps } = await getVideoMetadata(inputFile)

    const jobID = uuidv4();
    const jobDirectoryWithID = jobDirectory + jobID;

    const filename = await getFileName(inputFile);
    const completedFilename = 'complete_' + filename

    const targetDirectory = jobDirectoryWithID + '/video/frames';

    const initialFramesDirectory = jobDirectoryWithID + '/video/frames/initial';
    const updatedFramesDirectory = jobDirectoryWithID + '/video/frames/updated';
    
    const audioOutputDirectory = jobDirectoryWithID + '/audio/'
    const audioOutputFile = jobDirectoryWithID + '/audio/output-audio.aac'
    
    const imagesDirectory = jobDirectoryWithID + '/images/'  


    await recreateDirectory(jobDirectoryWithID);
    await recreateDirectory(targetDirectory);
    await recreateDirectory(initialFramesDirectory);
    await recreateDirectory(updatedFramesDirectory);
    await recreateDirectory(audioOutputDirectory);
    await recreateDirectory(imagesDirectory);

    const directories = ['./assets/games/Tekken7/images', './assets/games/common/images'];
    await searchAndCopyFiles(text, directories, imagesDirectory);

    // Extract audio from video
    await extractAudioFromVideo(inputFile, audioOutputFile);

    // Extract frames from video
    const outputFile = path.join(initialFramesDirectory, 'allframes-%04d.png');
    await extractFrames({
      input: inputFile,
      output: outputFile
    });

    // Redraw each frame with text and coordinates
    const fileNames = await fs.promises.readdir(initialFramesDirectory);
    const filePaths = fileNames.map(name => path.join(initialFramesDirectory, name));

    for (const filePath of filePaths) {
      await redrawFrameWithComboImages(filePath, updatedFramesDirectory, text, x, y, imagesDirectory) 
    }

    // Stitch frames into video
    const finalVideoOutput = path.join(targetDirectory, filename);
    await createVideoFromFrames(path.join(updatedFramesDirectory, 'allframes-%04d.png'), finalVideoOutput, duration, fps);

    // Add audio to final video
    const finalVideoOutputWithAudio = path.join(targetDirectory, completedFilename);
    await addAudioToVideo(finalVideoOutput, audioOutputFile, finalVideoOutputWithAudio);

    return finalVideoOutputWithAudio;
  }

  async function processVideo(inputFile, text, x, y) {
    const { audio, video, duration, fps } = await getVideoMetadata(inputFile)
  
    const jobID = uuidv4();
    const jobDirectory = './artifacts/out/' + jobID;
  
    const filename = await getFileName(inputFile);
    const completedFilename = 'complete_' + filename
  
    const targetDirectory = jobDirectory + '/video/frames';
  
    const initialFramesDirectory = jobDirectory + '/video/frames/initial';
    const updatedFramesDirectory = jobDirectory + '/video/frames/updated';
    
    const audioOutputDirectory = jobDirectory + '/audio/'
    const audioOutputFile = jobDirectory + '/audio/output-audio.aac'  
  
    await recreateDirectory(jobDirectory);
    await recreateDirectory(targetDirectory);
    await recreateDirectory(initialFramesDirectory);
    await recreateDirectory(updatedFramesDirectory);
    await recreateDirectory(audioOutputDirectory);
  
    // Extract audio from video
    await extractAudioFromVideo(inputFile, audioOutputFile);
  
    // Extract frames from video
    const outputFile = path.join(initialFramesDirectory, 'allframes-%04d.png');
    await extractFrames({
      input: inputFile,
      output: outputFile
    });
  
    // Redraw each frame with text and coordinates
    const fileNames = await fs.promises.readdir(initialFramesDirectory);
    const filePaths = fileNames.map(name => path.join(initialFramesDirectory, name));
    
    for (const filePath of filePaths) {
        await redrawFrameWithTextAndCoords(filePath, updatedFramesDirectory, text, x, y);
    }
  
    // Stitch frames into video
    const finalVideoOutput = path.join(targetDirectory, filename);
    await createVideoFromFrames(path.join(updatedFramesDirectory, 'allframes-%04d.png'), finalVideoOutput, duration, fps);
  
    // Add audio to final video
    const finalVideoOutputWithAudio = path.join(targetDirectory, completedFilename);
    await addAudioToVideo(finalVideoOutput, audioOutputFile, finalVideoOutputWithAudio);
   
    //console.log('text returning ' + finalVideoOutputWithAudio)
    return finalVideoOutputWithAudio;
  }

async function redrawFrameWithTextAndCoords(initialFrames, updatedFramesPath, text, x, y) {
 
  const filename = path.basename(initialFrames);
  const dimensions = await sizeOf(initialFrames);
  const canvasTextSize = estimateTextSize(text, 'THEBOLDFONT', 50);

  if((canvasTextSize.width + x) > dimensions.width) { throw 'text too wide'}
  if((canvasTextSize.height + y) > dimensions.height) { throw 'text too tall'}

  // Create canvas
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const context = canvas.getContext('2d');
  const frame = await loadImage(initialFrames);
  context.drawImage(frame, 0, 0)
  
  // Draw the text onto the text canvas
  const textCanvas = await createTextCanvasOfSize(text, canvasTextSize.width, canvasTextSize.height);

  const heightAdjustment = canvasTextSize.height + 15;
 // await drawBlurredBackground(context, x, y, canvasTextSize.width, canvasTextSize.height, "#000000");
  await drawBlurredBackground(context, x, y, canvasTextSize.width, heightAdjustment, "C9C9C9");

  // Draw the text canvas onto the main canvas
  context.drawImage(textCanvas, x, y)
  
  // Save the output file with the same filename, but in the `./artifacts/video/frames` directory
  const outputFilename = path.join(updatedFramesPath, path.basename(filename));
  const output = canvas.toBuffer('image/png');

  await fs.promises.writeFile(outputFilename, output);
}

async function splitwords(initialFrames, updatedFramesPath, game, comboText, xOffset, yOffset) {
  const inputs = comboText.split(",").map(input => input.trimStart());
  const wordSeparator = "sep"; // Replace this with the actual word separator you want to use
  
  const splitInputs = inputs.flatMap((input, index, array) => {
    const splittedInput = input.split(" ");
    if (index < array.length - 1) {
      splittedInput.push(wordSeparator);
    }
    return splittedInput;
  });
}

async function redrawFrameWithComboImages(initialFrames, updatedFramesPath, comboText, xOffset, yOffset, imageJobPath) {  
  try {
    const inputs = comboText.split(",").map(input => input.trimStart());
    const wordSeparator = "sep";
  
    const splitInput = inputs.flatMap((input, index, array) => {
    const splittedInput = input.split(" ");

      if (index < array.length - 1) {
        splittedInput.push(wordSeparator);
      }
  
      return splittedInput;
    });

    const expandInputs = await expandShortcuts(splitInput);
    const splitInputs = await checkAndConvertCase(expandInputs);

    const filename = path.basename(initialFrames);

    const frameDimensions = await sizeOf(initialFrames);
    const canvas = createCanvas(frameDimensions.width, frameDimensions.height);
    const context = canvas.getContext("2d");

    await drawBaseFrame(context, initialFrames);
  
    const inputImagesDimensions = calculateInputImagesDimensions(splitInputs);
  
    if (xOffset + inputImagesDimensions.width > frameDimensions.width) {
      // Handle the situation here, e.g., throw an error, adjust xOffset, or scale the images
      throw new Error("The total width of input images and the blurred background exceeds the width of the base frame.");
    }

    await drawBlurredBackground(context, xOffset, yOffset, inputImagesDimensions.width, inputImagesDimensions.height);

    await drawInputImages(context, splitInputs, xOffset, yOffset, imageJobPath);

    const outputFilename = path.join(updatedFramesPath, path.basename(filename));
    const finalOutput = canvas.toBuffer("image/png");
    await fs.promises.writeFile(outputFilename, finalOutput);
  } catch (error) {
    throw error;
  }
}

async function drawBaseFrame(context, frameFile) {
  const baseFrame = await loadImage(frameFile);
  await context.drawImage(baseFrame, 0, 0);
}

async function drawBlurredBackground(context, xOffset, yOffset, width, height, color = "#008B8B99") {
  const blurredRect = {
    x: xOffset - 5,
    y: yOffset - 5,
    height: height + 10,
    width: width + 10,
    spread: 10
  };

  context.globalAlpha = 0.5;

  context.filter = `blur(${blurredRect.spread}px)`;
  context.drawImage(
    context.canvas,
    blurredRect.x, blurredRect.y, blurredRect.width, blurredRect.height,
    blurredRect.x, blurredRect.y, blurredRect.width, blurredRect.height
  );

  context.globalAlpha = 1;

  context.filter = "none";
  context.fillStyle = color;
  context.fillRect(blurredRect.x, blurredRect.y, blurredRect.width, blurredRect.height);
}

async function drawInputImages(context, inputs, xOffset, yOffset, imageJobPath) {
  const drawImagePromises = inputs.map(async (item, i) => {
  const trimmedItem = item.trim();

    const file = `${trimmedItem}.svg`
    const imageFilePath = await findFileInDirectory(imageJobPath, file)
    const imageFile = await loadImage(imageFilePath);
    const inputPosition = xOffset + (i * 50);
    context.drawImage(imageFile, inputPosition, yOffset, 50, 50);

  });

  await Promise.all(drawImagePromises);
}

function calculateInputImagesDimensions(inputs) {
  const inputWidth = 50;
  const inputSpacing = 50;
  const setInputWidth = 10;
  const setInputSpacing = 10;
  const inputHeight = 50;

  let totalWidth = 0;
  inputs.forEach((item, i) => {
      totalWidth += inputSpacing
  });

  totalWidth += setInputSpacing + setInputWidth;

  return {
    width: totalWidth,
    height: inputHeight
  };
}

async function createVideoFromFrames(
  framesFilepath,
  outputFilepath,
  duration,
  frameRate,
) {

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(framesFilepath)
     // .inputOptions('-pattern_type glob')
      .inputOptions('-framerate 30')
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
      ])
      .fps(frameRate)

      // Resolve or reject (throw an error) the Promise once FFmpeg completes
      .saveToFile(outputFilepath)
      .on('end', () => resolve())
      .on('error', (error) => reject(new Error(error)));
  });
}

//AUDIO
async function extractAudioFromVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('copy')
      .output(outputPath)
      .on('end', () => {
      //  console.log(`Audio extracted from ${inputPath} to ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
      //  console.error(`Error extracting audio from ${inputPath}: ${error.message}`);
        reject(error);
      })
      .run();
  });
}

async function addAudioToVideo(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
     // .mergeAdd()
      .outputOptions('-c:v', 'copy')
      .output(outputPath)
      .on('end', () => {
     //   console.log(`Audio added to ${videoPath} from ${audioPath} to create ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
      //  console.error(`Error adding audio to ${videoPath}: ${error.message}`);
        reject(error);
      })
      .run();
  });
}

//METADATA
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath).ffprobe((err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      if (!(metadata && metadata.streams && metadata.format && metadata.format.duration)) {
        reject(new Error(`Fail to parse metadata`));
        return;
      }
      const video = metadata.streams.find((s) => s.codec_type === 'video');
      if (!video) {
        reject(new Error(`No video stream found`));
        return;
      }
      const audio = metadata.streams.find((s) => s.codec_type === 'audio');
      const duration = metadata.format.duration;
      const fps = 30;
   
      //console.log(metadata)
      // 30,000/1001 = 30 fps && 60,000/1001 = 60 fps
      //const fps = metadata.streams[0].r_frame_rate;
      resolve({ audio, video, duration, fps });
    });
  });
}

async function trimVideo(data) {
  if (!data || typeof data !== 'object' || !data.inputFileLocation || !data.outputFileDestination || !data.startTime || !data.duration) {
    return Promise.reject(new Error('Invalid input data'));
  }

  const filename = path.basename(data.inputFileLocation);
  const outputFileDestination = path.join(data.outputFileDestination, filename);

  return new Promise((resolve, reject) => {
    ffmpeg(data.inputFileLocation)
      .setStartTime(data.startTime)
      .setDuration(data.duration)
      .output(outputFileDestination)
      .on('end', function() {
   //     console.log('conversion Done');
        resolve();
      })
      .on('error', function(err) {
        console.log('error:', err);
        reject(err);
      })
      .run();
  });
}

module.exports = { processComboVideo, trimVideo, processVideo, addAudioToVideo };