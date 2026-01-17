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
- [ ] Create `config/defaults.json` with current hardcoded values as defaults
- [ ] Defaults include: font="THEBOLDFONT", fontSize=50, color="yellow", position={x:10, y:50}
- [ ] Defaults include: dropshadow={enabled:false, color:"#000", blur:0, offsetX:-2, offsetY:3}
- [ ] Defaults include: images={width:50, height:50, spacing:0, padding:5, margin:5}
- [ ] Defaults include: animation={type:"none", duration:500, delay:0}
- [ ] Typecheck passes

#### US-003: Integrate Config Loader into Video Processing Pipeline
**Description:** As a user, I want to pass a config file path to `processComboVideo` so that my custom styles are applied.

**Acceptance Criteria:**
- [ ] Update `processComboVideo` signature to accept optional `configPath` parameter
- [ ] Load and merge config at start of processing
- [ ] Pass resolved config to `redrawFrameWithComboImages` and related functions
- [ ] Existing calls without config continue to work (backward compatible)
- [ ] Typecheck passes
- [ ] Integration test verifies config is loaded and applied

---

### Phase 2: Text Styling

#### US-004: Implement Configurable Font and Font Size
**Description:** As a user, I want to specify custom fonts and sizes so that text matches my video style.

**Acceptance Criteria:**
- [ ] Update `canvas.js` functions to accept font and fontSize from config
- [ ] Support loading custom fonts via `registerFont` if font path provided in config
- [ ] `estimateTextSize` uses config values instead of hardcoded "THEBOLDFONT" and 50
- [ ] `createTextCanvasOfSize` uses config values for font rendering
- [ ] Typecheck passes
- [ ] Unit tests verify different fonts and sizes render correctly

#### US-005: Implement Configurable Text Color and Position
**Description:** As a user, I want to set text color and position so that overlays appear where I want them.

