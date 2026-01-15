# PRD: Fix Hardcoded Values

## Introduction

The codebase currently has three hardcoded values that limit flexibility and scalability. This PRD addresses making the asset directories, FPS extraction, and image dimension calculations configurable while maintaining backward compatibility.

## Goals

- Allow users to specify custom asset directories for different games
- Dynamically extract FPS from video metadata instead of assuming 30fps
- Make input image dimensions configurable for different overlay sizes
- Maintain backward compatibility with existing API usage

## User Stories

### US-001: Make Asset Directories Configurable

**Description:** As a developer, I want to pass custom asset directories to `processComboVideo()` so that I can use assets from different games without modifying the source code.

**Current State:**
- `videoUtils.js:59` hardcodes `['./assets/games/Tekken7/images', './assets/games/common/images']`

**Acceptance Criteria:**
- [x] `processComboVideo()` accepts an optional `directories` parameter
- [x] Default value is `['./assets/games/Tekken7/images', './assets/games/common/images']`
- [x] Directories are passed through to `searchAndCopyFiles()`
- [x] Existing calls without the parameter continue to work
- [x] Typecheck passes
- [x] Existing tests pass

---

### US-002: Extract FPS Dynamically from Video Metadata

**Description:** As a developer, I want the FPS value to be extracted from the input video metadata so that videos with different frame rates are processed correctly.

**Current State:**
- `videoUtils.js:382` hardcodes `const fps = 30`
- Comment shows awareness of `r_frame_rate` format: "30,000/1001 = 30 fps && 60,000/1001 = 60 fps"

**Acceptance Criteria:**
- [ ] `getVideoMetadata()` parses `r_frame_rate` from video stream metadata
- [ ] Handles fraction format (e.g., "30000/1001" → ~29.97)
- [ ] Falls back to 30 if `r_frame_rate` is unavailable or unparseable
- [ ] Typecheck passes
- [ ] Existing tests pass

---

### US-003: Make Input Image Dimensions Configurable

**Description:** As a developer, I want to specify input image dimensions so that I can control the size of combo notation overlays.

**Current State:**
- `videoUtils.js:279-297` hardcodes `inputWidth=50`, `inputSpacing=50`, `inputHeight=50`
- `drawInputImages()` at line 271-272 also hardcodes size 50

**Acceptance Criteria:**
- [ ] `calculateInputImagesDimensions()` accepts `inputWidth` and `inputHeight` parameters
- [ ] Spacing is derived from width (spacing = width)
- [ ] Default values are `inputWidth=50`, `inputHeight=50`
- [ ] `drawInputImages()` uses the same dimension values
- [ ] `processComboVideo()` accepts optional `inputWidth` and `inputHeight` parameters
- [ ] Parameters flow through to `redrawFrameWithComboImages()` and related functions
- [ ] Existing calls without parameters continue to work
- [ ] Typecheck passes
- [ ] Existing tests pass

---

### US-004: Update Tests for New Parameters

**Description:** As a developer, I want tests that verify the new configurable parameters work correctly.

**Acceptance Criteria:**
- [ ] Add test for `processComboVideo()` with custom directories parameter
- [ ] Add test for FPS extraction from video with non-30fps frame rate
- [ ] Add test for FPS fallback when metadata is missing
- [ ] Add test for custom image dimensions
- [ ] All tests pass

## Non-Goals

- Adding a configuration file system (parameters are passed directly)
- Supporting per-input image sizing (all inputs use same dimensions)
- Changing the default behavior for existing users
- Modifying `processVideo()` function (only `processComboVideo()` is affected for directories/dimensions)

## Technical Considerations

- `r_frame_rate` is a string in format "numerator/denominator" (e.g., "30000/1001")
- The `createVideoFromFrames()` function at line 310 also has a hardcoded `-framerate 30` that should use the extracted FPS
- Image dimensions affect multiple functions: `calculateInputImagesDimensions()`, `drawInputImages()`, and `drawBlurredBackground()`
