const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const extractFrames = require('ffmpeg-extract-frames');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');

// Set ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

// Store video state
let currentVideoPath = null;
let extractedFramesDir = null;
let framePaths = [];

/**
 * Gets video metadata using ffprobe
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath).ffprobe((err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      if (!(metadata && metadata.streams && metadata.format && metadata.format.duration)) {
        reject(new Error('Failed to parse metadata'));
        return;
      }
      const video = metadata.streams.find((s) => s.codec_type === 'video');
      if (!video) {
        reject(new Error('No video stream found'));
        return;
      }
      const audio = metadata.streams.find((s) => s.codec_type === 'audio');
      const duration = metadata.format.duration;

      // Extract FPS from r_frame_rate
      let fps = 30;
      if (video.r_frame_rate && video.r_frame_rate.includes('/')) {
        const parts = video.r_frame_rate.split('/');
        if (parts.length === 2) {
          const numerator = parseFloat(parts[0]);
          const denominator = parseFloat(parts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            fps = numerator / denominator;
          }
        }
      }

      resolve({
        audio,
        video,
        duration,
        fps,
        width: video.width,
        height: video.height
      });
    });
  });
}

/**
 * Opens a dialog to select a video file
 */
async function openVideoDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Video File',
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Extracts frames from a video file
 */
async function extractVideoFrames(videoPath, progressCallback) {
  // Create a temp directory for frames
  const tempDir = path.join(os.tmpdir(), 'combo-clip-editor-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  // Get video metadata
  const metadata = await getVideoMetadata(videoPath);

  // Extract frames
  const outputPattern = path.join(tempDir, 'frame-%04d.png');
  await extractFrames({
    input: videoPath,
    output: outputPattern
  });

  // Get list of extracted frame files
  const files = fs.readdirSync(tempDir)
    .filter(f => f.startsWith('frame-') && f.endsWith('.png'))
    .sort()
    .map(f => path.join(tempDir, f));

  return {
    framesDir: tempDir,
    framePaths: files,
    metadata
  };
}

/**
 * Handle video loading request from renderer
 */
async function handleLoadVideo(event) {
  try {
    // Open file dialog
    const videoPath = await openVideoDialog();
    if (!videoPath) {
      return { success: false, canceled: true };
    }

    // Notify renderer that extraction is starting
    event.sender.send('video-loading-started', { videoPath });

    // Extract frames
    const result = await extractVideoFrames(videoPath);

    // Store state
    currentVideoPath = videoPath;
    extractedFramesDir = result.framesDir;
    framePaths = result.framePaths;

    // Send success to renderer
    return {
      success: true,
      videoPath,
      framesDir: result.framesDir,
      framePaths: result.framePaths,
      frameCount: result.framePaths.length,
      metadata: {
        fps: result.metadata.fps,
        duration: result.metadata.duration,
        width: result.metadata.width,
        height: result.metadata.height
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates the application menu with video loading options
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Video',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              const result = await handleLoadVideo({ sender: mainWindow.webContents });
              if (result.success) {
                mainWindow.webContents.send('video-loaded', result);
              } else if (result.error) {
                mainWindow.webContents.send('video-load-error', { error: result.error });
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Combo Clip Composer Editor',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    show: false // Don't show until ready-to-show
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Set window title explicitly
  mainWindow.setTitle('Combo Clip Composer Editor');

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createMenu();
  createWindow();

  // Set up IPC handlers
  ipcMain.handle('open-video', handleLoadVideo);
  ipcMain.handle('get-frame-paths', () => framePaths);
  ipcMain.handle('get-current-video', () => ({
    videoPath: currentVideoPath,
    framesDir: extractedFramesDir,
    framePaths: framePaths
  }));

  // On macOS, re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up temp files on quit
app.on('will-quit', () => {
  if (extractedFramesDir && fs.existsSync(extractedFramesDir)) {
    try {
      fs.rmSync(extractedFramesDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up temp directory:', err);
    }
  }
});

// Export for testing purposes
module.exports = { createWindow, getVideoMetadata, extractVideoFrames, openVideoDialog };