**Acceptance Criteria:**
- [ ] Update `createTextCanvasOfSize` to accept `color` from config
- [ ] Support hex colors (#RRGGBB), named colors, and rgba format
- [ ] Position (x, y) read from config with CLI override capability
- [ ] Typecheck passes
- [ ] Unit tests verify color parsing and position application

#### US-006: Implement Text Dropshadow Effect
**Description:** As a user, I want dropshadow on text so that it stands out against busy backgrounds.

**Acceptance Criteria:**
- [ ] Add dropshadow rendering in `createTextCanvasOfSize` using canvas shadow API
- [ ] Apply `ctx.shadowColor`, `ctx.shadowBlur`, `ctx.shadowOffsetX`, `ctx.shadowOffsetY` from config
- [ ] Dropshadow only applied when `dropshadow.enabled` is true in config
- [ ] Typecheck passes
- [ ] Unit tests verify shadow is rendered when enabled, not rendered when disabled

---

### Phase 3: Image Styling

#### US-007: Implement Configurable Image Dimensions
**Description:** As a user, I want to control input image sizes so that they scale appropriately for my video resolution.

**Acceptance Criteria:**
- [ ] Update `drawInputImages` to use `images.width` and `images.height` from config
- [ ] Update `calculateInputImagesDimensions` to use config values
- [ ] Remove hardcoded `inputWidth=50, inputHeight=50` defaults
- [ ] Typecheck passes
- [ ] Unit tests verify dimension calculations with various config values

#### US-008: Implement Configurable Spacing, Padding, and Margins
**Description:** As a user, I want control over spacing between inputs and padding around the overlay so that layout looks professional.

**Acceptance Criteria:**
- [ ] Add `spacing` config: gap between individual input images
- [ ] Add `padding` config: space between images and blurred background edge
- [ ] Add `margin` config: space between overlay and video frame edge
- [ ] Update `drawBlurredBackground` to account for padding
- [ ] Update `drawInputImages` to apply spacing between images
- [ ] Typecheck passes
- [ ] Unit tests verify spacing calculations

---

### Phase 4: Inline Markup System

#### US-009: Create Inline Markup Parser
**Description:** As a user, I want to write `[red]text[/red]` inline so that I can change colors mid-text.

**Acceptance Criteria:**
- [ ] Create `src/text/markupParser.js` with `parseMarkup(text)` function
- [ ] Parser returns array of segments: `[{text: "hello", styles: []}, {text: "world", styles: ["red"]}]`
- [ ] Support color tags: `[red]`, `[#FF0000]`, `[color:red]`
- [ ] Support newline tag: `[br]` or `[newline]`
- [ ] Typecheck passes
- [ ] Unit tests cover basic parsing

#### US-010: Support Nested Markup Styles
**Description:** As a user, I want to nest styles like `[bold][red]text[/red][/bold]` so that I can combine effects.

**Acceptance Criteria:**
- [ ] Parser handles nested tags correctly, maintaining style stack
- [ ] Support `[bold]`, `[italic]`, `[underline]` style tags
- [ ] Nested styles combine: bold+red text renders as bold and red
- [ ] Malformed nesting (e.g., `[a][b][/a][/b]`) handled gracefully with warning
- [ ] Typecheck passes
- [ ] Unit tests cover nesting scenarios

#### US-011: Render Parsed Markup to Canvas
**Description:** As a developer, I want to render parsed markup segments so that inline styles appear in the video.

**Acceptance Criteria:**
- [ ] Create `src/text/markupRenderer.js` with `renderMarkup(ctx, segments, x, y, baseConfig)` function
- [ ] Each segment rendered with its combined styles applied
- [ ] Track x position as each segment is drawn for proper flow
- [ ] Handle `[br]` by advancing y position and resetting x
- [ ] Integrate with existing `createTextCanvasOfSize` flow
- [ ] Typecheck passes
- [ ] Visual tests verify multi-color text renders correctly

---

### Phase 5: Text Animation

#### US-012: Implement Animation Configuration Schema
**Description:** As a developer, I want animation settings in config so that fade effects can be controlled.

**Acceptance Criteria:**
- [ ] Add animation schema: `{type: "none"|"fade", duration: number, delay: number, perCharacter: boolean}`
- [ ] Validate animation config in schema loader
- [ ] Default animation type is "none" for backward compatibility
- [ ] Typecheck passes

#### US-013: Implement Fade-In Animation for Text
**Description:** As a user, I want text to fade in so that overlays appear smoothly.

**Acceptance Criteria:**
- [ ] Create `src/animation/fadeAnimation.js` with fade-in logic
- [ ] Calculate alpha value based on frame number, duration, and fps
- [ ] Support per-character fade (staggered) when `perCharacter: true`
- [ ] Apply alpha to text rendering context before drawing
- [ ] Typecheck passes
- [ ] Unit tests verify alpha calculations at various frame points

#### US-014: Implement Fade-Out Animation for Text
**Description:** As a user, I want text to fade out so that overlays disappear smoothly.

**Acceptance Criteria:**
- [ ] Extend `fadeAnimation.js` with fade-out logic
- [ ] Support config for `fadeOutStart` (frame or percentage of duration)
- [ ] Fade-out can combine with fade-in (fade in, hold, fade out)
- [ ] Typecheck passes
- [ ] Unit tests verify fade-out alpha calculations

#### US-015: Integrate Animation into Frame Rendering
**Description:** As a developer, I want animations applied during `redrawFrameWithComboImages` so that each frame reflects the animation state.

**Acceptance Criteria:**
- [ ] Pass frame number and total frames to animation calculator
- [ ] Apply calculated alpha/transform before drawing text
- [ ] Animation state persists correctly across all frames
- [ ] No animation when `type: "none"` (existing behavior)
- [ ] Typecheck passes
- [ ] Integration test verifies animation across frame sequence

---

### Phase 6: Electron Editor - Foundation

#### US-016: Create Electron App Shell
**Description:** As a user, I want to launch a preview editor so that I can see my changes visually.

**Acceptance Criteria:**
- [ ] Create `editor/` directory with Electron main process (`main.js`)
- [ ] Create basic `index.html` with placeholder layout
- [ ] Add npm scripts: `editor:dev` and `editor:build`
- [ ] App launches and displays window with title "Combo Clip Composer Editor"
- [ ] Add electron and electron-builder as devDependencies
- [ ] Typecheck passes

#### US-017: Implement Video Loading in Editor
**Description:** As a user, I want to load a video file so that I can preview overlays on it.

**Acceptance Criteria:**
- [ ] Add "Open Video" menu item and button
- [ ] Use Electron dialog to select video file
- [ ] Extract frames from video to temp directory using existing `extractFrames`
- [ ] Display loading indicator during extraction
- [ ] Store frame paths in editor state
- [ ] Typecheck passes

#### US-018: Implement Frame Display Panel
**Description:** As a user, I want to see the current frame so that I can position overlays visually.

**Acceptance Criteria:**
- [ ] Create canvas-based frame display component
- [ ] Display selected frame from extracted frames
- [ ] Support zoom in/out (fit, 50%, 100%, 200%)
- [ ] Display frame dimensions and current zoom level
- [ ] Typecheck passes

---

### Phase 7: Electron Editor - Timeline

#### US-019: Implement Basic Timeline Component
**Description:** As a user, I want a timeline so that I can scrub through the video.

**Acceptance Criteria:**
- [ ] Create timeline component showing frame range
- [ ] Playhead indicator shows current frame
- [ ] Click on timeline to jump to frame
- [ ] Drag playhead to scrub through frames
- [ ] Display current frame number and timecode
- [ ] Typecheck passes

#### US-020: Implement Timeline Playback Controls
**Description:** As a user, I want play/pause controls so that I can preview the video in motion.

**Acceptance Criteria:**
- [ ] Add play/pause button that advances frames at video FPS
- [ ] Add step forward/backward buttons (single frame)
- [ ] Add jump to start/end buttons
- [ ] Keyboard shortcuts: Space (play/pause), Left/Right (step), Home/End (jump)
- [ ] Typecheck passes

#### US-021: Implement Timeline Zoom and Scroll
**Description:** As a user, I want to zoom the timeline so that I can make precise edits.

**Acceptance Criteria:**
- [ ] Timeline zoom slider (show more or fewer frames)
- [ ] Horizontal scroll when zoomed in
- [ ] Mouse wheel zoom on timeline
- [ ] Zoom to fit all frames button
- [ ] Typecheck passes

---

### Phase 8: Electron Editor - Overlay Preview

#### US-022: Implement Live Overlay Preview on Frame
**Description:** As a user, I want to see overlays rendered on the current frame so that I can adjust positioning.

**Acceptance Criteria:**
- [ ] Render combo input images on frame canvas using existing canvas logic
- [ ] Render text overlays with current config
- [ ] Update preview when config changes
- [ ] Preview matches final render output
- [ ] Typecheck passes

#### US-023: Implement Drag-to-Position Overlays
**Description:** As a user, I want to drag overlays to position them so that I don't need to guess coordinates.

**Acceptance Criteria:**
- [ ] Click and drag overlay elements on canvas
- [ ] Update x, y position in config as user drags
- [ ] Show position coordinates while dragging
- [ ] Snap to grid option (configurable grid size)
- [ ] Typecheck passes

#### US-024: Implement Config Property Panel
**Description:** As a user, I want a property panel so that I can edit all config values.

**Acceptance Criteria:**
- [ ] Side panel showing all config properties
- [ ] Input fields for text: font dropdown, size number input, color picker
- [ ] Input fields for images: width, height, spacing, padding, margin
- [ ] Input fields for dropshadow: enabled toggle, color, blur, offsets
- [ ] Changes update preview in real-time
- [ ] Typecheck passes

---

### Phase 9: Electron Editor - Keyframes

#### US-025: Implement Keyframe Data Model
**Description:** As a developer, I want a keyframe data structure so that properties can change over time.

**Acceptance Criteria:**
- [ ] Create `editor/models/keyframe.js` with Keyframe class
- [ ] Keyframe stores: frame number, property name, value
- [ ] KeyframeTrack stores ordered list of keyframes for one property
- [ ] Support interpolation types: linear, ease-in, ease-out, step
- [ ] Typecheck passes
- [ ] Unit tests verify keyframe data model

#### US-026: Implement Keyframe UI on Timeline
**Description:** As a user, I want to see keyframes on the timeline so that I can manage animation points.

**Acceptance Criteria:**
- [ ] Display keyframe markers (diamonds) on timeline for each property track
- [ ] Tracks for: position.x, position.y, opacity, scale
- [ ] Click keyframe to select it
- [ ] Drag keyframe to move it to different frame
- [ ] Typecheck passes

#### US-027: Implement Add/Remove Keyframe
**Description:** As a user, I want to add and remove keyframes so that I can define animation points.

**Acceptance Criteria:**
- [ ] "Add Keyframe" button creates keyframe at current frame with current values
- [ ] Right-click keyframe shows delete option
- [ ] Keyboard shortcut: K to add keyframe, Delete to remove selected
- [ ] Undo/redo support for keyframe operations
- [ ] Typecheck passes

#### US-028: Implement Keyframe Interpolation
**Description:** As a user, I want smooth transitions between keyframes so that animations look natural.

**Acceptance Criteria:**
- [ ] Calculate interpolated value for any frame between keyframes
- [ ] Linear interpolation as default
- [ ] Ease-in/ease-out using cubic bezier curves
- [ ] Step interpolation (jump to next value, no smooth transition)
- [ ] Right-click keyframe to change interpolation type
- [ ] Typecheck passes
- [ ] Unit tests verify interpolation calculations

---

### Phase 10: Electron Editor - Export

#### US-029: Implement Project Save/Load
**Description:** As a user, I want to save my project so that I can continue editing later.

**Acceptance Criteria:**
- [ ] Save project as JSON file (`.ccc` extension - Combo Clip Composer)
- [ ] Project file includes: source video path, config, keyframes, combo text
- [ ] "Save" and "Save As" menu items with Ctrl+S shortcut
- [ ] "Open Project" loads saved project file
- [ ] Warn on unsaved changes when closing
- [ ] Typecheck passes

#### US-030: Implement Video Export
**Description:** As a user, I want to export the final video so that I can share my combo video.

**Acceptance Criteria:**
- [ ] "Export Video" menu item opens export dialog
- [ ] Progress bar shows export progress
- [ ] Use existing `processComboVideo` pipeline with editor config and keyframes
- [ ] Support cancel export operation
- [ ] Show success message with output file path
- [ ] Typecheck passes

#### US-031: Implement Config Export
**Description:** As a user, I want to export just the config so that I can use it with the CLI.

**Acceptance Criteria:**
- [ ] "Export Config" saves current config as JSON file
- [ ] Exported config works with CLI `--config` flag
- [ ] Option to export with or without keyframes
- [ ] Typecheck passes

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
