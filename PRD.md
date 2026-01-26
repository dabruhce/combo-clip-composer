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

---

## Phase 15: Horizontal Layers Panel Above Timeline

### Introduction

Move the Layers panel from the right sidebar to a full-width horizontal panel positioned directly above the timeline controls. This layout is more similar to professional video editing software (Premiere, DaVinci Resolve) where layers/tracks are displayed horizontally above the timeline, making it easier to see the relationship between layers and time.

### Goals

- Relocate Layers panel from right sidebar to above timeline
- Create a full-width horizontal panel with collapsible layer rows
- Add collapse/expand toggle functionality
- Update right panel to contain only the Assets panel

---

#### US-052: Create Horizontal Layers Panel Structure

**Description:** As a user, I want a horizontal layers panel above the timeline so that I can see layers in a layout similar to professional video editors.

**Acceptance Criteria:**
- [x] Create new `.layers-panel` div positioned between main content area and timeline
- [x] Panel spans full width of the editor (same width as timeline)
- [x] Panel has header with "LAYERS" title and collapse toggle button (▼/▶)
- [x] Panel content area displays layer rows horizontally
- [x] Default height approximately 120px when expanded
- [x] Styling matches existing dark theme (#252526 background, consistent fonts)
- [x] Typecheck passes
- [x] Verify panel displays correctly in browser

---

#### US-053: Implement Layers Panel Collapse/Expand

**Description:** As a user, I want to collapse the layers panel so that I can maximize timeline space when not editing layers.

**Acceptance Criteria:**
- [x] Toggle button in panel header switches between expanded (▼) and collapsed (▶) states
- [x] Collapsed state hides layer content, showing only the header bar (~32px height)
- [x] Expanded state shows full panel with layer rows (~120px height)
- [x] Add `toggleLayersPanel()` JavaScript function
- [x] Collapse state persists via CSS class `.collapsed` on panel
- [x] Smooth CSS transition for expand/collapse animation (0.2s)
- [x] Typecheck passes
- [x] Verify collapse/expand works in browser

---

#### US-054: Move Layers Content to Horizontal Panel

**Description:** As a user, I want my layer information displayed in the new horizontal panel so that all layer functionality works in the new location.

**Acceptance Criteria:**
- [x] Remove Layers section from `.panel-right` (keep only Assets panel)
- [x] Move existing layers placeholder text ("No layers yet") to new horizontal panel
- [x] Update `.panel-right` header to just show "Assets" or remove redundant header
- [x] Layer rows display horizontally with layer name on left, track area on right
- [x] Each layer row has consistent height (~28px)
- [x] Empty state message centered in panel content area
- [x] Typecheck passes
- [x] Verify layers content displays in new location

---

#### US-055: Style Layer Rows for Horizontal Layout

**Description:** As a user, I want layer rows styled appropriately for the horizontal layout so that they align with the timeline tracks below.

**Acceptance Criteria:**
- [x] Each layer row has: visibility toggle (eye icon), layer name, and track area
- [x] Layer name column has fixed width (~120px) matching keyframe track labels
- [x] Track area fills remaining width and aligns with timeline content below
- [x] Layer rows have subtle borders/separators between them
- [x] Hover state highlights layer row
- [x] Selected layer has distinct background color
- [x] Typecheck passes
- [x] Verify layer row styling in browser

---

### Non-Goals (Phase 15)

- Drag-and-drop layer reordering (future enhancement)
- Layer grouping or nesting
- Layer locking functionality
- Multiple layer selection
- Actual layer track content (this phase is layout only)

### Technical Considerations (Phase 15)

- The new `.layers-panel` should be a sibling to `.timeline`, inserted just before it in the DOM
- Use CSS flexbox for the horizontal layout with fixed left column and flexible right area
- The layer track area width should sync with timeline content width for visual alignment
- Consider using CSS custom properties for shared dimensions (e.g., `--layer-label-width: 120px`)
- The existing "No layers yet" placeholder is sufficient for now; actual layer functionality is future work
- Panel collapse state could be persisted to localStorage (optional, not required)

---

## Phase 16: Combo Overlay Timing (In/Out Points)

### Introduction

Add the ability to control when the combo notation overlay appears and disappears in the video by setting start and end frame numbers. This allows users to time the overlay to match specific moments in their gameplay footage, such as showing inputs only during the combo execution.

### Goals

- Add start frame and end frame input fields to the Properties panel
- Display a visual bar on the combo layer track showing the overlay's visible duration
- Update the preview to show/hide the overlay based on current frame position
- Ensure the timing is respected during video export

---

#### US-056: Add Timing Input Fields to Properties Panel

**Description:** As a user, I want to enter start and end frame numbers so that I can control when the combo overlay appears and disappears.

**Acceptance Criteria:**
- [x] Add "Timing" section to Properties panel (collapsible, below existing sections)
- [x] Add "Start Frame" number input with min=0, default=0
- [x] Add "End Frame" number input with min=0, default=0 (0 means "end of video")
- [x] Store timing values in `editorState.overlay.startFrame` and `editorState.overlay.endFrame`
- [x] Input fields update state on change
- [x] Validate that startFrame <= endFrame (show error if invalid)
- [x] Disable inputs until video is loaded
- [x] Typecheck passes
- [x] Verify inputs display and work correctly in browser

---

#### US-057: Display Duration Bar on Combo Layer Track

**Description:** As a user, I want to see a visual bar on the combo layer track so that I can easily see when the overlay will be visible.

**Acceptance Criteria:**
- [x] Add duration bar element to the combo overlay layer track area
- [x] Bar starts at position corresponding to startFrame
- [x] Bar ends at position corresponding to endFrame (or video end if endFrame=0)
- [x] Bar uses distinct color (e.g., blue/teal) to stand out
- [x] Bar position and width update when timing inputs change
- [x] Bar position and width update when timeline zoom changes
- [x] Create `updateLayerDurationBar()` function to sync bar with state
- [x] Typecheck passes
- [x] Verify bar displays correctly and updates in browser

---

#### US-058: Update Preview Based on Current Frame Timing

**Description:** As a user, I want the overlay to appear/disappear in the preview as I scrub through the timeline so that I can see exactly how it will look in the final video.

**Acceptance Criteria:**
- [x] Modify `drawOverlay()` to check if current frame is within timing range
- [x] Overlay draws only when: `startFrame <= currentFrame <= endFrame`
- [x] If endFrame is 0, treat as "until end of video" (endFrame = frameCount - 1)
- [x] Preview updates correctly when scrubbing timeline
- [x] Preview updates correctly when stepping frame-by-frame
- [x] Preview updates correctly during playback
- [x] Typecheck passes
- [x] Verify overlay visibility changes based on timing in browser

---

#### US-059: Include Timing in Project Save/Export

**Description:** As a user, I want my timing settings saved with the project and respected during export so that my final video has the correct overlay timing.

**Acceptance Criteria:**
- [x] Add `startFrame` and `endFrame` to project save data (`createProjectData()`)
- [x] Load timing values when opening project (`applyProjectData()`)
- [x] Pass timing values to export process
- [x] Update `processComboVideo` or rendering logic to respect start/end frames
- [x] Overlay only renders on frames within the timing range during export
- [x] Typecheck passes
- [x] Verify timing persists after save/load cycle

---

### Non-Goals (Phase 16)

- Draggable handles to resize the duration bar (future enhancement)
- Multiple timing ranges for the same overlay (split appearances)
- Per-input timing (each notation appears at different times)
- Fade in/out at timing boundaries (use existing animation system if needed)

### Technical Considerations (Phase 16)

- Duration bar position formula: `left = (startFrame / (frameCount - 1)) * trackWidth`
- Duration bar width formula: `width = ((endFrame - startFrame) / (frameCount - 1)) * trackWidth`
- Must sync with timeline zoom: multiply by `editorState.timelineZoom`
- The existing "Combo Overlay" sample layer row should become the actual combo layer
- Consider showing frame numbers on hover over the duration bar
- Default endFrame=0 is a sentinel value meaning "end of video" for simpler UX

---

## Phase 17: Multiple Combo Overlays

### Introduction

Transform the editor from supporting a single combo overlay to supporting multiple independent overlays. Each overlay has its own notation text, position, timing (start/end frames), and styling. This enables complex combo videos where different inputs appear at different times, such as showing "d df f" from frames 1-100 and "2" from frames 30-120.

### Goals

- Support unlimited combo overlays, each with independent settings
- Add "Add Overlay" button to create new overlays
- Click layer to select it and edit its properties in the Properties panel
- Multiple ways to delete overlays (button, right-click, Delete key)
- Overlays render in layer order with proper timing
- Preview and export respect all overlay timings

---

#### US-060: Refactor Data Model for Multiple Overlays

**Description:** As a developer, I want the data model to support multiple overlays so that users can create and manage many independent combo overlays.

**Acceptance Criteria:**
- [x] Change `editorState.overlay` (single object) to `editorState.overlays` (array)
- [x] Each overlay object has: `id`, `name`, `comboText`, `xOffset`, `yOffset`, `startFrame`, `endFrame`, `visible`, `config` (image settings)
- [x] Add `editorState.selectedOverlayId` to track which overlay is selected
- [x] Add `generateOverlayId()` function to create unique IDs
- [x] Add `getSelectedOverlay()` helper function
- [x] Add `getOverlayById(id)` helper function
- [x] Migrate existing single overlay to first item in array on load
- [x] Typecheck passes

---

#### US-061: Add "Add Overlay" Button and Creation Logic

**Description:** As a user, I want to click an "Add Overlay" button so that I can create new combo overlays.

**Acceptance Criteria:**
- [x] Add "Add Overlay" button (+ icon) in layers panel header
- [x] Button disabled until video is loaded
- [x] Clicking creates new overlay with default values (empty text, position 10,50, timing 0-0)
- [x] New overlay gets auto-generated name: "Overlay 1", "Overlay 2", etc.
- [x] New overlay is automatically selected after creation
- [x] New layer row appears in layers panel
- [x] Create `addOverlay()` function
- [x] Typecheck passes
- [x] Verify button works in browser

---

#### US-062: Implement Layer Selection and Properties Binding

**Description:** As a user, I want to click a layer to select it so that I can edit its properties in the Properties panel.

**Acceptance Criteria:**
- [x] Clicking layer row selects that overlay (updates `selectedOverlayId`)
- [x] Selected layer has visual highlight (existing `.selected` class)
- [x] Properties panel inputs bind to selected overlay's values
- [x] Changing properties updates the selected overlay in the array
- [x] Create `selectOverlay(id)` function
- [x] Create `updatePropertiesPanel()` function to sync inputs with selected overlay
- [x] Create `applyPropertiesToSelectedOverlay()` function for input changes
- [x] If no overlay selected, Properties panel shows disabled state or message
- [x] Typecheck passes
- [x] Verify selection and property editing works in browser

---

#### US-063: Implement Delete Overlay Functionality

**Description:** As a user, I want multiple ways to delete overlays so that I can easily remove unwanted layers.

**Acceptance Criteria:**
- [x] Add delete button (X or trash icon) on each layer row
- [x] Right-click layer row shows context menu with "Delete Overlay" option
- [x] Pressing Delete key removes selected overlay
- [x] Create `deleteOverlay(id)` function
- [x] After deletion, select next overlay (or previous, or none if empty)
- [x] Confirm deletion if overlay has content (optional, can skip)
- [x] Cannot delete if it's the last overlay (or allow empty state)
- [x] Layer row removed from layers panel
- [x] Typecheck passes
- [x] Verify all delete methods work in browser

---

#### US-064: Update Layers Panel for Multiple Overlays

**Description:** As a user, I want to see all my overlays in the layers panel so that I can manage them visually.

**Acceptance Criteria:**
- [x] Create `renderLayerRows()` function to dynamically generate layer rows from `overlays` array
- [x] Each layer row shows: visibility toggle, overlay name, duration bar
- [x] Duration bars reflect each overlay's individual timing
- [x] Layer order matches array order (first overlay at top)
- [x] Update `updateLayerDurationBar()` to handle multiple bars (or create `updateAllDurationBars()`)
- [x] Call `renderLayerRows()` when overlays change (add/delete/reorder)
- [x] Typecheck passes
- [x] Verify multiple layers display correctly in browser

---

#### US-065: Update Preview to Render Multiple Overlays

**Description:** As a user, I want to see all visible overlays in the preview so that I can see how my video will look.

**Acceptance Criteria:**
- [x] Modify `drawOverlay()` to iterate through all overlays in array
- [x] Each overlay renders only if current frame is within its timing range
- [x] Each overlay uses its own position, text, and config
- [x] Overlays render in array order (first overlay rendered first, may be behind others)
- [x] Respect each overlay's `visible` property (eye toggle)
- [x] Preview updates when any overlay changes
- [x] Typecheck passes
- [x] Verify multiple overlays render correctly in browser

---

#### US-066: Update Export to Handle Multiple Overlays

**Description:** As a user, I want all my overlays exported in the final video so that the rendered output matches my preview.

**Acceptance Criteria:**
- [x] Update `startExport()` to pass full overlays array to export process
- [x] Update `handleExportVideo()` to receive overlays array
- [x] Update `processComboVideo()` or frame rendering to handle multiple overlays
- [x] Each frame checks all overlays and renders those within timing range
- [x] Overlays render in correct order during export
- [x] Typecheck passes
- [x] Verify exported video contains all overlays with correct timing

---

#### US-067: Update Project Save/Load for Multiple Overlays

**Description:** As a user, I want my multiple overlays saved and restored so that I can continue editing later.

**Acceptance Criteria:**
- [x] Update `createProjectData()` to save full `overlays` array
- [x] Update `applyProjectData()` to restore overlays array and re-render layer rows
- [x] Handle backward compatibility: if old project has single `overlay`, migrate to array
- [x] Save and restore `selectedOverlayId`
- [x] Typecheck passes
- [x] Verify save/load cycle preserves all overlays correctly

---

### Non-Goals (Phase 17)

- Drag-and-drop layer reordering (future enhancement)
- Copy/paste overlays
- Layer groups or folders
- Text-only overlays (all overlays are combo notation overlays)
- Different overlay types (image-only, shape, etc.)

### Technical Considerations (Phase 17)

- Overlay object structure:
  ```javascript
  {
    id: 'overlay-1234',
    name: 'Overlay 1',
    comboText: 'd df f 2',
    xOffset: 10,
    yOffset: 50,
    startFrame: 0,
    endFrame: 0,
    visible: true,
    config: { width: 50, height: 50, spacing: 0, padding: 5 }
  }
  ```
- Use `crypto.randomUUID()` or simple counter for ID generation
- Properties panel needs to "rebind" when selection changes - update all input values
- Consider debouncing property changes to avoid excessive re-renders
- The `inputImages` cache may need to be per-overlay or shared with cache key
- Export process needs to composite multiple overlays per frame

---

## Phase 18: Draggable Timeline Duration Bars

### Introduction

This phase enhances the layers panel by making overlay duration bars draggable, allowing users to visually adjust when overlays appear and disappear in the video timeline. Currently, users must manually enter start/end frame numbers in the properties panel. This feature provides a more intuitive, visual way to set overlay timing by directly manipulating the duration bars in the layers panel.

### Goals

- Enable drag-to-resize duration bars to adjust start and end frames
- Enable drag-to-move entire duration bars to shift timing while preserving duration
- Provide real-time visual feedback (tooltip) showing frame numbers during drag operations
- Verify that "Add Overlay" correctly creates a layer row (existing behavior confirmation)

---

#### US-068: Add Drag Handles to Duration Bars

**Description:** As a user, I want to see visual drag handles on duration bars so that I know I can interact with them.

**Acceptance Criteria:**
- [x] Duration bars show a left edge handle (for start frame) when hovered
- [x] Duration bars show a right edge handle (for end frame) when hovered
- [x] Cursor changes to `ew-resize` when hovering over left/right edges
- [x] Cursor changes to `grab` when hovering over the middle of the bar
- [x] Handles are subtle but visible (e.g., slightly different shade or thin line)
- [x] Typecheck passes (if applicable)
- [x] Verify changes work in browser

---

#### US-069: Implement Start Frame Dragging (Left Edge)

**Description:** As a user, I want to drag the left edge of a duration bar so that I can adjust when the overlay starts appearing.

**Acceptance Criteria:**
- [x] Dragging the left edge updates the overlay's `startFrame` property
- [x] The duration bar visually updates in real-time while dragging
- [x] Start frame cannot be dragged past the end frame (minimum 1 frame duration)
- [x] Start frame cannot be dragged below frame 0
- [x] Releasing the mouse finalizes the change
- [x] The properties panel "Start Frame" input updates to reflect the new value
- [x] Project is marked as having unsaved changes after drag completes
- [x] Typecheck passes
- [x] Verify changes work in browser

---

#### US-070: Implement End Frame Dragging (Right Edge)

**Description:** As a user, I want to drag the right edge of a duration bar so that I can adjust when the overlay stops appearing.

**Acceptance Criteria:**
- [x] Dragging the right edge updates the overlay's `endFrame` property
- [x] The duration bar visually updates in real-time while dragging
- [x] End frame cannot be dragged before the start frame (minimum 1 frame duration)
- [x] End frame cannot be dragged past the last frame of the video
- [x] Releasing the mouse finalizes the change
- [x] The properties panel "End Frame" input updates to reflect the new value
- [x] Project is marked as having unsaved changes after drag completes
- [x] Typecheck passes
- [x] Verify changes work in browser

---

#### US-071: Implement Duration Bar Move (Middle Drag)

**Description:** As a user, I want to drag the middle of a duration bar so that I can shift the entire overlay timing while keeping the same duration.

**Acceptance Criteria:**
- [x] Dragging the middle of the bar moves both start and end frames together
- [x] The duration (difference between end and start) remains constant during move
- [x] Movement stops at frame 0 (cannot move start frame below 0)
- [x] Movement stops at last video frame (cannot move end frame past video length)
- [x] The duration bar visually updates in real-time while dragging
- [x] Both "Start Frame" and "End Frame" inputs in properties panel update after drag
- [x] Project is marked as having unsaved changes after drag completes
- [x] Cursor changes to `grabbing` while actively dragging
- [x] Typecheck passes
- [x] Verify changes work in browser

---

#### US-072: Add Drag Tooltip Feedback

**Description:** As a user, I want to see a tooltip showing the frame number while dragging so that I can precisely position my overlay timing.

**Acceptance Criteria:**
- [x] Tooltip appears near the cursor when dragging begins
- [x] Tooltip shows "Start: Frame X" when dragging the left edge
- [x] Tooltip shows "End: Frame X" when dragging the right edge
- [x] Tooltip shows "Frames X - Y" when dragging the middle (moving entire bar)
- [x] Tooltip follows the cursor position during drag
- [x] Tooltip disappears when drag ends
- [x] Tooltip has clear, readable styling (e.g., dark background, light text)
- [x] Typecheck passes
- [x] Verify changes work in browser

---

#### US-073: Verify Add Overlay Creates Layer Row

**Description:** As a user, I want the "Add Overlay" button to create both an overlay and its corresponding layer row so that I can immediately see and interact with it in the layers panel.

**Acceptance Criteria:**
- [x] Clicking "Add Overlay" creates a new overlay in `editorState.overlays`
- [x] A new layer row appears in the layers panel immediately
- [x] The new layer row includes a duration bar
- [x] The new overlay is automatically selected after creation
- [x] The duration bar reflects the default timing (full video duration when endFrame=0)
- [x] Typecheck passes
- [x] Verify changes work in browser

---

### Non-Goals (Phase 18)

- Snapping to playhead or other overlay boundaries (explicitly excluded per requirements)
- Keyboard modifiers for constrained dragging
- Multi-select and dragging multiple duration bars at once
- Undo/redo for drag operations (future enhancement)
- Touch/mobile drag support

### Technical Considerations (Phase 18)

#### Existing Code to Leverage

- `updateOverlayDurationBar(overlayId)` in `editor/index.html` - already calculates bar position/width from frames
- `editorState.timelineZoom` - must account for zoom level when calculating frame from pixel position
- `markUnsavedChanges()` - call after drag completes
- `updatePropertiesPanel()` - call to sync UI after drag

#### Implementation Notes

- Duration bars are in `.layer-row-track` containers with class `.layer-duration-bar`
- Bar positioning uses absolute pixels based on zoom level and track width
- Must handle edge case where `endFrame=0` means "end of video"
- Mouse events should be attached to document during drag to handle cursor leaving the bar
- Consider using a shared drag state object to track: `isDragging`, `dragType` (start/end/move), `overlayId`, `initialMouseX`, `initialStartFrame`, `initialEndFrame`

#### Drag Hit Zone Detection

```javascript
// Determine drag type based on mouse position within bar
function getDragType(mouseX, barRect) {
  const edgeThreshold = 8; // pixels
  if (mouseX < barRect.left + edgeThreshold) return 'start';
  if (mouseX > barRect.right - edgeThreshold) return 'end';
  return 'move';
}
```

#### Frame Calculation from Pixel Position

```javascript
// Convert pixel position to frame number
function pixelToFrame(pixelX, trackRect) {
  const zoom = editorState.timelineZoom || 1;
  const contentWidth = trackRect.width * zoom;
  const percent = pixelX / contentWidth;
  return Math.round(percent * (editorState.frameCount - 1));
}
```

#### File to Modify

- `editor/index.html` - all UI and interaction logic is in this file

---

## Phase 19: Move Timing to Layer Rows and Fix Defaults

### Introduction

Currently, the timing controls (Start Frame, End Frame) are located in the Properties panel's "Timing" section, separate from where the duration bar is displayed in the layers panel. This phase moves those timing inputs directly into each layer row, placing them next to the duration bar for a more intuitive editing experience. Additionally, the default values are changed: start frame defaults to 1 (first frame) and end frame defaults to the actual last frame of the video, removing the confusing `endFrame = 0` sentinel value.

### Goals

- Move timing inputs from Properties panel into layer rows (next to duration bars)
- Change default start frame from 0 to 1
- Change default end frame from 0 (sentinel) to actual last frame number
- Remove all `endFrame = 0` sentinel logic throughout the codebase
- Update defaults when video is loaded (for existing overlays)

---

#### US-074: Add Timing Inputs to Layer Row UI

**Description:** As a user, I want timing inputs directly in the layer row so that I can edit start/end frames without switching to the Properties panel.

**Acceptance Criteria:**
- [x] Each layer row displays Start Frame and End Frame number inputs
- [x] Inputs are positioned between the layer name and the duration bar (or to the right of duration bar)
- [x] Inputs are compact (small width, ~60px each) to fit in the layer row
- [x] Inputs have labels or placeholders ("Start", "End" or icons)
- [x] Inputs are styled consistently with the dark theme
- [x] Typecheck passes
- [x] Verify inputs display correctly in browser

---

#### US-075: Wire Layer Row Timing Inputs to Overlay Data

**Description:** As a user, I want changes to the layer row timing inputs to update the overlay so that my edits are saved.

**Acceptance Criteria:**
- [x] Changing Start Frame input updates `overlay.startFrame` for that layer's overlay
- [x] Changing End Frame input updates `overlay.endFrame` for that layer's overlay
- [x] Duration bar updates in real-time when inputs change
- [x] Project is marked as having unsaved changes
- [x] Preview updates to reflect new timing
- [x] Inputs update when selecting different layers (show selected overlay's values)
- [x] Typecheck passes
- [x] Verify input changes work correctly in browser

---

#### US-076: Remove Timing Section from Properties Panel

**Description:** As a user, I want a cleaner Properties panel without the redundant Timing section since timing is now in layer rows.

**Acceptance Criteria:**
- [ ] Remove the "Timing" collapsible section from Properties panel (`#sectionTiming`)
- [ ] Remove associated HTML elements (start/end frame inputs, validation message)
- [ ] Remove or repurpose `validateTimingInputs()` function (may still be needed for layer row validation)
- [ ] Remove `updateTimingInputsMax()` or update it for layer row inputs
- [ ] Properties panel layout adjusts properly without the Timing section
- [ ] Typecheck passes
- [ ] Verify Properties panel displays correctly without Timing section

---

#### US-077: Change Default Start Frame to 1

**Description:** As a user, I want new overlays to start at frame 1 by default so that they appear from the beginning of the video.

**Acceptance Criteria:**
- [ ] Update `createOverlayObject()` to set `startFrame: 1` instead of `startFrame: 0`
- [ ] New overlays created via "Add Overlay" button have startFrame = 1
- [ ] Backward compatibility: loading old projects with startFrame = 0 should work (keep as 0 or migrate to 1)
- [ ] Typecheck passes
- [ ] Verify new overlays have startFrame = 1

---

#### US-078: Change Default End Frame to Last Frame

**Description:** As a user, I want new overlays to end at the last frame by default so that they appear for the entire video.

**Acceptance Criteria:**
- [ ] Update `createOverlayObject()` to set `endFrame` to `editorState.frameCount - 1` (or frameCount if 1-indexed)
- [ ] If no video loaded yet, set endFrame to 1 as placeholder (will be updated when video loads)
- [ ] New overlays have endFrame set to actual last frame number
- [ ] Typecheck passes
- [ ] Verify new overlays have endFrame = last frame

---

#### US-079: Update Existing Overlay Defaults on Video Load

**Description:** As a user, I want existing overlays with placeholder end frames to be updated when I load a video so that they span the full video by default.

**Acceptance Criteria:**
- [ ] When video loads, iterate through all overlays
- [ ] If an overlay has `endFrame <= 1` (placeholder), set it to `frameCount - 1`
- [ ] If an overlay has `startFrame = 0`, optionally migrate to 1 (or leave as 0 if intentional)
- [ ] Duration bars update to reflect new values
- [ ] This happens after frame extraction completes and frameCount is known
- [ ] Typecheck passes
- [ ] Verify overlay defaults update when video is loaded

---

#### US-080: Remove endFrame = 0 Sentinel Logic

**Description:** As a developer, I want to remove all special handling for `endFrame = 0` so that the codebase is simpler and uses actual frame numbers.

**Acceptance Criteria:**
- [ ] Remove `endFrame === 0` checks in `updateOverlayDurationBar()` / `updateLayerDurationBar()`
- [ ] Remove `endFrame === 0` check in `validateTimingInputs()` (or its replacement)
- [ ] Remove `endFrame === 0` check in preview rendering (`drawOverlay()`)
- [ ] Remove `endFrame === 0` check in export process
- [ ] Update any tooltip text that references "0 = end of video"
- [ ] Search for all `endFrame === 0` or `endFrame == 0` and remove/update
- [ ] Typecheck passes
- [ ] Verify all timing logic works with actual frame numbers

---

### Non-Goals (Phase 19)

- Inline editing of layer names in layer rows (future enhancement)
- Drag-and-drop reordering of layers
- Time-based input (timecode) instead of frame numbers
- Removing the duration bar (it remains for visual feedback)

### Technical Considerations (Phase 19)

#### Layer Row Structure Update

Current structure:
```html
<div class="layer-row">
  <div class="layer-row-label">
    <span class="layer-visibility-toggle">👁</span>
    <span class="layer-name">Overlay 1</span>
  </div>
  <div class="layer-row-track">
    <div class="layer-duration-bar"></div>
  </div>
</div>
```

New structure with timing inputs:
```html
<div class="layer-row">
  <div class="layer-row-label">
    <span class="layer-visibility-toggle">👁</span>
    <span class="layer-name">Overlay 1</span>
  </div>
  <div class="layer-row-timing">
    <input type="number" class="timing-input timing-start" min="1" value="1" title="Start Frame">
    <input type="number" class="timing-input timing-end" min="1" value="100" title="End Frame">
  </div>
  <div class="layer-row-track">
    <div class="layer-duration-bar"></div>
  </div>
</div>
```

#### CSS Considerations

- `.layer-row-timing` should have fixed width (~130px) for two inputs
- `.timing-input` should be compact: `width: 55px`, small font, minimal padding
- Consider using flexbox for layer row layout with `flex-shrink: 0` on fixed-width sections

#### Functions to Update

- `createLayerRowElement(overlay)` - add timing inputs to generated HTML
- `createOverlayObject()` - change default values
- `updateOverlayDurationBar()` - remove sentinel logic
- `drawOverlay()` - remove sentinel logic
- Video load handler - update overlay defaults when frameCount is known

#### File to Modify

- `editor/index.html` - all UI and interaction logic is in this file
