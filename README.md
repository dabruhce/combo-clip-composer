# Combo Clip Composer

Combo Clip Composer is a tool for creating fighting game combo videos by overlaying input notation images onto gameplay footage. It provides both a command-line interface for batch processing and a desktop editor for visual composition.

## Features

- **Video Processing**: Overlay combo inputs on any video file
- **YouTube Integration**: Download and process YouTube videos directly
- **Desktop Editor**: Visual GUI for composing and previewing overlays
- **Animation System**: Fade-in/fade-out effects with per-character staggering
- **Keyframe Animation**: Animate properties over time with interpolation
- **Text Markup**: Inline styling with colors and formatting tags
- **Configuration System**: JSON-based settings with validation
- **Project Files**: Save and load editor projects (.ccc format)

## Getting Started

### Prerequisites

- Node.js >= 10.0.0
- npm >= 6.0.0 or Yarn
- ffmpeg (installed automatically via npm dependencies)

### Installation

```bash
git clone https://github.com/dabruhce/combo-clip-composer.git
cd combo-clip-composer
yarn
```

## Usage

### Command Line - Local Video

```bash
node main.js <VIDEO_PATH> "<COMBO_INPUT>" <X_POS> <Y_POS> <OUTPUT_PATH> [START_TIME] [START_OFFSET] [END_TIME] [END_OFFSET]
```

**Arguments:**
- `VIDEO_PATH` - Path to source video file
- `COMBO_INPUT` - Combo notation string (space-separated inputs)
- `X_POS` - Horizontal position (pixels) for overlay
- `Y_POS` - Vertical position (pixels) for overlay
- `OUTPUT_PATH` - Directory for output files
- `START_TIME` (optional) - Trim start time
- `START_OFFSET` (optional) - Offset from start time
- `END_TIME` (optional) - Trim end time
- `END_OFFSET` (optional) - Offset from end time

**Example:**
```bash
node main.js ./assets/tests/video/video.mp4 "d df f 2" 100 900 ./artifacts/
```

### Command Line - YouTube Video

```bash
node main-pipeline.js <VIDEO_ID> <VIDEO_DEST> <AUDIO_DEST> <FINAL_DEST> "<COMBO_INPUT>" <X_POS> <Y_POS>
```

**Example:**
```bash
node main-pipeline.js xHdlyUh0e5Q ./artifacts/pipeline/temp-video.mp4 ./artifacts/pipeline/temp-audio.aac ./artifacts/pipeline/final.mp4 "d df f 2" 100 900
```

### Desktop Editor

Launch the visual editor:
```bash
yarn editor:dev
```

**Editor Features:**
- Open and preview video files (MP4, AVI, MOV, MKV, WebM)
- Frame-by-frame navigation
- Visual overlay positioning
- Project save/load (.ccc files)
- Export to video (MP4)
- Export configuration to JSON

**Keyboard Shortcuts:**
- `Ctrl+N` - New project
- `Ctrl+O` - Open video
- `Ctrl+Shift+O` - Open project
- `Ctrl+S` - Save project
- `Ctrl+Shift+S` - Save as
- `Ctrl+E` - Export video
- `Ctrl+Shift+E` - Export config

## Combo Notation

### Basic Inputs
- Directional: `d`, `df`, `f`, `uf`, `u`, `ub`, `b`, `db`, `n` (neutral)
- Buttons: `1`, `2`, `3`, `4` (Tekken notation)
- Comma separates combos: `d df f 2, w! ss, df 1`

### Shortcuts
| Shortcut | Expands To |
|----------|------------|
| `qcf` | `d df f` |
| `qcb` | `d db b` |
| `hcf` | `b db d df f` |
| `hcb` | `f df d db b` |
| `dp` | `f d df` |

### Held Inputs
Uppercase = held input (e.g., `F` renders as held forward)

## Configuration

Configuration is managed through JSON files. Default settings are in `config/defaults.json`.

### Configuration Sections

**Text Settings:**
```json
{
  "text": {
    "font": "THEBOLDFONT",
    "fontSize": 50,
    "color": "yellow",
    "position": { "x": 10, "y": 50 },
    "dropshadow": {
      "enabled": false,
      "color": "#000000",
      "blur": 0,
      "offsetX": -2,
      "offsetY": 3
    }
  }
}
```

