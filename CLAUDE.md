# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
yarn

# Run tests
yarn test

# Run a single test file
yarn test tests/combos.test.js

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn coverage

# Clean artifacts directory
yarn clean
```

## Architecture Overview

Combo Clip Composer creates fighting game combo videos by overlaying input notation images onto gameplay footage.

### Entry Points

- `main.js` - Local file processing: takes a video file and overlays combo inputs
- `main-pipeline.js` - YouTube pipeline: downloads a video then processes it with combo overlays

### Core Processing Flow

1. **Video Processing** (`src/video/videoUtils.js`):
   - Extracts audio from input video
   - Extracts all frames as PNG images
   - Redraws each frame with combo input overlays
   - Stitches frames back into video
   - Re-attaches audio to final video
   - Uses ffmpeg via `fluent-ffmpeg` for all video operations

2. **Image Generation** (`src/image/imageGen.js`):
   - Parses combo notation text (space-separated, comma for separators)
   - Expands shortcuts like `qcf` → `d df f`, `dp` → `f d df`
   - Handles held inputs (uppercase converts to `*p` variant, e.g., `F` → `fp`)
   - Copies required SVG images from asset directories to job folder

3. **Canvas Operations** (`src/image/canvas.js`):
   - Creates text overlays using node-canvas
   - Uses THEBOLDFONT for text rendering

4. **YouTube Integration** (`src/video/youtube.js`):
   - Downloads highest quality video and audio separately via ytdl-core
   - Merges streams into final file

### Asset Structure

- `assets/games/Tekken7/images/` - Tekken 7 button notation SVGs (1, 2, 3, 4, combos)
- `assets/games/common/images/` - Directional arrow SVGs (d, df, f, etc.)
- `assets/fonts/THEBOLDFONT/` - Font used for text overlays

### Combo Notation Format

- Space-separated inputs: `d df f 2`
- Comma separates combos (adds separator image): `d df f 2, w! ss, df 1`
- Shortcuts: `qcf`, `qcb`, `hcf`, `hcb`, `dp`
- Uppercase = held input: `F` renders as held forward, `Fp` explicitly

### Job Output Structure

Each processing job creates a unique UUID directory under `artifacts/` containing:
- `/video/frames/initial/` - Extracted source frames
- `/video/frames/updated/` - Frames with overlays
- `/audio/` - Extracted audio track
- `/images/` - Copied SVG assets for this job
