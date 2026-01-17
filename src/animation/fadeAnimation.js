/**
 * Fade animation module for Combo Clip Composer
 * Provides fade-in and fade-out animation logic for text overlays
 */

/**
 * Calculates the alpha value for a fade-in animation at a given frame
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {string} animationConfig.type - Animation type ('none' or 'fade')
 * @param {number} animationConfig.duration - Fade duration in milliseconds
 * @param {number} animationConfig.delay - Delay before fade starts in milliseconds
 * @returns {number} Alpha value between 0 and 1
 */
function calculateFadeInAlpha(frameNumber, fps, animationConfig) {
  // Return full opacity if animation is disabled or invalid
  if (!animationConfig || animationConfig.type === 'none') {
    return 1;
  }

  const { duration = 500, delay = 0 } = animationConfig;

  // Convert frame number to milliseconds
  const currentTimeMs = (frameNumber / fps) * 1000;

  // If we're still in the delay period, alpha is 0
  if (currentTimeMs < delay) {
    return 0;
  }

  // Time elapsed since fade started
  const fadeElapsed = currentTimeMs - delay;

  // If fade is complete, alpha is 1
  if (fadeElapsed >= duration) {
    return 1;
  }

  // If duration is 0, return 1 immediately (instant fade)
  if (duration === 0) {
    return 1;
  }

  // Linear interpolation: alpha = elapsed / duration
  return fadeElapsed / duration;
}

/**
 * Calculates the alpha value for a per-character fade-in animation
 * Each character fades in with a staggered delay
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {number} charIndex - Index of the character (0-indexed)
 * @param {number} totalChars - Total number of characters
 * @returns {number} Alpha value between 0 and 1
 */
function calculatePerCharacterFadeInAlpha(frameNumber, fps, animationConfig, charIndex, totalChars) {
  // Return full opacity if animation is disabled or invalid
  if (!animationConfig || animationConfig.type === 'none') {
    return 1;
  }

  if (!animationConfig.perCharacter || totalChars <= 0) {
    // Fall back to regular fade-in if perCharacter is not enabled
    return calculateFadeInAlpha(frameNumber, fps, animationConfig);
  }

  const { duration = 500, delay = 0 } = animationConfig;

  // Calculate stagger: distribute the total duration across all characters
  // Each character gets a portion of the total duration to start its fade
  // The last character should start fading at (totalDuration - singleCharFadeDuration)

  // Each character's individual fade takes a fraction of the total duration
  // We use overlap so characters fade in smoothly one after another
  const overlapFactor = 0.5; // Amount of overlap between character fades
  const singleCharDuration = duration / (1 + (totalChars - 1) * (1 - overlapFactor));
  const staggerOffset = singleCharDuration * (1 - overlapFactor);

  // Calculate this character's start delay
  const charDelay = delay + (charIndex * staggerOffset);

  // Convert frame number to milliseconds
  const currentTimeMs = (frameNumber / fps) * 1000;

  // If we're still in the delay period for this character, alpha is 0
  if (currentTimeMs < charDelay) {
    return 0;
  }

  // Time elapsed since this character's fade started
  const fadeElapsed = currentTimeMs - charDelay;

  // If this character's fade is complete, alpha is 1
  if (fadeElapsed >= singleCharDuration) {
    return 1;
  }

  // If duration is 0, return 1 immediately
  if (singleCharDuration === 0) {
    return 1;
  }

  // Linear interpolation for this character
  return fadeElapsed / singleCharDuration;
}

/**
 * Calculates the alpha value for a fade-out animation at a given frame
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {number} animationConfig.fadeOutStart - When fade-out starts (frame number or percentage as decimal 0-1)
 * @param {number} animationConfig.fadeOutDuration - Fade-out duration in milliseconds (defaults to duration if not set)
 * @param {number} totalFrames - Total number of frames in the video
 * @returns {number} Alpha value between 0 and 1
 */
