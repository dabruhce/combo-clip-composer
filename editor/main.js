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

// Store project state
let currentProjectPath = null;
let hasUnsavedChanges = false;

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
 * Opens a dialog to select a project file
 */
async function openProjectDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    filters: [
      { name: 'Combo Clip Composer Project', extensions: ['ccc'] },
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
 * Opens a dialog to save a project file
 */
async function saveProjectDialog() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    filters: [
      { name: 'Combo Clip Composer Project', extensions: ['ccc'] }
    ],
    defaultPath: currentProjectPath || 'untitled.ccc'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
}

/**
 * Handle project open request from renderer
 */
async function handleOpenProject() {
  try {
    const projectPath = await openProjectDialog();
    if (!projectPath) {
      return { success: false, canceled: true };
    }

    // Read and parse project file
    const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

    // Validate project file structure
    if (!projectData.version || !projectData.sourceVideoPath) {
      return {
        success: false,
        error: 'Invalid project file format'
      };
    }

    // Check if source video exists
    if (!fs.existsSync(projectData.sourceVideoPath)) {
      return {
        success: false,
        error: `Source video not found: ${projectData.sourceVideoPath}`
      };
    }

    currentProjectPath = projectPath;
    hasUnsavedChanges = false;
    updateWindowTitle();

    return {
      success: true,
      projectPath,
      projectData
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle project save request from renderer
 */
async function handleSaveProject(event, { projectData, saveAs }) {
  try {
    let savePath = currentProjectPath;

    // Show save dialog if no current path or "Save As"
    if (!savePath || saveAs) {
      savePath = await saveProjectDialog();
      if (!savePath) {
        return { success: false, canceled: true };
      }
    }

    // Ensure .ccc extension
    if (!savePath.toLowerCase().endsWith('.ccc')) {
      savePath += '.ccc';
    }

    // Write project file
    fs.writeFileSync(savePath, JSON.stringify(projectData, null, 2), 'utf-8');

    currentProjectPath = savePath;
    hasUnsavedChanges = false;
    updateWindowTitle();

    return {
      success: true,
      projectPath: savePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle unsaved changes mark from renderer
 */
function handleMarkUnsavedChanges(event, { hasChanges }) {
  hasUnsavedChanges = hasChanges;
  updateWindowTitle();
}

/**
 * Updates the window title to reflect project state
 */
function updateWindowTitle() {
  if (!mainWindow) return;

  let title = 'Combo Clip Composer Editor';
  if (currentProjectPath) {
    title = path.basename(currentProjectPath) + ' - ' + title;
  }
  if (hasUnsavedChanges) {
    title = '• ' + title;
  }
  mainWindow.setTitle(title);
}

/**
 * Shows unsaved changes dialog and returns user's choice
 * @returns {Promise<'save'|'discard'|'cancel'>}
 */
async function showUnsavedChangesDialog() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Do you want to save before closing?',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2
  });

  switch (result.response) {
    case 0: return 'save';
    case 1: return 'discard';
    default: return 'cancel';
  }
}

/**
 * Handle loading video by path (for project loading)
 */
async function handleLoadVideoByPath(event, videoPath) {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return {
        success: false,
        error: 'Video file not found: ' + videoPath
      };
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
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-project');
            }
          }
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            if (mainWindow) {
              const result = await handleOpenProject();
              if (result.success) {
                mainWindow.webContents.send('project-opened', result);
              } else if (result.error) {
                mainWindow.webContents.send('project-open-error', { error: result.error });
              }
            }
          }
        },
        { type: 'separator' },
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
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('save-project', { saveAs: false });
            }
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('save-project', { saveAs: true });
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

  // Handle close event to warn about unsaved changes
  mainWindow.on('close', async (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      const choice = await showUnsavedChangesDialog();

      if (choice === 'save') {
        // Request renderer to save project
        mainWindow.webContents.send('save-project-before-close');
      } else if (choice === 'discard') {
        // Force close without saving
        hasUnsavedChanges = false;
        mainWindow.close();
      }
      // If 'cancel', do nothing (close was already prevented)
    }
  });

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
  ipcMain.handle('load-video-by-path', handleLoadVideoByPath);
  ipcMain.handle('get-frame-paths', () => framePaths);
  ipcMain.handle('get-current-video', () => ({
    videoPath: currentVideoPath,
    framesDir: extractedFramesDir,
    framePaths: framePaths
  }));

  // Project IPC handlers
  ipcMain.handle('open-project', handleOpenProject);
  ipcMain.handle('save-project', handleSaveProject);
  ipcMain.handle('get-project-path', () => currentProjectPath);
  ipcMain.on('mark-unsaved-changes', handleMarkUnsavedChanges);
  ipcMain.handle('check-unsaved-changes', async () => {
    if (!hasUnsavedChanges) {
      return { action: 'proceed' };
    }
    const choice = await showUnsavedChangesDialog();
    return { action: choice };
  });

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
module.exports = {
  createWindow,
  getVideoMetadata,
  extractVideoFrames,
  openVideoDialog,
  openProjectDialog,
  saveProjectDialog,
  handleOpenProject,
  handleSaveProject,
  handleLoadVideoByPath
};
