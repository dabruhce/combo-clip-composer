const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const { addAudioToVideo } = require('../video/videoUtils');

async function downloadVideo(videoID, videoFilePath) {
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`;

    const videoStream = ytdl(videoURL, { quality: 'highest' });
    videoStream.on('progress', (chunkSize, downloadedBytes, totalBytes) => {
        const percentComplete = downloadedBytes / totalBytes;
   //     console.log(`Downloaded ${Math.round(percentComplete * 100)}%`);
    });

    const output = fs.createWriteStream(videoFilePath);
    videoStream.pipe(output);

    await new Promise((resolve, reject) => {
        output.on('finish', resolve);
        videoStream.on('error', reject);
    });

    //console.log('Download complete!');
}

async function downloadHighestQualityVideo(videoID, tempVideoFilePath, tempAudioFilePath, finalFilePath) {
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`;

    //To get best audio need to download then recombine with video
    //https://github.com/fent/node-ytdl-core/blob/master/example/ffmpeg.js
    const audioStream = ytdl(videoURL, { filter: 'audioonly', quality: 'highestaudio' });
    const videoStream = ytdl(videoURL, { filter: 'videoonly', quality: 'highestvideo' });
  
    videoStream.on('progress', (chunkSize, downloadedBytes, totalBytes) => {
      const percentComplete = downloadedBytes / totalBytes;
      // console.log(`Downloaded ${Math.round(percentComplete * 100)}%`);
    });
  
    audioStream.on('progress', (chunkSize, downloadedBytes, totalBytes) => {
      const percentComplete = downloadedBytes / totalBytes;
      // console.log(`Downloaded ${Math.round(percentComplete * 100)}%`);
    });
  
    const outputVideo = fs.createWriteStream(tempVideoFilePath);
    videoStream.pipe(outputVideo);
  
    const outputAudio = fs.createWriteStream(tempAudioFilePath);
    audioStream.pipe(outputAudio);
  
    const audioPromise = new Promise((resolve, reject) => {
      outputAudio.on('finish', resolve);
      audioStream.on('error', reject);
    });
  
    const videoPromise = new Promise((resolve, reject) => {
      outputVideo.on('finish', resolve);
      videoStream.on('error', reject);
    });
  
    // Wait for both video and audio download to complete
    await Promise.all([audioPromise, videoPromise]);
  
    // Call the function to add audio to video
    await addAudioToVideo(tempVideoFilePath, tempAudioFilePath, finalFilePath);
}

async function fetchVideoInfo(id) {
  const filepath = path.resolve(__dirname, 'info.json');

  try {
    const info = await ytdl.getInfo(id);
    console.log('title:', info.videoDetails.title);
    console.log('rating:', info.player_response.videoDetails.averageRating);
    console.log('uploaded by:', info.videoDetails.author.name);
    const json = JSON.stringify(info, null, 2)
      // eslint-disable-next-line max-len
      .replace(/(ip(?:=|%3D|\/))((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|[0-9a-f]{1,4}(?:(?::|%3A)[0-9a-f]{1,4}){7})/ig, '$10.0.0.0');

    //console.log(json)
  //  await fs.promises.writeFile(filepath, json);
  //  console.log('Video info saved to', filepath);
  } catch (err) {
    console.error('Error fetching video info:', err);
  }
}
  
module.exports = { downloadVideo, downloadHighestQualityVideo, fetchVideoInfo };