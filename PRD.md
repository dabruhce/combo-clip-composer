# PRD: Frame-Precise Timecode Offsets

## Introduction

Timecodes alone (e.g., "2:01") are not precise enough for syncing combo overlays with specific moments in gameplay footage. This feature adds frame-level offset support to `trimVideo()`, allowing users to specify start/end times with additional frame adjustments (e.g., start at 2:01 + 20 frames, end at 2:31 - 5 frames).

## Goals

- Enable frame-precise control for syncing combo overlays with video content
- Support frame offsets (+/-) relative to timecodes
- Clamp offsets to valid FPS range to prevent invalid values
- Maintain backward compatibility with existing `trimVideo()` usage
- Support both local and YouTube pipeline workflows

## User Stories

### US-001: Add Timecode Parsing Utility

**Description:** As a developer, I want a utility function that parses "MM:SS" or "H:MM:SS" timecode strings into seconds so that timecodes can be used consistently throughout the codebase.

**Acceptance Criteria:**
- [x] Create `parseTimecode(timecode)` function in `videoUtils.js`
- [x] Handles "MM:SS" format (e.g., "2:01" → 121 seconds)
- [x] Handles "H:MM:SS" format (e.g., "1:02:01" → 3721 seconds)
- [x] Handles "SS" format (e.g., "45" → 45 seconds)
- [x] Throws descriptive error for invalid formats
- [x] Export function from module
- [x] Typecheck passes

---

### US-002: Add Frame Offset Calculation Utility

**Description:** As a developer, I want a utility function that calculates the precise time position given a timecode and frame offset so that I can compute exact seek positions.

**Acceptance Criteria:**
- [x] Create `calculateFrameOffsetTime(timecode, frameOffset, fps)` function
- [x] Converts timecode string to seconds using `parseTimecode()`
- [x] Adds frame offset as fractional seconds (offset / fps)
- [x] Clamps frame offset to valid range: `-fps+1` to `+fps-1`
- [x] Returns total time in seconds as a number
- [x] Example: `calculateFrameOffsetTime("2:01", 20, 30)` → 121.667 seconds
- [x] Example: `calculateFrameOffsetTime("2:31", -5, 30)` → 150.833 seconds
- [x] Export function from module
- [x] Typecheck passes

---

### US-003: Enhance trimVideo with Frame Offset Support

**Description:** As a developer, I want `trimVideo()` to accept frame offsets for start and end times so that I can trim videos with frame-level precision.

**Current State:**
- `trimVideo()` accepts `data.startTime` and `data.duration`
- Uses ffmpeg `setStartTime()` and `setDuration()`

**New Parameters:**
```javascript
{
  inputFileLocation: string,
  outputFileDestination: string,
  startTime: string,        // "MM:SS" or "H:MM:SS" format
  startOffset: number,      // frame offset, optional, default 0
  endTime: string,          // "MM:SS" or "H:MM:SS" format
  endOffset: number,        // frame offset, optional, default 0
}
```

**Acceptance Criteria:**
- [x] `trimVideo()` accepts `startOffset` and `endOffset` parameters (optional, default 0)
- [x] `trimVideo()` accepts `endTime` as alternative to `duration`
- [x] Fetches video FPS using `getVideoMetadata()` for offset calculations
- [x] Calculates precise start position using `calculateFrameOffsetTime()`
- [x] Calculates duration from start/end positions
- [x] Passes calculated values to ffmpeg
- [x] Existing calls using `startTime` + `duration` continue to work
- [x] Typecheck passes
- [x] Existing tests pass

---

### US-004: Update Entry Points for Frame Offset Support

**Description:** As a developer, I want the CLI entry points to accept frame offset parameters so that users can specify precise trim points from the command line.

**Acceptance Criteria:**
- [x] `main.js` accepts optional `startTime`, `startOffset`, `endTime`, `endOffset` arguments
- [x] `main-pipeline.js` accepts optional `startTime`, `startOffset`, `endTime`, `endOffset` arguments
- [x] Arguments are passed through to video processing functions
- [x] Existing usage without offsets continues to work
- [x] Typecheck passes

---

### US-005: Add Tests for Frame Offset Functions

**Description:** As a developer, I want tests that verify timecode parsing and frame offset calculations work correctly.

**Acceptance Criteria:**
- [x] Test `parseTimecode()` with "MM:SS" format
- [x] Test `parseTimecode()` with "H:MM:SS" format
- [x] Test `parseTimecode()` with invalid input (expect error)
- [x] Test `calculateFrameOffsetTime()` with positive offset
- [x] Test `calculateFrameOffsetTime()` with negative offset
- [x] Test `calculateFrameOffsetTime()` clamping when offset exceeds FPS
- [x] Test `trimVideo()` with frame offsets
- [x] All tests pass

## Non-Goals

- Sub-frame precision (frame offsets are integers)
- Real-time preview of trim points
- GUI for selecting trim points
- Automatic scene detection

## Technical Considerations

- ffmpeg's `-ss` flag accepts decimal seconds for sub-second precision
- FPS must be extracted from video metadata before calculating offsets
- The `getVideoMetadata()` function already extracts FPS (enhanced in previous PRD)
- Frame offset clamping formula: `clamp(offset, -(fps-1), fps-1)`
- Time calculation: `totalSeconds = parseTimecode(timecode) + (clampedOffset / fps)`