function calculateFadeOutAlpha(frameNumber, fps, animationConfig, totalFrames) {
  // Return full opacity if animation is disabled or no fade-out configured
  if (!animationConfig || animationConfig.type === 'none') {
    return 1;
  }

  const fadeOutStart = animationConfig.fadeOutStart;

  // If fadeOutStart is not defined, no fade-out
  if (fadeOutStart === undefined || fadeOutStart === null) {
    return 1;
  }

  const fadeOutDuration = animationConfig.fadeOutDuration !== undefined
    ? animationConfig.fadeOutDuration
    : (animationConfig.duration || 500);

  // Convert frame number to milliseconds
  const currentTimeMs = (frameNumber / fps) * 1000;
  const totalDurationMs = (totalFrames / fps) * 1000;

  // Determine fade-out start time in ms
  let fadeOutStartMs;
  if (fadeOutStart >= 0 && fadeOutStart <= 1 && fadeOutStart !== Math.floor(fadeOutStart)) {
    // Treat as percentage of total duration (decimal like 0.8)
    fadeOutStartMs = fadeOutStart * totalDurationMs;
  } else if (fadeOutStart >= 0 && fadeOutStart <= 1) {
    // Integer 0 or 1 - treat as frame number
    fadeOutStartMs = (fadeOutStart / fps) * 1000;
  } else if (fadeOutStart > 1 && fadeOutStart === Math.floor(fadeOutStart)) {
    // Integer > 1, treat as frame number
    fadeOutStartMs = (fadeOutStart / fps) * 1000;
  } else {
    // Decimal > 1, treat as percentage
    fadeOutStartMs = fadeOutStart * totalDurationMs;
  }

  // If we haven't reached fade-out start, alpha is 1
  if (currentTimeMs < fadeOutStartMs) {
    return 1;
  }

  // Time elapsed since fade-out started
  const fadeOutElapsed = currentTimeMs - fadeOutStartMs;

  // If fade-out is complete, alpha is 0
  if (fadeOutElapsed >= fadeOutDuration) {
    return 0;
  }

  // If duration is 0, return 0 immediately (instant fade out)
  if (fadeOutDuration === 0) {
    return 0;
  }

  // Linear interpolation: alpha goes from 1 to 0
  return 1 - (fadeOutElapsed / fadeOutDuration);
}

/**
 * Calculates the alpha value for per-character fade-out animation
 * Each character fades out with a staggered delay
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {number} charIndex - Index of the character (0-indexed)
 * @param {number} totalChars - Total number of characters
 * @param {number} totalFrames - Total number of frames in the video
 * @returns {number} Alpha value between 0 and 1
 */
function calculatePerCharacterFadeOutAlpha(frameNumber, fps, animationConfig, charIndex, totalChars, totalFrames) {
  // Return full opacity if animation is disabled or no fade-out configured
  if (!animationConfig || animationConfig.type === 'none') {
    return 1;
  }

  const fadeOutStart = animationConfig.fadeOutStart;

  // If fadeOutStart is not defined, no fade-out
  if (fadeOutStart === undefined || fadeOutStart === null) {
    return 1;
  }

  if (!animationConfig.perCharacter || totalChars <= 0) {
    // Fall back to regular fade-out if perCharacter is not enabled
    return calculateFadeOutAlpha(frameNumber, fps, animationConfig, totalFrames);
  }

  const fadeOutDuration = animationConfig.fadeOutDuration !== undefined
    ? animationConfig.fadeOutDuration
    : (animationConfig.duration || 500);

  // Convert frame number to milliseconds
  const currentTimeMs = (frameNumber / fps) * 1000;
  const totalDurationMs = (totalFrames / fps) * 1000;

  // Determine fade-out start time in ms
  let fadeOutStartMs;
  if (fadeOutStart >= 0 && fadeOutStart <= 1 && fadeOutStart !== Math.floor(fadeOutStart)) {
    fadeOutStartMs = fadeOutStart * totalDurationMs;
  } else if (fadeOutStart >= 0 && fadeOutStart <= 1) {
    fadeOutStartMs = (fadeOutStart / fps) * 1000;
  } else if (fadeOutStart > 1 && fadeOutStart === Math.floor(fadeOutStart)) {
    fadeOutStartMs = (fadeOutStart / fps) * 1000;
  } else {
    fadeOutStartMs = fadeOutStart * totalDurationMs;
  }

  // Calculate stagger for per-character fade-out
  // Last character fades first, first character fades last (reverse order)
  const overlapFactor = 0.5;
  const singleCharDuration = fadeOutDuration / (1 + (totalChars - 1) * (1 - overlapFactor));
  const staggerOffset = singleCharDuration * (1 - overlapFactor);

  // Reverse character index for fade-out (last char fades first)
  const reverseCharIndex = totalChars - 1 - charIndex;
  const charFadeOutStartMs = fadeOutStartMs + (reverseCharIndex * staggerOffset);

  // If we haven't reached this character's fade-out start, alpha is 1
  if (currentTimeMs < charFadeOutStartMs) {
    return 1;
  }

  // Time elapsed since this character's fade-out started
  const fadeOutElapsed = currentTimeMs - charFadeOutStartMs;

  // If this character's fade-out is complete, alpha is 0
  if (fadeOutElapsed >= singleCharDuration) {
    return 0;
  }

  // If duration is 0, return 0 immediately
  if (singleCharDuration === 0) {
    return 0;
  }

  // Linear interpolation: alpha goes from 1 to 0
  return 1 - (fadeOutElapsed / singleCharDuration);
}

/**
 * Calculates combined alpha for fade-in and fade-out
 * Handles the full animation lifecycle: fade in -> hold -> fade out
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {number} totalFrames - Total number of frames in the video
 * @returns {number} Alpha value between 0 and 1
 */
