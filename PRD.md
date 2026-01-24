# PRD: Text and Image Customization System

## Introduction

The current Combo Clip Composer has hardcoded styling for text overlays (THEBOLDFONT at 50px, yellow color) and fixed image spacing. This PRD defines a comprehensive customization system allowing users to configure fonts, colors, positions, spacing, and animations via JSON configuration files. Additionally, an Electron-based preview editor will provide a full editing experience with timeline, keyframes, and export capabilities.

## Goals

- Enable JSON-based configuration for all text and image styling properties
- Support inline markup for mid-text color/style changes with nesting
- Implement text dropshadow effects
- Add fade-in/fade-out text animations
- Build a full-featured Electron preview editor with timeline and keyframe support
- Maintain backward compatibility with existing CLI workflow

## User Stories

### Phase 1: Configuration Foundation

#### US-001: Create JSON Configuration Schema and Loader
**Description:** As a developer, I want a well-defined JSON schema for styling configuration so that all customization options have a consistent structure.

**Acceptance Criteria:**
- [x] Create `src/config/schema.js` with configuration schema definition
- [x] Schema includes: `text` (font, fontSize, color, position, dropshadow), `images` (width, height, spacing, padding, margin), `animation` (type, duration, delay)
- [x] Create `src/config/configLoader.js` that loads and validates JSON config
- [x] Loader merges job config with global defaults from `config/defaults.json`
- [x] Invalid config throws descriptive error messages
- [x] Typecheck passes
- [x] Unit tests cover schema validation and merging logic

#### US-002: Create Default Configuration File
**Description:** As a user, I want sensible defaults so that the application works without any configuration.

**Acceptance Criteria:**
- [x] Create `config/defaults.json` with current hardcoded values as defaults
- [x] Defaults include: font="THEBOLDFONT", fontSize=50, color="yellow", position={x:10, y:50}
- [x] Defaults include: dropshadow={enabled:false, color:"#000", blur:0, offsetX:-2, offsetY:3}
- [x] Defaults include: images={width:50, height:50, spacing:0, padding:5, margin:5}
- [x] Defaults include: animation={type:"none", duration:500, delay:0}
- [x] Typecheck passes

#### US-003: Integrate Config Loader into Video Processing Pipeline
**Description:** As a user, I want to pass a config file path to `processComboVideo` so that my custom styles are applied.

**Acceptance Criteria:**
- [x] Update `processComboVideo` signature to accept optional `configPath` parameter
- [x] Load and merge config at start of processing
- [x] Pass resolved config to `redrawFrameWithComboImages` and related functions
- [x] Existing calls without config continue to work (backward compatible)
- [x] Typecheck passes
- [x] Integration test verifies config is loaded and applied

---

### Phase 2: Text Styling

#### US-004: Implement Configurable Font and Font Size
**Description:** As a user, I want to specify custom fonts and sizes so that text matches my video style.

**Acceptance Criteria:**
- [x] Update `canvas.js` functions to accept font and fontSize from config
- [x] Support loading custom fonts via `registerFont` if font path provided in config
- [x] `estimateTextSize` uses config values instead of hardcoded "THEBOLDFONT" and 50
- [x] `createTextCanvasOfSize` uses config values for font rendering
- [x] Typecheck passes
- [x] Unit tests verify different fonts and sizes render correctly

#### US-005: Implement Configurable Text Color and Position
**Description:** As a user, I want to set text color and position so that overlays appear where I want them.

