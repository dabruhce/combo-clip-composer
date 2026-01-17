/**
 * Fade animation module for Combo Clip Composer
 * Provides fade-in animation logic for text overlays
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

  return {
    type,
    duration,
    delay,
    perCharacter,
    fps,
    totalFrames,
    isEnabled: type !== 'none'
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
    perCharacter: animationState.perCharacter
  };

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
  applyAlphaToContext,
  resetContextAlpha,
  createAnimationState,
  getFrameAlpha
};