function calculateCombinedFadeAlpha(frameNumber, fps, animationConfig, totalFrames) {
  const fadeInAlpha = calculateFadeInAlpha(frameNumber, fps, animationConfig);
  const fadeOutAlpha = calculateFadeOutAlpha(frameNumber, fps, animationConfig, totalFrames);

  // Combined alpha is the minimum of both (both effects apply)
  return Math.min(fadeInAlpha, fadeOutAlpha);
}

/**
 * Calculates combined alpha for per-character fade-in and fade-out
 *
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} fps - Frames per second of the video
 * @param {object} animationConfig - Animation configuration object
 * @param {number} charIndex - Index of the character (0-indexed)
 * @param {number} totalChars - Total number of characters
 * @param {number} totalFrames - Total number of frames in the video
 * @returns {number} Alpha value between 0 and 1
 */
function calculatePerCharacterCombinedFadeAlpha(frameNumber, fps, animationConfig, charIndex, totalChars, totalFrames) {
  const fadeInAlpha = calculatePerCharacterFadeInAlpha(frameNumber, fps, animationConfig, charIndex, totalChars);
  const fadeOutAlpha = calculatePerCharacterFadeOutAlpha(frameNumber, fps, animationConfig, charIndex, totalChars, totalFrames);

  // Combined alpha is the minimum of both
  return Math.min(fadeInAlpha, fadeOutAlpha);
}

/**
 * Applies alpha to a canvas context for fade animation
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} alpha - Alpha value between 0 and 1
 */
function applyAlphaToContext(ctx, alpha) {
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
}

/**
 * Resets the canvas context alpha to fully opaque
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 */
function resetContextAlpha(ctx) {
  ctx.globalAlpha = 1;
}

/**
 * Creates an animation state object for tracking animation across frames
 *
 * @param {object} animationConfig - Animation configuration
 * @param {number} fps - Frames per second
 * @param {number} totalFrames - Total number of frames in the video
 * @returns {object} Animation state object
 */
function createAnimationState(animationConfig, fps, totalFrames) {
  const type = animationConfig?.type || 'none';
  const duration = animationConfig?.duration || 500;
  const delay = animationConfig?.delay || 0;
  const perCharacter = animationConfig?.perCharacter || false;
  const fadeOutStart = animationConfig?.fadeOutStart;
  const fadeOutDuration = animationConfig?.fadeOutDuration;

  return {
    type,
    duration,
    delay,
    perCharacter,
    fadeOutStart,
    fadeOutDuration,
    fps,
    totalFrames,
    isEnabled: type !== 'none',
    hasFadeOut: fadeOutStart !== undefined && fadeOutStart !== null
  };
}

/**
 * Gets the alpha value for a given frame using the animation state
 *
 * @param {object} animationState - Animation state object from createAnimationState
 * @param {number} frameNumber - Current frame number (0-indexed)
 * @param {number} [charIndex] - Optional character index for per-character animation
 * @param {number} [totalChars] - Optional total characters for per-character animation
 * @returns {number} Alpha value between 0 and 1
 */
function getFrameAlpha(animationState, frameNumber, charIndex = 0, totalChars = 1) {
  if (!animationState || !animationState.isEnabled) {
    return 1;
  }

  const animConfig = {
    type: animationState.type,
    duration: animationState.duration,
    delay: animationState.delay,
    perCharacter: animationState.perCharacter,
    fadeOutStart: animationState.fadeOutStart,
    fadeOutDuration: animationState.fadeOutDuration
  };

  // Use combined fade calculations when fade-out is configured
  if (animationState.hasFadeOut) {
    if (animationState.perCharacter && totalChars > 1) {
      return calculatePerCharacterCombinedFadeAlpha(
        frameNumber,
        animationState.fps,
        animConfig,
        charIndex,
        totalChars,
        animationState.totalFrames
      );
    }
    return calculateCombinedFadeAlpha(frameNumber, animationState.fps, animConfig, animationState.totalFrames);
  }

  // Fade-in only (original behavior)
  if (animationState.perCharacter && totalChars > 1) {
    return calculatePerCharacterFadeInAlpha(
      frameNumber,
      animationState.fps,
      animConfig,
      charIndex,
      totalChars
    );
  }

  return calculateFadeInAlpha(frameNumber, animationState.fps, animConfig);
}

module.exports = {
  calculateFadeInAlpha,
  calculatePerCharacterFadeInAlpha,
  calculateFadeOutAlpha,
  calculatePerCharacterFadeOutAlpha,
  calculateCombinedFadeAlpha,
  calculatePerCharacterCombinedFadeAlpha,
  applyAlphaToContext,
  resetContextAlpha,
  createAnimationState,
  getFrameAlpha
};