**Acceptance Criteria:**
- [x] Update `createTextCanvasOfSize` to accept `color` from config
- [x] Support hex colors (#RRGGBB), named colors, and rgba format
- [x] Position (x, y) read from config with CLI override capability
- [x] Typecheck passes
- [x] Unit tests verify color parsing and position application

#### US-006: Implement Text Dropshadow Effect
**Description:** As a user, I want dropshadow on text so that it stands out against busy backgrounds.

**Acceptance Criteria:**
- [x] Add dropshadow rendering in `createTextCanvasOfSize` using canvas shadow API
- [x] Apply `ctx.shadowColor`, `ctx.shadowBlur`, `ctx.shadowOffsetX`, `ctx.shadowOffsetY` from config
- [x] Dropshadow only applied when `dropshadow.enabled` is true in config
- [x] Typecheck passes
- [x] Unit tests verify shadow is rendered when enabled, not rendered when disabled

---

### Phase 3: Image Styling

#### US-007: Implement Configurable Image Dimensions
**Description:** As a user, I want to control input image sizes so that they scale appropriately for my video resolution.

**Acceptance Criteria:**
- [x] Update `drawInputImages` to use `images.width` and `images.height` from config
- [x] Update `calculateInputImagesDimensions` to use config values
- [x] Remove hardcoded `inputWidth=50, inputHeight=50` defaults
- [x] Typecheck passes
- [x] Unit tests verify dimension calculations with various config values

#### US-008: Implement Configurable Spacing, Padding, and Margins
**Description:** As a user, I want control over spacing between inputs and padding around the overlay so that layout looks professional.

**Acceptance Criteria:**
- [x] Add `spacing` config: gap between individual input images
- [x] Add `padding` config: space between images and blurred background edge
- [x] Add `margin` config: space between overlay and video frame edge
- [x] Update `drawBlurredBackground` to account for padding
- [x] Update `drawInputImages` to apply spacing between images
- [x] Typecheck passes
- [x] Unit tests verify spacing calculations

---

### Phase 4: Inline Markup System

#### US-009: Create Inline Markup Parser
**Description:** As a user, I want to write `[red]text[/red]` inline so that I can change colors mid-text.

**Acceptance Criteria:**
- [x] Create `src/text/markupParser.js` with `parseMarkup(text)` function
- [x] Parser returns array of segments: `[{text: "hello", styles: []}, {text: "world", styles: ["red"]}]`
- [x] Support color tags: `[red]`, `[#FF0000]`, `[color:red]`
- [x] Support newline tag: `[br]` or `[newline]`
- [x] Typecheck passes
- [x] Unit tests cover basic parsing

#### US-010: Support Nested Markup Styles
**Description:** As a user, I want to nest styles like `[bold][red]text[/red][/bold]` so that I can combine effects.

**Acceptance Criteria:**
- [x] Parser handles nested tags correctly, maintaining style stack
- [x] Support `[bold]`, `[italic]`, `[underline]` style tags
- [x] Nested styles combine: bold+red text renders as bold and red
- [x] Malformed nesting (e.g., `[a][b][/a][/b]`) handled gracefully with warning
- [x] Typecheck passes
- [x] Unit tests cover nesting scenarios

#### US-011: Render Parsed Markup to Canvas
**Description:** As a developer, I want to render parsed markup segments so that inline styles appear in the video.

**Acceptance Criteria:**
- [x] Create `src/text/markupRenderer.js` with `renderMarkup(ctx, segments, x, y, baseConfig)` function
- [x] Each segment rendered with its combined styles applied
- [x] Track x position as each segment is drawn for proper flow
- [x] Handle `[br]` by advancing y position and resetting x
- [x] Integrate with existing `createTextCanvasOfSize` flow
- [x] Typecheck passes
- [x] Visual tests verify multi-color text renders correctly

---

### Phase 5: Text Animation

#### US-012: Implement Animation Configuration Schema
**Description:** As a developer, I want animation settings in config so that fade effects can be controlled.

**Acceptance Criteria:**
- [x] Add animation schema: `{type: "none"|"fade", duration: number, delay: number, perCharacter: boolean}`
- [x] Validate animation config in schema loader
- [x] Default animation type is "none" for backward compatibility
- [x] Typecheck passes

#### US-013: Implement Fade-In Animation for Text
**Description:** As a user, I want text to fade in so that overlays appear smoothly.

**Acceptance Criteria:**
- [x] Create `src/animation/fadeAnimation.js` with fade-in logic
- [x] Calculate alpha value based on frame number, duration, and fps
- [x] Support per-character fade (staggered) when `perCharacter: true`
- [x] Apply alpha to text rendering context before drawing
- [x] Typecheck passes
- [x] Unit tests verify alpha calculations at various frame points

#### US-014: Implement Fade-Out Animation for Text
**Description:** As a user, I want text to fade out so that overlays disappear smoothly.

**Acceptance Criteria:**
- [x] Extend `fadeAnimation.js` with fade-out logic
- [x] Support config for `fadeOutStart` (frame or percentage of duration)
- [x] Fade-out can combine with fade-in (fade in, hold, fade out)
- [x] Typecheck passes
- [x] Unit tests verify fade-out alpha calculations

#### US-015: Integrate Animation into Frame Rendering
**Description:** As a developer, I want animations applied during `redrawFrameWithComboImages` so that each frame reflects the animation state.

**Acceptance Criteria:**
- [x] Pass frame number and total frames to animation calculator
- [x] Apply calculated alpha/transform before drawing text
- [x] Animation state persists correctly across all frames
- [x] No animation when `type: "none"` (existing behavior)
- [x] Typecheck passes
- [x] Integration test verifies animation across frame sequence

---

### Phase 6: Electron Editor - Foundation

#### US-016: Create Electron App Shell
**Description:** As a user, I want to launch a preview editor so that I can see my changes visually.

**Acceptance Criteria:**
- [x] Create `editor/` directory with Electron main process (`main.js`)
- [x] Create basic `index.html` with placeholder layout
- [x] Add npm scripts: `editor:dev` and `editor:build`
- [x] App launches and displays window with title "Combo Clip Composer Editor"
- [x] Add electron and electron-builder as devDependencies
- [x] Typecheck passes

#### US-017: Implement Video Loading in Editor
**Description:** As a user, I want to load a video file so that I can preview overlays on it.

**Acceptance Criteria:**
- [x] Add "Open Video" menu item and button
- [x] Use Electron dialog to select video file
- [x] Extract frames from video to temp directory using existing `extractFrames`
- [x] Display loading indicator during extraction
- [x] Store frame paths in editor state
- [x] Typecheck passes

#### US-018: Implement Frame Display Panel
**Description:** As a user, I want to see the current frame so that I can position overlays visually.

**Acceptance Criteria:**
- [x] Create canvas-based frame display component
- [x] Display selected frame from extracted frames
- [x] Support zoom in/out (fit, 50%, 100%, 200%)
- [x] Display frame dimensions and current zoom level
- [x] Typecheck passes

---

### Phase 7: Electron Editor - Timeline

#### US-019: Implement Basic Timeline Component
**Description:** As a user, I want a timeline so that I can scrub through the video.

**Acceptance Criteria:**
- [x] Create timeline component showing frame range
- [x] Playhead indicator shows current frame
- [x] Click on timeline to jump to frame
- [x] Drag playhead to scrub through frames
- [x] Display current frame number and timecode
- [x] Typecheck passes

#### US-020: Implement Timeline Playback Controls
**Description:** As a user, I want play/pause controls so that I can preview the video in motion.

**Acceptance Criteria:**
- [x] Add play/pause button that advances frames at video FPS
- [x] Add step forward/backward buttons (single frame)
- [x] Add jump to start/end buttons
- [x] Keyboard shortcuts: Space (play/pause), Left/Right (step), Home/End (jump)
- [x] Typecheck passes

#### US-021: Implement Timeline Zoom and Scroll
**Description:** As a user, I want to zoom the timeline so that I can make precise edits.

**Acceptance Criteria:**
- [x] Timeline zoom slider (show more or fewer frames)
- [x] Horizontal scroll when zoomed in
- [x] Mouse wheel zoom on timeline
- [x] Zoom to fit all frames button
- [x] Typecheck passes

---

### Phase 8: Electron Editor - Overlay Preview

#### US-022: Implement Live Overlay Preview on Frame
**Description:** As a user, I want to see overlays rendered on the current frame so that I can adjust positioning.

**Acceptance Criteria:**
- [x] Render combo input images on frame canvas using existing canvas logic
- [x] Render text overlays with current config
- [x] Update preview when config changes
- [x] Preview matches final render output
- [x] Typecheck passes

#### US-023: Implement Drag-to-Position Overlays
**Description:** As a user, I want to drag overlays to position them so that I don't need to guess coordinates.

**Acceptance Criteria:**
- [x] Click and drag overlay elements on canvas
- [x] Update x, y position in config as user drags
- [x] Show position coordinates while dragging
- [x] Snap to grid option (configurable grid size)
- [x] Typecheck passes

#### US-024: Implement Config Property Panel
**Description:** As a user, I want a property panel so that I can edit all config values.

**Acceptance Criteria:**
- [x] Side panel showing all config properties
- [x] Input fields for text: font dropdown, size number input, color picker
- [x] Input fields for images: width, height, spacing, padding, margin
- [x] Input fields for dropshadow: enabled toggle, color, blur, offsets
- [x] Changes update preview in real-time
- [x] Typecheck passes

---

### Phase 9: Electron Editor - Keyframes

#### US-025: Implement Keyframe Data Model
**Description:** As a developer, I want a keyframe data structure so that properties can change over time.

**Acceptance Criteria:**
- [x] Create `editor/models/keyframe.js` with Keyframe class
- [x] Keyframe stores: frame number, property name, value
- [x] KeyframeTrack stores ordered list of keyframes for one property
- [x] Support interpolation types: linear, ease-in, ease-out, step
- [x] Typecheck passes
- [x] Unit tests verify keyframe data model

#### US-026: Implement Keyframe UI on Timeline
**Description:** As a user, I want to see keyframes on the timeline so that I can manage animation points.

**Acceptance Criteria:**
- [x] Display keyframe markers (diamonds) on timeline for each property track
- [x] Tracks for: position.x, position.y, opacity, scale
- [x] Click keyframe to select it
- [x] Drag keyframe to move it to different frame
- [x] Typecheck passes

#### US-027: Implement Add/Remove Keyframe
**Description:** As a user, I want to add and remove keyframes so that I can define animation points.

**Acceptance Criteria:**
- [x] "Add Keyframe" button creates keyframe at current frame with current values
- [x] Right-click keyframe shows delete option
- [x] Keyboard shortcut: K to add keyframe, Delete to remove selected
- [x] Undo/redo support for keyframe operations
- [x] Typecheck passes

#### US-028: Implement Keyframe Interpolation
**Description:** As a user, I want smooth transitions between keyframes so that animations look natural.

**Acceptance Criteria:**
- [x] Calculate interpolated value for any frame between keyframes
- [x] Linear interpolation as default
- [x] Ease-in/ease-out using cubic bezier curves
- [x] Step interpolation (jump to next value, no smooth transition)
- [x] Right-click keyframe to change interpolation type
- [x] Typecheck passes
- [x] Unit tests verify interpolation calculations

---

### Phase 10: Electron Editor - Export

#### US-029: Implement Project Save/Load
**Description:** As a user, I want to save my project so that I can continue editing later.

**Acceptance Criteria:**
- [x] Save project as JSON file (`.ccc` extension - Combo Clip Composer)
- [x] Project file includes: source video path, config, keyframes, combo text
- [x] "Save" and "Save As" menu items with Ctrl+S shortcut
- [x] "Open Project" loads saved project file
- [x] Warn on unsaved changes when closing
- [x] Typecheck passes

#### US-030: Implement Video Export
**Description:** As a user, I want to export the final video so that I can share my combo video.

**Acceptance Criteria:**
- [x] "Export Video" menu item opens export dialog
- [x] Progress bar shows export progress
- [x] Use existing `processComboVideo` pipeline with editor config and keyframes
- [x] Support cancel export operation
- [x] Show success message with output file path
- [x] Typecheck passes

#### US-031: Implement Config Export
**Description:** As a user, I want to export just the config so that I can use it with the CLI.

**Acceptance Criteria:**
- [x] "Export Config" saves current config as JSON file
- [x] Exported config works with CLI `--config` flag
- [x] Option to export with or without keyframes
- [x] Typecheck passes

---

## Non-Goals

- Real-time video playback with audio in editor (frames only)
- Cloud storage or collaboration features
- Mobile/web version of the editor
- Video editing features (cut, trim, transitions) - use existing `trimVideo` separately
- Support for non-SVG input images
- Plugin or extension system

## Technical Considerations

- **Electron version:** Use Electron 28+ for modern features and security
- **State management:** Consider using a simple store pattern (no Redux needed for this scope)
- **Canvas performance:** For large videos, consider rendering preview at reduced resolution
- **Keyframe storage:** Store keyframes separately from base config to keep config files clean
- **Font loading:** Custom fonts need to be loaded before any canvas operations
- **Existing code reuse:** Leverage `videoUtils.js`, `canvas.js`, and `imageGen.js` for rendering logic

---

## Phase 11: Hybrid Video Preview with Immediate Playback

### Introduction

Currently, when opening a video, users must wait for all frames to be extracted before seeing any preview. This phase adds a hybrid preview system where the video displays immediately in an HTML5 `<video>` element for playback while frames extract in the background. This enables immediate review of footage while maintaining frame-accurate editing for notation placement.

### Goals

- Provide immediate video feedback when a file is opened (no waiting for full frame extraction)
- Enable smooth video playback with standard controls (play/pause, volume, progress)
- Support frame-by-frame navigation for precise combo notation placement
- Extract frames in background so overlay editing functionality remains available
- Maintain existing frame canvas for overlay preview once frames are extracted

---

#### US-032: Add HTML5 Video Element to Preview Container

**Description:** As an editor user, I want to see the video immediately after opening it, so that I don't have to wait for frame extraction to preview my footage.

**Acceptance Criteria:**
- [x] Add a `<video>` element inside `#previewContainer` (hidden by default)
- [x] Video element should have `id="videoPlayer"` for JavaScript access
- [x] Add CSS styling for the video element to fit within the preview container (respect zoom settings)
- [x] Video element should be hidden when no video is loaded
- [x] Typecheck passes (if applicable) and no console errors

---

#### US-033: Display Video Immediately on Open

**Description:** As an editor user, I want the video to appear in the preview area as soon as I select it, so that I can start reviewing the content immediately.

**Acceptance Criteria:**
- [x] When "Open Video" is clicked and file selected, video loads into `<video>` element immediately
- [x] Video element becomes visible, placeholder is hidden
- [x] Video source is set to the selected file path (using file:// protocol)
- [x] Loading overlay shows "Loading video..." during initial load
- [x] Video `loadedmetadata` event triggers UI update (shows video dimensions in frame info)
- [x] Verify in browser: selecting a video file displays it immediately

---

#### US-034: Add Video Playback Controls Overlay

**Description:** As an editor user, I want play/pause, volume, and progress controls on the video, so that I can easily preview my footage.

**Acceptance Criteria:**
- [x] Add a controls overlay div positioned over the video area
- [x] Include play/pause button that toggles video playback
- [x] Include volume slider (0-100%) with mute toggle
- [x] Include progress bar showing current position / duration
- [x] Controls overlay appears on hover, fades when mouse leaves (CSS transitions)
- [x] Clicking progress bar seeks to that position
- [x] Verify in browser: controls work and video plays/pauses correctly

---

#### US-035: Implement Frame-by-Frame Stepping via Video Element

**Description:** As an editor user, I want to step through the video frame-by-frame using the existing timeline controls, so that I can precisely position combo notations.

**Acceptance Criteria:**
- [x] Step forward button (`#btnStepForward`) advances video by 1 frame (1/fps seconds)
- [x] Step backward button (`#btnStepBack`) rewinds video by 1 frame
- [x] Current frame number updates in timeline display when stepping
- [x] Timecode display updates to match video currentTime
- [x] Video pauses automatically when stepping (if playing)
- [x] Verify in browser: stepping moves exactly one frame at a time

---

#### US-036: Background Frame Extraction with Progress

**Description:** As an editor user, I want frames to extract in the background while I preview the video, so that I can start reviewing immediately without blocking on extraction.

**Acceptance Criteria:**
- [x] Frame extraction starts automatically after video metadata is loaded
- [x] Extraction runs asynchronously (does not block UI or video playback)
- [x] Status bar or loading subtext shows extraction progress (e.g., "Extracting frames... 45%")
- [x] When extraction completes, `editorState` is updated with frame paths
- [x] Overlay controls (combo text input, apply button) become enabled only after extraction completes
- [x] Verify in browser: video is playable while "Extracting frames..." message shows

---

#### US-037: Sync Video Player with Frame Canvas

**Description:** As an editor user, I want the frame canvas to show the same frame as the video player position, so that I can see overlays on the current frame.

**Acceptance Criteria:**
- [x] When extraction completes, current video time maps to nearest extracted frame
- [x] Seeking/scrubbing in video player updates the frame canvas to matching frame
- [x] Frame stepping updates both video position and frame canvas simultaneously
- [x] Add toggle button/checkbox to switch between video player view and frame canvas view
- [x] Verify in browser: pausing video and switching to frame canvas shows same frame

---

#### US-038: Enable Timeline Controls for Video Player

**Description:** As an editor user, I want the timeline controls (play/pause, step, jump) to work with the video player before extraction completes.

**Acceptance Criteria:**
- [x] Timeline play/pause button (`#btnPlayPause`) controls video playback
- [x] Jump to start (`#btnJumpStart`) seeks video to 0:00
- [x] Jump to end (`#btnJumpEnd`) seeks video to duration
- [x] Timeline playhead position syncs with video currentTime during playback
- [x] Clicking on timeline ruler seeks video to that position
- [x] Enable timeline controls immediately when video loads (don't wait for extraction)
- [x] Verify in browser: all timeline controls work with video before frames are extracted

---

### Non-Goals (Phase 11)

- Audio waveform visualization in timeline
- Video format conversion or transcoding
- Streaming/URL video sources (local files only for now)
- Picture-in-picture mode

### Technical Considerations (Phase 11)

- HTML5 `<video>` element can use `file://` protocol for local files in Electron with appropriate settings
- Frame-accurate seeking requires calculating `currentTime = frameNumber / fps`
- Consider using `video.requestVideoFrameCallback()` for precise frame callbacks (Chrome/Electron supported)
- The existing `frameCanvas` should remain for overlay preview; video player is for quick preview/playback
- May need to update IPC flow: return video path immediately to renderer, run extraction in background via separate IPC channel
- Use `video.currentTime` setter for seeking; it may not be frame-accurate on all codecs
- Consider showing a visual indicator when video player time and frame canvas are out of sync

---

## Phase 12: Asset Browser Panel

### Introduction

Add an asset browser panel to the editor that allows users to load, view, and use image assets with their associated notation codes. Users load a directory containing images and a `mapping.txt` file that defines notation-to-filename mappings. The panel displays all assets organized by game/folder, and clicking a notation inserts it into the combo input field.

### Goals

- Allow users to browse available input notation images and their codes
- Support loading custom asset packs via folder selection or drag-and-drop
- Organize assets by game category (subfolder-based grouping)
- Enable quick insertion of notation into the combo input field
- Persist the last loaded asset directory between sessions

---

#### US-039: Add Asset Panel UI Shell

**Description:** As a user, I want to see a new "Assets" panel in the right side of the editor so that I have a dedicated space for browsing input notation images.

**Acceptance Criteria:**
- [x] Add a new collapsible panel section in the right panel area (below or as a tab alongside timeline)
- [x] Panel has a header labeled "ASSETS"
- [x] Panel has an empty state message: "No assets loaded. Drop a folder or click to browse."
- [x] Panel styling matches existing editor theme (dark background, consistent fonts)
- [x] Typecheck passes (if applicable)
- [x] Verify panel displays correctly in browser

---

#### US-040: Implement Folder Loading via Button

**Description:** As a user, I want to click a button to select an asset folder so that I can load my notation images.

**Acceptance Criteria:**
- [x] Add a "Load Folder" button in the asset panel
- [x] Clicking button opens a folder picker dialog
- [x] Selected folder path is stored for processing
- [x] Button is disabled while loading and shows loading state
- [x] Error message displays if folder selection fails or is cancelled
- [x] Typecheck passes
- [x] Verify folder selection works in browser

---

#### US-041: Implement Folder Loading via Drag-and-Drop

**Description:** As a user, I want to drag and drop a folder onto the asset panel so that I can quickly load assets.

**Acceptance Criteria:**
- [x] Asset panel accepts folder drag-and-drop
- [x] Visual feedback shows when dragging over the panel (highlight border)
- [x] Dropping a folder triggers the same loading flow as button selection
- [x] Dropping non-folder items shows an error message
- [x] Typecheck passes
- [x] Verify drag-and-drop works in browser

---

#### US-042: Parse mapping.txt File Format

**Description:** As a user, I want my `mapping.txt` file to be automatically detected and parsed so that the editor knows which notation corresponds to which image.

**Acceptance Criteria:**
- [x] System looks for `mapping.txt` in the loaded folder root
- [x] File format: one mapping per line as `notation,filename` (e.g., `df,df.png`)
- [x] Parser handles various image extensions (.svg, .png, .jpg, .gif)
- [x] Parser trims whitespace from notation and filename
- [x] Parser skips empty lines and lines starting with `#` (comments)
- [x] Error displayed if `mapping.txt` is missing or malformed
- [x] Returns array of `{ notation, filename, filepath }` objects
- [x] Typecheck passes

---

#### US-043: Display Asset Grid with Images and Notation

**Description:** As a user, I want to see all loaded assets displayed as a grid showing the image and its notation so that I can easily find the input I need.

**Acceptance Criteria:**
- [x] Assets display in a scrollable grid layout within the panel
- [x] Each asset shows: thumbnail image (scaled to ~48x48px) and notation text below
- [x] Images that fail to load show a placeholder/error state
- [x] Asset count displayed in panel header (e.g., "ASSETS (24)")
- [x] Grid is responsive to panel width
- [x] Typecheck passes
- [x] Verify assets display correctly in browser

---

#### US-044: Organize Assets by Game Category

**Description:** As a user, I want assets grouped by game (e.g., "Tekken7", "Common") so that I can find related inputs together.

**Acceptance Criteria:**
- [x] Assets are grouped by subfolder name within the loaded directory
- [x] Each group has a collapsible header with the folder/game name
- [x] Groups default to expanded state
- [x] Assets in root folder (no subfolder) grouped under "General"
- [x] Empty groups are hidden
- [x] Typecheck passes
- [x] Verify grouping displays correctly in browser

---

#### US-045: Insert Notation on Asset Click

**Description:** As a user, I want to click an asset to insert its notation into the combo input field so that I can quickly build combos.

**Acceptance Criteria:**
- [x] Clicking an asset inserts its notation at the cursor position in the combo input field
- [x] If no cursor position, notation appends to the end with a space separator
- [x] Visual feedback on click (brief highlight/press effect)
- [x] Focus returns to combo input field after insertion
- [x] Typecheck passes
- [x] Verify insertion works correctly in browser

---

#### US-046: Persist Last Loaded Asset Directory

**Description:** As a user, I want the editor to remember my last loaded asset folder so that I don't have to re-select it every time.

**Acceptance Criteria:**
- [x] Last loaded folder path saved to localStorage
- [x] On editor load, if saved path exists, automatically attempt to reload assets
- [x] If auto-reload fails (folder moved/deleted), show message and clear saved path
- [x] "Clear" or "Unload" button available to remove current assets and clear saved path
- [x] Typecheck passes
- [x] Verify persistence works across browser sessions

---

### Non-Goals (Phase 12)

- Editing or creating new asset images within the editor
- Editing the `mapping.txt` file from within the editor
- Supporting nested subfolder hierarchies (only one level of game folders)
- Cloud sync or sharing of asset packs
- Searching/filtering assets by notation (may be added later)

### Technical Considerations (Phase 12)

- The editor is a single HTML file with embedded JS/CSS
- Use the existing panel styling patterns (`.panel-header`, `.panel-content`)
- For Electron/file access, leverage existing file handling patterns in the codebase
- localStorage key suggestion: `comboClipComposer_lastAssetFolder`
- Image loading should handle both absolute paths and relative paths within the folder
- The `mapping.txt` format is simple CSV-like: `notation,filename` per line
- Example `mapping.txt`:
  ```
  # Directional inputs
  df,df.svg
  f,f.svg
  d,d.svg

  # Button inputs
  1,1.svg
  2,2.svg
  1+2,1+2.svg
  ```

---

## Phase 13: Tekken 7 Base Asset Pack

### Introduction

Create a ready-to-use `mapping.txt` file in the existing `assets/games/` directory that maps all Tekken 7 button inputs and common directional inputs to their SVG files. This provides users with a working asset pack they can immediately load in the Asset Browser Panel.

### Goals

- Provide a complete, working asset pack for Tekken 7 notation out of the box
- Map all button inputs (1, 2, 3, 4 and combinations)
- Map all directional inputs including held variants (d, df, f, etc. + dp, dfp, fp, etc.)
- Follow the mapping.txt format established in Phase 12

---

#### US-047: Create Tekken 7 Base Asset Mapping File

**Description:** As a user, I want a pre-configured mapping.txt file for Tekken 7 inputs so that I can immediately use the Asset Browser Panel without creating my own mappings.

**Acceptance Criteria:**
- [x] Create `assets/games/mapping.txt` file
- [x] Map all Tekken7 button inputs: 1, 2, 3, 4, and all combinations (1+2, 1+3, 1+4, 2+3, 2+4, 3+4, 1+2+3, 1+2+4, 1+3+4, 2+3+4, 1+2+3+4)
- [x] Map all common directional inputs: d, df, f, db, b, u, uf, ub, n (neutral)
- [x] Map all held directional variants: dp, dfp, fp, bp, up, ufp, ubp, dbp
- [x] Map separator image: sep
- [x] Exclude special character files: `().svg`, `(.svg`, `).svg`, `0.svg`
- [x] Use subfolder paths in filenames: `Tekken7/images/1.svg`, `common/images/df.svg`
- [x] Include descriptive comments grouping inputs by category
- [x] File follows the format: `notation,subfolder/images/filename.svg`
- [x] Verify file loads correctly in Asset Browser Panel

---

### Non-Goals (Phase 13)

- Creating new SVG images
- Modifying existing image files
- Supporting other games (Street Fighter, etc.) - future phases

### Technical Considerations (Phase 13)

- The mapping.txt lives at `assets/games/mapping.txt` (root of games folder)
- Subfolder paths use forward slashes for cross-platform compatibility
- File uses categories via comment headers for organization in the Asset Browser
- The `dfa.svg` file appears to be a variant - include if it represents a distinct notation

---

## Phase 14: Asset Browser - Select Mapping File Instead of Folder

### Introduction

Refactor the Asset Browser Panel to select a `mapping.txt` file directly instead of selecting a folder. This simplifies the user experience since users explicitly choose which mapping file to load, and image paths in the mapping file are resolved relative to the file's location.

### Goals

- Change file picker from folder selection to .txt file selection
- Update drag-and-drop to accept .txt files instead of folders
- Resolve image paths relative to the mapping.txt file location
- Update all UI labels to reflect file-based selection

---

#### US-048: Change Folder Picker to File Picker

**Description:** As a user, I want to select a mapping.txt file directly so that I have explicit control over which mapping file is loaded.

**Acceptance Criteria:**
- [x] Change IPC handler `handleSelectAssetFolder` to `handleSelectAssetFile`
- [x] Update dialog filter to accept .txt files: `{ name: 'Mapping Files', extensions: ['txt'] }`
- [x] Update `openAssetFolderDialog` to `openAssetFileDialog` with file selection (not directory)
- [x] Store selected file path in `editorState.assets.filePath` (rename from `folderPath`)
- [x] Typecheck passes
- [x] Verify file selection works in browser

---

#### US-049: Update Path Resolution for Mapping File

**Description:** As a user, I want image paths in my mapping.txt resolved relative to the file's location so that my asset pack is portable.

**Acceptance Criteria:**
- [x] Update `handleParseAssetMapping` to accept file path instead of folder path
- [x] Extract directory from file path using `path.dirname()`
- [x] Resolve image paths relative to the mapping file's directory
- [x] Update renderer's `loadAssetFolderByPath` to `loadAssetFile` (pass file path)
- [x] Existing mapping.txt format continues to work (e.g., `df,common/images/df.svg`)
- [x] Typecheck passes

---

#### US-050: Update Drag-and-Drop to Accept Files

**Description:** As a user, I want to drag and drop a .txt file onto the asset panel so that I can quickly load a mapping file.

**Acceptance Criteria:**
- [x] Update `onAssetDrop` to check for .txt file extension instead of directory
- [x] Remove `handleCheckIsDirectory` IPC call (no longer needed for files)
- [x] Show error message if dropped item is not a .txt file
- [x] Dropped .txt file triggers same loading flow as file picker
- [x] Typecheck passes
- [x] Verify drag-and-drop works in browser

---

#### US-051: Update UI Labels and Text

**Description:** As a user, I want clear labels indicating I'm selecting a mapping file so that the interface is intuitive.

**Acceptance Criteria:**
- [x] Update empty state message: "No mapping loaded. Drop a file or click to browse."
- [x] Update button text: "Load Mapping File" (was "Load Folder")
- [x] Update loading state text: "Loading mapping..." (was "Loading...")
- [x] Update error messages to reference "mapping file" instead of "folder"
- [x] Update localStorage key to `comboClipComposer_lastAssetFile` (migration: clear old key)
- [x] Typecheck passes
- [x] Verify updated labels display correctly in browser

---

### Non-Goals (Phase 14)

- Supporting multiple mapping files simultaneously
- Auto-detecting mapping.txt files in folders
- Changing the mapping.txt file format itself

### Technical Considerations (Phase 14)

- Use `path.dirname(filePath)` to get the directory containing the mapping file
- Image filepath resolution: `path.join(path.dirname(mappingFilePath), imageRelativePath)`
- The IPC handler rename should be atomic (update both main.js and renderer together)
- Clear the old localStorage key `comboClipComposer_lastAssetFolder` on first load to migrate users