**Image Settings:**
```json
{
  "images": {
    "width": 50,
    "height": 50,
    "spacing": 0,
    "padding": 5,
    "margin": 5
  }
}
```

**Animation Settings:**
```json
{
  "animation": {
    "type": "fade",
    "duration": 500,
    "delay": 0,
    "perCharacter": false,
    "fadeOutStart": 0.8,
    "fadeOutDuration": 300
  }
}
```

## Text Markup

Use inline tags for styled text overlays:

### Color Tags
- Named: `[red]text[/red]`
- Hex: `[#FF0000]text[/#FF0000]`
- Explicit: `[color:red]text[/color]`
- RGB: `[rgb(255,0,0)]text[/rgb]`

### Style Tags
- `[bold]text[/bold]`
- `[italic]text[/italic]`
- `[underline]text[/underline]`

### Newlines
- `[br]` or `[newline]`

**Supported Colors:**
black, white, red, green, blue, yellow, cyan, magenta, orange, purple, pink, brown, gray, grey, lime, navy, teal, aqua, fuchsia, silver, maroon, olive, transparent

## Keyframe Animation

The editor supports keyframe-based animation for dynamic overlays:

**Interpolation Types:**
- `linear` - Constant rate of change
- `ease-in` - Starts slow, accelerates
- `ease-out` - Starts fast, decelerates
- `ease-in-out` - Smooth acceleration and deceleration
- `step` - Instant change at keyframe

## Adding Custom Images

Add or replace images in the asset directories:

```bash
# Add a custom image
cp ./my-image.svg ./assets/games/common/images/custom.svg

# Use in combo notation
node main.js ./video.mp4 "d df f 2 custom" 100 900 ./artifacts/
```

**Requirements:**
- Images must be SVG format
- Filenames are used as input names (without extension)
- Don't use commas in filenames

**Asset Directories:**
- `assets/games/Tekken7/images/` - Game-specific buttons
- `assets/games/common/images/` - Directional arrows, shared inputs

## Development

```bash
# Run tests
yarn test

# Run single test file
yarn test tests/combos.test.js

# Watch mode
yarn test:watch

# Coverage report
yarn coverage

# Clean artifacts
yarn clean
```

## Examples

### Before and After

Original YouTube video:

[![Before](https://img.youtube.com/vi/xHdlyUh0e5Q/0.jpg)](https://www.youtube.com/watch?v=xHdlyUh0e5Q)

Processed with combo overlay:

[![After](https://img.youtube.com/vi/6P9Be5N8zHs/0.jpg)](https://www.youtube.com/watch?v=6P9Be5N8zHs)

### Custom Image Example

[![Custom](https://img.youtube.com/vi/MYL4ngDcN80/0.jpg)](https://www.youtube.com/watch?v=MYL4ngDcN80)

## Project Structure

```
combo-clip-composer/
├── main.js                 # CLI entry point (local files)
├── main-pipeline.js        # CLI entry point (YouTube)
├── config/
│   └── defaults.json       # Default configuration
├── editor/
│   ├── main.js             # Electron main process
│   ├── index.html          # Editor UI
│   └── models/
│       └── keyframe.js     # Keyframe animation model
├── src/
│   ├── animation/
│   │   └── fadeAnimation.js    # Fade animation system
│   ├── config/
│   │   ├── configLoader.js     # Configuration loading
│   │   └── schema.js           # Config validation schema
│   ├── image/
│   │   ├── canvas.js           # Canvas rendering
│   │   ├── createSVG.js        # SVG handling
│   │   └── imageGen.js         # Image generation
│   ├── text/
│   │   ├── markupParser.js     # Text markup parsing
│   │   └── markupRenderer.js   # Styled text rendering
│   ├── utils/                  # Utility functions
│   └── video/
│       ├── videoUtils.js       # Video processing
│       └── youtube.js          # YouTube downloading
├── assets/
│   ├── fonts/                  # Font files
│   └── games/                  # Input notation images
└── tests/                      # Test files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Arrow and button images from [tk7movespretty](https://github.com/dabruhce/tk7movespretty).

## License

MIT License - see [LICENSE](LICENSE) for details.
