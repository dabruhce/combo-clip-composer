const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const extractFrames = require('ffmpeg-extract-frames');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');

// Fix paths for packaged app (asar unpacking)
function fixAsarPath(filePath) {
  if (filePath && filePath.includes('app.asar')) {
    return filePath.replace('app.asar', 'app.asar.unpacked');
  }
  return filePath;
}

const ffmpegPath = fixAsarPath(require('@ffmpeg-installer/ffmpeg').path);
const ffprobePath = fixAsarPath(require('@ffprobe-installer/ffprobe').path);

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

// Store export state
let isExporting = false;
let exportCancelled = false;

// Store extraction state
let isExtracting = false;
let extractionCancelled = false;

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
 * Extracts frames from a video file (synchronous version)
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
    output: outputPattern,
    ffmpegPath: ffmpegPath
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
 * Extracts frames from a video file with progress reporting
 * Uses fluent-ffmpeg directly for progress tracking
 */
async function extractVideoFramesWithProgress(videoPath, metadata, progressCallback) {
  // Create a temp directory for frames
  const tempDir = path.join(os.tmpdir(), 'combo-clip-editor-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPattern = path.join(tempDir, 'frame-%04d.png');
  const totalFrames = Math.ceil(metadata.duration * metadata.fps);

  return new Promise((resolve, reject) => {
    let lastProgress = 0;

    ffmpeg(videoPath)
      .outputOptions([
        '-vsync', 'vfr'  // Variable frame rate to extract all frames
      ])
      .output(outputPattern)
      .on('start', (commandLine) => {
        console.log('Frame extraction started:', commandLine);
        if (progressCallback) {
          progressCallback(0, 'Starting extraction...');
        }
      })
      .on('progress', (progress) => {
        // progress.percent may be available, otherwise calculate from timemark
        let percent = 0;
        if (progress.percent !== undefined && progress.percent !== null) {
          percent = Math.min(99, Math.round(progress.percent));
        } else if (progress.timemark) {
          // Parse timemark (HH:MM:SS.mm)
          const parts = progress.timemark.split(':');
          if (parts.length >= 3) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            const currentTime = hours * 3600 + minutes * 60 + seconds;
            percent = Math.min(99, Math.round((currentTime / metadata.duration) * 100));
          }
        }

        // Only report progress if it changed
        if (percent > lastProgress) {
          lastProgress = percent;
          if (progressCallback) {
            progressCallback(percent, `Extracting frames... ${percent}%`);
          }
        }
      })
      .on('end', () => {
        // Get list of extracted frame files
        const files = fs.readdirSync(tempDir)
          .filter(f => f.startsWith('frame-') && f.endsWith('.png'))
          .sort()
          .map(f => path.join(tempDir, f));

        if (progressCallback) {
          progressCallback(100, 'Extraction complete');
        }

        resolve({
          framesDir: tempDir,
          framePaths: files,
          metadata
        });
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Frame extraction error:', err);
        console.error('ffmpeg stdout:', stdout);
        console.error('ffmpeg stderr:', stderr);
        // Clean up temp directory on error
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.error('Failed to cleanup temp directory:', cleanupErr);
        }
        reject(err);
      })
      .run();
  });
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
 * Opens a dialog to select export video destination
 */
async function exportVideoDialog(defaultName) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Video',
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: defaultName || 'output.mp4'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
}

/**
 * Opens a dialog to select export config destination
 */
