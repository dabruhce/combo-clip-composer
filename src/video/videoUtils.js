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

  async function processComboVideo(inputFile, text, x, y, jobDirectory = './artifacts/out/', directories = ['./assets/games/Tekken7/images', './assets/games/common/images'], inputWidth = 50, inputHeight = 50) {
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
      await redrawFrameWithComboImages(filePath, updatedFramesDirectory, text, x, y, imagesDirectory, inputWidth, inputHeight)
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

async function redrawFrameWithComboImages(initialFrames, updatedFramesPath, comboText, xOffset, yOffset, imageJobPath, inputWidth = 50, inputHeight = 50) {
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

    const inputImagesDimensions = calculateInputImagesDimensions(splitInputs, inputWidth, inputHeight);

    if (xOffset + inputImagesDimensions.width > frameDimensions.width) {
      // Handle the situation here, e.g., throw an error, adjust xOffset, or scale the images
      throw new Error("The total width of input images and the blurred background exceeds the width of the base frame.");
    }

    await drawBlurredBackground(context, xOffset, yOffset, inputImagesDimensions.width, inputImagesDimensions.height);

    await drawInputImages(context, splitInputs, xOffset, yOffset, imageJobPath, inputWidth, inputHeight);

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

async function drawInputImages(context, inputs, xOffset, yOffset, imageJobPath, inputWidth = 50, inputHeight = 50) {
  const drawImagePromises = inputs.map(async (item, i) => {
  const trimmedItem = item.trim();

    const file = `${trimmedItem}.svg`
    const imageFilePath = await findFileInDirectory(imageJobPath, file)
    const imageFile = await loadImage(imageFilePath);
    const inputPosition = xOffset + (i * inputWidth);
    context.drawImage(imageFile, inputPosition, yOffset, inputWidth, inputHeight);

  });

  await Promise.all(drawImagePromises);
}

function calculateInputImagesDimensions(inputs, inputWidth = 50, inputHeight = 50) {
  const inputSpacing = inputWidth; // Spacing derived from width
  const setInputWidth = 10;
  const setInputSpacing = 10;

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
      .inputOptions(`-framerate ${frameRate}`)
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
/**
 * Parses a frame rate string in fraction format (e.g., "30000/1001") and returns the numeric value.
 * Falls back to default value if parsing fails.
 * @param {string} frameRateStr - Frame rate string in "numerator/denominator" format
 * @param {number} defaultFps - Default FPS to return if parsing fails (default: 30)
 * @returns {number} - Parsed frame rate or default value
 */
function parseFrameRate(frameRateStr, defaultFps = 30) {
  if (!frameRateStr || typeof frameRateStr !== 'string') {
    return defaultFps;
  }

  // Handle fraction format like "30000/1001"
  if (frameRateStr.includes('/')) {
    const parts = frameRateStr.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  // Try parsing as a plain number
  const parsed = parseFloat(frameRateStr);
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }

  return defaultFps;
}

/**
 * Parses a timecode string into total seconds.
 * Supports formats: "SS", "MM:SS", "H:MM:SS"
 * @param {string} timecode - Timecode string to parse
 * @returns {number} - Total seconds
 * @throws {Error} - If timecode format is invalid
 */
function parseTimecode(timecode) {
  if (typeof timecode !== 'string' || timecode.trim() === '') {
    throw new Error('Invalid timecode: must be a non-empty string');
  }

  const parts = timecode.trim().split(':');

  if (parts.length > 3) {
    throw new Error(`Invalid timecode format: "${timecode}". Expected "SS", "MM:SS", or "H:MM:SS"`);
  }

  // Validate all parts are valid numbers
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Invalid timecode format: "${timecode}". Each segment must be a non-negative integer`);
    }
  }

  const numericParts = parts.map(p => parseInt(p, 10));

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 1) {
    // "SS" format
    seconds = numericParts[0];
  } else if (parts.length === 2) {
    // "MM:SS" format
    minutes = numericParts[0];
    seconds = numericParts[1];
  } else if (parts.length === 3) {
    // "H:MM:SS" format
    hours = numericParts[0];
    minutes = numericParts[1];
    seconds = numericParts[2];
  }

  return hours * 3600 + minutes * 60 + seconds;
}

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

      // Extract FPS from r_frame_rate, falling back to 30 if unavailable
      // r_frame_rate is typically in format "30000/1001" for 29.97fps or "60000/1001" for 59.94fps
      const fps = parseFrameRate(video.r_frame_rate, 30);

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

module.exports = { processComboVideo, trimVideo, processVideo, addAudioToVideo, parseFrameRate, calculateInputImagesDimensions, parseTimecode };