async function exportConfigDialog(defaultName) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Config',
    filters: [
      { name: 'JSON Config', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: defaultName || 'config.json'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
}

/**
 * Opens a dialog to select an asset folder
 */
async function openAssetFolderDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Asset Folder',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Handle asset folder selection request from renderer
 */
async function handleSelectAssetFolder(event) {
  try {
    const folderPath = await openAssetFolderDialog();
    if (!folderPath) {
      return { success: false, canceled: true };
    }

    // Verify the folder exists
    if (!fs.existsSync(folderPath)) {
      return {
        success: false,
        error: 'Selected folder does not exist'
      };
    }

    return {
      success: true,
      folderPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle config export request from renderer
 */
async function handleExportConfig(event, { config, keyframes, includeKeyframes }) {
  try {
    // Generate default output name
    const defaultName = currentProjectPath
      ? path.basename(currentProjectPath, '.ccc') + '-config.json'
      : 'config.json';

    // Show save dialog
    const outputPath = await exportConfigDialog(defaultName);
    if (!outputPath) {
      return { success: false, canceled: true };
    }

    // Build the config object to export
    const exportData = { ...config };

    // Include keyframes if requested
    if (includeKeyframes && keyframes) {
      exportData.keyframes = keyframes;
    }

    // Ensure .json extension
    let finalPath = outputPath;
    if (!finalPath.toLowerCase().endsWith('.json')) {
      finalPath += '.json';
    }

    // Write config file
    fs.writeFileSync(finalPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return {
      success: true,
      outputPath: finalPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
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
 * Handle video export request from renderer
 */
async function handleExportVideo(event, { comboText, xOffset, yOffset, config }) {
  try {
    // Validate we have a video loaded
    if (!currentVideoPath || !fs.existsSync(currentVideoPath)) {
      return {
        success: false,
        error: 'No video loaded or video file not found'
      };
    }

    // Generate default output name based on input video
    const inputBasename = path.basename(currentVideoPath, path.extname(currentVideoPath));
    const defaultName = `${inputBasename}_combo.mp4`;

    // Show save dialog
    const outputPath = await exportVideoDialog(defaultName);
    if (!outputPath) {
      return { success: false, canceled: true };
    }

    // Reset export state
    isExporting = true;
    exportCancelled = false;

    // Notify renderer that export is starting
    event.sender.send('export-started', { outputPath });

    // Create a temporary config file for the export
    const tempConfigPath = path.join(os.tmpdir(), `combo-clip-config-${Date.now()}.json`);
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2), 'utf-8');

    try {
      // Import processComboVideo dynamically to avoid issues with module loading
      const { processComboVideo } = require('../src/video/videoUtils');

      // Track progress by watching the output directory
      const outputDir = path.dirname(outputPath);
      let lastProgress = 0;

      // Send periodic progress updates
      const progressInterval = setInterval(() => {
        if (exportCancelled) {
          clearInterval(progressInterval);
          return;
        }
        // Send a heartbeat progress update
        if (isExporting) {
          event.sender.send('export-progress', { progress: lastProgress, status: 'Processing...' });
        }
      }, 500);

      // Run the video processing
      const result = await processComboVideo(
        currentVideoPath,
        comboText,
        xOffset,
        yOffset,
        './artifacts/out/', // Default job directory
        ['./assets/games/Tekken7/images', './assets/games/common/images'], // Default asset directories
        config.images ? config.images.width : null,
        config.images ? config.images.height : null,
        tempConfigPath
      );

      clearInterval(progressInterval);

      // Check if cancelled
      if (exportCancelled) {
        // Clean up temp config
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
        return {
          success: false,
          canceled: true
        };
      }

      // Copy the result to the user's chosen output path
      if (result && fs.existsSync(result)) {
        fs.copyFileSync(result, outputPath);
      }

      // Clean up temp config
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }

      isExporting = false;

      return {
        success: true,
        outputPath: outputPath
      };
    } catch (processError) {
      // Clean up temp config on error
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
      throw processError;
    }
  } catch (error) {
    isExporting = false;
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle export cancellation request from renderer
 */
function handleCancelExport() {
  exportCancelled = true;
  isExporting = false;
  return { success: true };
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
 * Also uses background extraction with progress
 */
async function handleLoadVideoByPath(event, videoPath) {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return {
        success: false,
        error: 'Video file not found: ' + videoPath
      };
    }

    // Get video metadata first
    const metadata = await getVideoMetadata(videoPath);

    // Reset extraction state
    isExtracting = true;
    extractionCancelled = false;

    // Notify renderer that extraction is starting
    event.sender.send('video-extraction-started', { videoPath });

    // Progress callback to send updates to renderer
    const progressCallback = (percent, status) => {
      if (!extractionCancelled && mainWindow) {
        event.sender.send('extraction-progress', { percent, status });
      }
    };

    // Extract frames with progress
    const result = await extractVideoFramesWithProgress(videoPath, metadata, progressCallback);

    // Check if cancelled
    if (extractionCancelled) {
      if (result.framesDir && fs.existsSync(result.framesDir)) {
        fs.rmSync(result.framesDir, { recursive: true, force: true });
      }
      return { success: false, canceled: true };
    }

    // Store state
    currentVideoPath = videoPath;
    extractedFramesDir = result.framesDir;
    framePaths = result.framePaths;
    isExtracting = false;

    // Notify renderer that extraction is complete
    event.sender.send('extraction-complete', {
      videoPath,
      framesDir: result.framesDir,
      framePaths: result.framePaths,
      frameCount: result.framePaths.length,
      metadata: {
        fps: metadata.fps,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    });

    // Send success to renderer
    return {
      success: true,
      videoPath,
      framesDir: result.framesDir,
      framePaths: result.framePaths,
      frameCount: result.framePaths.length,
      metadata: {
        fps: metadata.fps,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    };
  } catch (error) {
    isExtracting = false;
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle video loading request from renderer
 * Now starts background extraction with progress reporting
 */
async function handleLoadVideo(event) {
  try {
    // Open file dialog
    const videoPath = await openVideoDialog();
    if (!videoPath) {
      return { success: false, canceled: true };
    }

    // Get video metadata first (fast operation)
    const metadata = await getVideoMetadata(videoPath);

    // Store video path immediately
    currentVideoPath = videoPath;

    // Reset extraction state
    isExtracting = true;
    extractionCancelled = false;

    // Send video path immediately so renderer can display video right away
    event.sender.send('video-selected', {
      videoPath,
      metadata: {
        fps: metadata.fps,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    });

    // Notify renderer that frame extraction is starting
    event.sender.send('video-extraction-started', { videoPath });

    // Progress callback to send updates to renderer
    const progressCallback = (percent, status) => {
      if (!extractionCancelled && mainWindow) {
        event.sender.send('extraction-progress', { percent, status });
      }
    };

    // Extract frames with progress (runs asynchronously)
    const result = await extractVideoFramesWithProgress(videoPath, metadata, progressCallback);

    // Check if cancelled
    if (extractionCancelled) {
      // Clean up temp directory
      if (result.framesDir && fs.existsSync(result.framesDir)) {
        fs.rmSync(result.framesDir, { recursive: true, force: true });
      }
      return { success: false, canceled: true };
    }

    // Store state
    extractedFramesDir = result.framesDir;
    framePaths = result.framePaths;
    isExtracting = false;

    // Notify renderer that extraction is complete
    event.sender.send('extraction-complete', {
      videoPath,
      framesDir: result.framesDir,
      framePaths: result.framePaths,
      frameCount: result.framePaths.length,
      metadata: {
        fps: metadata.fps,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    });

    // Send success to renderer with frame data
    return {
      success: true,
      videoPath,
      framesDir: result.framesDir,
      framePaths: result.framePaths,
      frameCount: result.framePaths.length,
      metadata: {
        fps: metadata.fps,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    };
  } catch (error) {
    isExtracting = false;
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
        {
          label: 'Export Video...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-video');
            }
          }
        },
        {
          label: 'Export Config...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-config');
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

  // Export IPC handlers
  ipcMain.handle('export-video', handleExportVideo);
  ipcMain.handle('cancel-export', handleCancelExport);
  ipcMain.handle('export-config', handleExportConfig);

  // Asset folder IPC handlers
  ipcMain.handle('select-asset-folder', handleSelectAssetFolder);

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
  exportVideoDialog,
  exportConfigDialog,
  openAssetFolderDialog,
  handleOpenProject,
  handleSaveProject,
  handleLoadVideoByPath,
  handleExportVideo,
  handleCancelExport,
  handleExportConfig,
  handleSelectAssetFolder
};
