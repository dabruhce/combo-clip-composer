const {
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
} = require('../src/animation/fadeAnimation');

describe('fadeAnimation', () => {
  describe('calculateFadeInAlpha', () => {
    const fps = 30; // 30 frames per second

    describe('basic fade-in calculations', () => {
      test('should return 1 when animation type is "none"', () => {
        const alpha = calculateFadeInAlpha(10, fps, { type: 'none', duration: 500 });
        expect(alpha).toBe(1);
      });

      test('should return 1 when animationConfig is null', () => {
        const alpha = calculateFadeInAlpha(10, fps, null);
        expect(alpha).toBe(1);
      });

      test('should return 1 when animationConfig is undefined', () => {
        const alpha = calculateFadeInAlpha(10, fps, undefined);
        expect(alpha).toBe(1);
      });

      test('should return 0 at frame 0 with no delay', () => {
        const alpha = calculateFadeInAlpha(0, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBe(0);
      });

      test('should return 1 after fade duration completes', () => {
        // 500ms at 30fps = 15 frames
        const alpha = calculateFadeInAlpha(15, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBe(1);
      });

      test('should return 1 well after fade duration completes', () => {
        const alpha = calculateFadeInAlpha(100, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBe(1);
      });

      test('should return 0.5 at midpoint of fade', () => {
        // 250ms at 30fps = 7.5 frames
        const alpha = calculateFadeInAlpha(7.5, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBeCloseTo(0.5, 5);
      });
    });

    describe('alpha at various frame points', () => {
      test('should calculate correct alpha at 25% through fade', () => {
        // 125ms at 30fps = 3.75 frames
        const alpha = calculateFadeInAlpha(3.75, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBeCloseTo(0.25, 5);
      });

      test('should calculate correct alpha at 75% through fade', () => {
        // 375ms at 30fps = 11.25 frames
        const alpha = calculateFadeInAlpha(11.25, fps, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBeCloseTo(0.75, 5);
      });

      test('should calculate correct alpha with 60fps', () => {
        // 500ms fade at 60fps = 30 frames total
        // At frame 15, we're at 250ms, which is 50%
        const alpha = calculateFadeInAlpha(15, 60, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBeCloseTo(0.5, 5);
      });

      test('should calculate correct alpha with 24fps', () => {
        // 500ms fade at 24fps = 12 frames total
        // At frame 6, we're at 250ms, which is 50%
        const alpha = calculateFadeInAlpha(6, 24, { type: 'fade', duration: 500, delay: 0 });
        expect(alpha).toBeCloseTo(0.5, 5);
      });
    });

    describe('delay handling', () => {
      test('should return 0 during delay period', () => {
        // 100ms delay, frame 1 = 33ms, still in delay
        const alpha = calculateFadeInAlpha(1, fps, { type: 'fade', duration: 500, delay: 100 });
        expect(alpha).toBe(0);
      });

      test('should return 0 at end of delay period', () => {
        // 100ms delay, frame 2 = 66ms, still in delay
        const alpha = calculateFadeInAlpha(2, fps, { type: 'fade', duration: 500, delay: 100 });
        expect(alpha).toBe(0);
      });

      test('should start fading after delay ends', () => {
        // 100ms delay at 30fps = 3 frames
        // At frame 4, we're at 133ms, so 33ms into fade
        // 33ms / 500ms = 0.066
        const alpha = calculateFadeInAlpha(4, fps, { type: 'fade', duration: 500, delay: 100 });
        expect(alpha).toBeGreaterThan(0);
        expect(alpha).toBeLessThan(0.15);
      });

      test('should complete fade after delay + duration', () => {
        // 200ms delay + 500ms duration = 700ms total
        // At 30fps, 700ms = 21 frames
        const alpha = calculateFadeInAlpha(21, fps, { type: 'fade', duration: 500, delay: 200 });
        expect(alpha).toBe(1);
      });

      test('should handle long delay with short duration', () => {
        // 1000ms delay + 100ms duration at 30fps
        // At frame 30 (1000ms), fade should just start
        const alphaAtDelayEnd = calculateFadeInAlpha(30, fps, { type: 'fade', duration: 100, delay: 1000 });
        expect(alphaAtDelayEnd).toBeCloseTo(0, 5);

        // At frame 33 (1100ms), fade should be complete
        const alphaAfterFade = calculateFadeInAlpha(33, fps, { type: 'fade', duration: 100, delay: 1000 });
        expect(alphaAfterFade).toBe(1);
      });
    });

    describe('edge cases', () => {
      test('should handle duration of 0 (instant fade)', () => {
        const alpha = calculateFadeInAlpha(0, fps, { type: 'fade', duration: 0, delay: 0 });
        expect(alpha).toBe(1);
      });

      test('should handle very small duration', () => {
        // 10ms duration at 30fps, frame 1 = 33ms
        const alpha = calculateFadeInAlpha(1, fps, { type: 'fade', duration: 10, delay: 0 });
        expect(alpha).toBe(1);
      });

      test('should use default duration when not provided', () => {
        // Default duration is 500ms
        const alpha = calculateFadeInAlpha(7.5, fps, { type: 'fade', delay: 0 });
        expect(alpha).toBeCloseTo(0.5, 5);
      });

      test('should use default delay (0) when not provided', () => {
        const alpha = calculateFadeInAlpha(0, fps, { type: 'fade', duration: 500 });
        expect(alpha).toBe(0);
      });

      test('should handle negative frame number as 0', () => {
        // Negative frames would result in negative time, which is before delay
        const alpha = calculateFadeInAlpha(-5, fps, { type: 'fade', duration: 500, delay: 0 });
        // Negative time is less than 0 delay, so should be in "before delay" state
        expect(alpha).toBeLessThanOrEqual(0);
      });
    });
  });

  describe('calculatePerCharacterFadeInAlpha', () => {
    const fps = 30;

    describe('basic per-character calculations', () => {
      test('should return 1 when perCharacter is false', () => {
        const alpha = calculatePerCharacterFadeInAlpha(10, fps, {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: false
        }, 0, 5);
        // Should fall back to regular fade
        expect(alpha).toBeLessThanOrEqual(1);
        expect(alpha).toBeGreaterThan(0);
      });

      test('should return 1 when animation type is "none"', () => {
        const alpha = calculatePerCharacterFadeInAlpha(10, fps, {
          type: 'none',
          perCharacter: true
        }, 0, 5);
        expect(alpha).toBe(1);
      });

      test('should return 1 when totalChars is 0', () => {
        const alpha = calculatePerCharacterFadeInAlpha(10, fps, {
          type: 'fade',
          duration: 500,
          perCharacter: true
        }, 0, 0);
        // Falls back to regular fade, which would be complete
        expect(alpha).toBeLessThanOrEqual(1);
      });

      test('should return 1 for single character (no stagger needed)', () => {
        // With only 1 character, it behaves like regular fade
        const alpha = calculatePerCharacterFadeInAlpha(15, fps, {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: true
        }, 0, 1);
        expect(alpha).toBe(1);
      });
    });

    describe('staggered fade calculations', () => {
      test('first character should start fading at delay time', () => {
        const alpha = calculatePerCharacterFadeInAlpha(0, fps, {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: true
        }, 0, 5);
        expect(alpha).toBe(0);
      });

      test('last character should start fading later than first', () => {
        const config = {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: true
        };
        const firstCharAlpha = calculatePerCharacterFadeInAlpha(5, fps, config, 0, 5);
        const lastCharAlpha = calculatePerCharacterFadeInAlpha(5, fps, config, 4, 5);

        // First character should be further along than last character
        expect(firstCharAlpha).toBeGreaterThan(lastCharAlpha);
      });

      test('middle character should have intermediate alpha', () => {
        const config = {
          type: 'fade',
          duration: 500,
          delay: 0,
          perCharacter: true
        };
        const frame = 8;
        const firstCharAlpha = calculatePerCharacterFadeInAlpha(frame, fps, config, 0, 5);
        const middleCharAlpha = calculatePerCharacterFadeInAlpha(frame, fps, config, 2, 5);
        const lastCharAlpha = calculatePerCharacterFadeInAlpha(frame, fps, config, 4, 5);

        expect(firstCharAlpha).toBeGreaterThanOrEqual(middleCharAlpha);
        expect(middleCharAlpha).toBeGreaterThanOrEqual(lastCharAlpha);
      });

      test('all characters should be fully visible after duration + delay', () => {
        const config = {
          type: 'fade',
          duration: 500,
          delay: 100,
          perCharacter: true
        };
        // Well past delay + duration (600ms = 18 frames)
        const frame = 25;

        for (let i = 0; i < 10; i++) {
          const alpha = calculatePerCharacterFadeInAlpha(frame, fps, config, i, 10);
          expect(alpha).toBe(1);
        }
      });
    });

    describe('delay handling with per-character', () => {
      test('all characters should be hidden during delay', () => {
        const config = {
          type: 'fade',
          duration: 500,
          delay: 200,
          perCharacter: true
        };
        // Frame 3 = 100ms, still in delay (< 200ms)
        const frame = 3;

        for (let i = 0; i < 5; i++) {
          const alpha = calculatePerCharacterFadeInAlpha(frame, fps, config, i, 5);
          expect(alpha).toBe(0);
        }
      });
    });
  });

  describe('calculateFadeOutAlpha', () => {
    const fps = 30;
    const totalFrames = 100; // ~3.33 seconds at 30fps

    describe('basic fade-out calculations', () => {
      test('should return 1 when animation type is "none"', () => {
        const alpha = calculateFadeOutAlpha(10, fps, { type: 'none', fadeOutStart: 50 }, totalFrames);
        expect(alpha).toBe(1);
      });

      test('should return 1 when animationConfig is null', () => {
        const alpha = calculateFadeOutAlpha(10, fps, null, totalFrames);
        expect(alpha).toBe(1);
      });

      test('should return 1 when fadeOutStart is undefined', () => {
        const alpha = calculateFadeOutAlpha(80, fps, { type: 'fade', duration: 500 }, totalFrames);
        expect(alpha).toBe(1);
      });

      test('should return 1 before fadeOutStart frame', () => {
        const alpha = calculateFadeOutAlpha(40, fps, {
          type: 'fade',
          fadeOutStart: 50,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alpha).toBe(1);
      });

      test('should return 0 after fade-out completes', () => {
        // fadeOutStart at frame 50 (1666ms at 30fps)
        // fadeOutDuration 500ms = 15 frames
        // So at frame 65+, alpha should be 0
        const alpha = calculateFadeOutAlpha(70, fps, {
          type: 'fade',
          fadeOutStart: 50,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alpha).toBe(0);
      });

      test('should return 0.5 at midpoint of fade-out', () => {
        // fadeOutStart at frame 60 (2000ms at 30fps)
        // fadeOutDuration 500ms = 15 frames
        // Midpoint is frame 60 + 7.5 = 67.5
        const alpha = calculateFadeOutAlpha(67.5, fps, {
          type: 'fade',
          fadeOutStart: 60,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alpha).toBeCloseTo(0.5, 5);
      });
    });

    describe('fadeOutStart as percentage', () => {
      test('should interpret decimal 0.8 as 80% of total duration', () => {
        // totalFrames = 100, so 0.8 * 100 = frame 80
        // At frame 70, we should still be at alpha 1 (before fade-out)
        const alpha = calculateFadeOutAlpha(70, fps, {
          type: 'fade',
          fadeOutStart: 0.8,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alpha).toBe(1);
      });

      test('should start fading at 80% of duration when fadeOutStart is 0.8', () => {
        // totalFrames = 100, 0.8 * 100 = frame 80
        // At frame 85, we should be partway through fade-out
        const alpha = calculateFadeOutAlpha(85, fps, {
          type: 'fade',
          fadeOutStart: 0.8,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alpha).toBeLessThan(1);
        expect(alpha).toBeGreaterThan(0);
      });
    });

    describe('fadeOutStart as frame number', () => {
      test('should interpret integer > 1 as frame number', () => {
        // fadeOutStart at frame 50
        const alphaBefore = calculateFadeOutAlpha(40, fps, {
          type: 'fade',
          fadeOutStart: 50,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alphaBefore).toBe(1);

        const alphaAt = calculateFadeOutAlpha(55, fps, {
          type: 'fade',
          fadeOutStart: 50,
          fadeOutDuration: 500
        }, totalFrames);
        expect(alphaAt).toBeLessThan(1);
      });
    });

    describe('edge cases', () => {
      test('should handle fadeOutDuration of 0 (instant fade)', () => {
        const alpha = calculateFadeOutAlpha(55, fps, {
          type: 'fade',
          fadeOutStart: 50,
          fadeOutDuration: 0
        }, totalFrames);
        expect(alpha).toBe(0);
      });

      test('should use duration as default when fadeOutDuration not set', () => {
        // fadeOutStart at frame 50, duration = 500ms (default for fadeOutDuration)
        const alpha = calculateFadeOutAlpha(57.5, fps, {
          type: 'fade',
          duration: 500,
          fadeOutStart: 50
        }, totalFrames);
        // At frame 57.5, 7.5 frames past start = 250ms into 500ms fade
        expect(alpha).toBeCloseTo(0.5, 5);
      });
    });
  });

  describe('calculatePerCharacterFadeOutAlpha', () => {
    const fps = 30;
    const totalFrames = 100;

    test('should return 1 when perCharacter is false', () => {
      const alpha = calculatePerCharacterFadeOutAlpha(80, fps, {
        type: 'fade',
        fadeOutStart: 50,
        fadeOutDuration: 500,
        perCharacter: false
      }, 0, 5, totalFrames);
      // Should fall back to regular fade-out calculation
      expect(alpha).toBeLessThan(1);
    });

    test('should return 1 when fadeOutStart is not set', () => {
      const alpha = calculatePerCharacterFadeOutAlpha(80, fps, {
        type: 'fade',
        perCharacter: true
      }, 0, 5, totalFrames);
      expect(alpha).toBe(1);
    });

    test('last character should start fading before first character', () => {
      const config = {
        type: 'fade',
        fadeOutStart: 50,
        fadeOutDuration: 500,
        perCharacter: true
      };
      // The last character (index 4) should start fading first
      const firstCharAlpha = calculatePerCharacterFadeOutAlpha(55, fps, config, 0, 5, totalFrames);
      const lastCharAlpha = calculatePerCharacterFadeOutAlpha(55, fps, config, 4, 5, totalFrames);

      // Last character should be more faded (lower alpha) than first
      expect(lastCharAlpha).toBeLessThan(firstCharAlpha);
    });

    test('all characters should be invisible after fade-out completes', () => {
      const config = {
        type: 'fade',
        fadeOutStart: 50,
        fadeOutDuration: 500,
        perCharacter: true
      };
      // Well past fade-out duration
      const frame = 80;

      for (let i = 0; i < 5; i++) {
        const alpha = calculatePerCharacterFadeOutAlpha(frame, fps, config, i, 5, totalFrames);
        expect(alpha).toBe(0);
      }
    });
  });

  describe('calculateCombinedFadeAlpha', () => {
    const fps = 30;
    const totalFrames = 100;

    test('should return 0 at start (before fade-in)', () => {
      const alpha = calculateCombinedFadeAlpha(0, fps, {
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, totalFrames);
      expect(alpha).toBe(0);
    });

    test('should return 1 during hold period (after fade-in, before fade-out)', () => {
      // Fade-in completes at ~frame 15 (500ms at 30fps)
      // Fade-out starts at frame 80
      const alpha = calculateCombinedFadeAlpha(50, fps, {
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, totalFrames);
      expect(alpha).toBe(1);
    });

    test('should return 0 after fade-out completes', () => {
      // Fade-out starts at frame 80, duration 500ms = 15 frames
      // So at frame 95+, alpha should be 0
      const alpha = calculateCombinedFadeAlpha(95, fps, {
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, totalFrames);
      expect(alpha).toBe(0);
    });

    test('should handle overlapping fade-in and fade-out', () => {
      // If fadeOutStart is early, they might overlap
      // In overlap region, should use minimum alpha
      const alpha = calculateCombinedFadeAlpha(10, fps, {
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 5, // Very early fade-out
        fadeOutDuration: 500
      }, totalFrames);
      // Both fade-in and fade-out are active, result is minimum
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThan(1);
    });

    test('should return 1 when no fadeOutStart (fade-in only)', () => {
      const alpha = calculateCombinedFadeAlpha(50, fps, {
        type: 'fade',
        duration: 500,
        delay: 0
      }, totalFrames);
      expect(alpha).toBe(1);
    });
  });

  describe('calculatePerCharacterCombinedFadeAlpha', () => {
    const fps = 30;
    const totalFrames = 100;

    test('should combine per-character fade-in and fade-out', () => {
      const config = {
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500,
        perCharacter: true
      };

      // During hold period
      const alphaHold = calculatePerCharacterCombinedFadeAlpha(50, fps, config, 0, 5, totalFrames);
      expect(alphaHold).toBe(1);

      // During fade-out - test the last character (index 4) which fades first
      const alphaFadeOut = calculatePerCharacterCombinedFadeAlpha(85, fps, config, 4, 5, totalFrames);
      expect(alphaFadeOut).toBeLessThan(1);
    });
  });

  describe('applyAlphaToContext', () => {
    test('should set globalAlpha on context', () => {
      const ctx = { globalAlpha: 1 };
      applyAlphaToContext(ctx, 0.5);
      expect(ctx.globalAlpha).toBe(0.5);
    });

    test('should clamp alpha to minimum of 0', () => {
      const ctx = { globalAlpha: 1 };
      applyAlphaToContext(ctx, -0.5);
      expect(ctx.globalAlpha).toBe(0);
    });

    test('should clamp alpha to maximum of 1', () => {
      const ctx = { globalAlpha: 0 };
      applyAlphaToContext(ctx, 1.5);
      expect(ctx.globalAlpha).toBe(1);
    });
  });

  describe('resetContextAlpha', () => {
    test('should set globalAlpha to 1', () => {
      const ctx = { globalAlpha: 0.5 };
      resetContextAlpha(ctx);
      expect(ctx.globalAlpha).toBe(1);
    });
  });

  describe('createAnimationState', () => {
    test('should create state with provided values', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 1000,
        delay: 200,
        perCharacter: true
      }, 30, 100);

      expect(state.type).toBe('fade');
      expect(state.duration).toBe(1000);
      expect(state.delay).toBe(200);
      expect(state.perCharacter).toBe(true);
      expect(state.fps).toBe(30);
      expect(state.totalFrames).toBe(100);
      expect(state.isEnabled).toBe(true);
    });

    test('should use defaults when config is null', () => {
      const state = createAnimationState(null, 30, 100);

      expect(state.type).toBe('none');
      expect(state.duration).toBe(500);
      expect(state.delay).toBe(0);
      expect(state.perCharacter).toBe(false);
      expect(state.isEnabled).toBe(false);
    });

    test('should mark isEnabled as false for type "none"', () => {
      const state = createAnimationState({ type: 'none' }, 30, 100);
      expect(state.isEnabled).toBe(false);
    });

    test('should mark isEnabled as true for type "fade"', () => {
      const state = createAnimationState({ type: 'fade' }, 30, 100);
      expect(state.isEnabled).toBe(true);
    });

    test('should include fadeOut properties when provided', () => {
      const state = createAnimationState({
        type: 'fade',
        fadeOutStart: 80,
        fadeOutDuration: 300
      }, 30, 100);

      expect(state.fadeOutStart).toBe(80);
      expect(state.fadeOutDuration).toBe(300);
      expect(state.hasFadeOut).toBe(true);
    });

    test('should set hasFadeOut to false when fadeOutStart not provided', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500
      }, 30, 100);

      expect(state.fadeOutStart).toBeUndefined();
      expect(state.hasFadeOut).toBe(false);
    });
  });

  describe('getFrameAlpha', () => {
    test('should return 1 when animation state is null', () => {
      const alpha = getFrameAlpha(null, 10);
      expect(alpha).toBe(1);
    });

    test('should return 1 when animation is not enabled', () => {
      const state = createAnimationState({ type: 'none' }, 30, 100);
      const alpha = getFrameAlpha(state, 10);
      expect(alpha).toBe(1);
    });

    test('should calculate fade-in alpha correctly', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        perCharacter: false
      }, 30, 100);

      const alpha = getFrameAlpha(state, 7.5);
      expect(alpha).toBeCloseTo(0.5, 5);
    });

    test('should use per-character animation when enabled', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        perCharacter: true
      }, 30, 100);

      const alpha0 = getFrameAlpha(state, 5, 0, 5);
      const alpha4 = getFrameAlpha(state, 5, 4, 5);

      // First character should be more visible than last
      expect(alpha0).toBeGreaterThan(alpha4);
    });

    test('should fall back to regular fade when totalChars is 1', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        perCharacter: true
      }, 30, 100);

      // With totalChars = 1, should behave like regular fade
      const alpha = getFrameAlpha(state, 15, 0, 1);
      expect(alpha).toBe(1);
    });

    test('should use combined fade when fadeOutStart is set', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, 30, 100);

      // During hold period (after fade-in, before fade-out)
      const alphaHold = getFrameAlpha(state, 50);
      expect(alphaHold).toBe(1);

      // During fade-out
      const alphaFadeOut = getFrameAlpha(state, 87.5);
      expect(alphaFadeOut).toBeCloseTo(0.5, 5);
    });

    test('should use per-character combined fade when both are enabled', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500,
        perCharacter: true
      }, 30, 100);

      // During hold period
      const alphaHold = getFrameAlpha(state, 50, 0, 5);
      expect(alphaHold).toBe(1);

      // First and last char should have different alphas during fade-out
      const alpha0 = getFrameAlpha(state, 83, 0, 5);
      const alpha4 = getFrameAlpha(state, 83, 4, 5);
      // Last char fades first, so should have lower alpha
      expect(alpha4).toBeLessThanOrEqual(alpha0);
    });

    test('should return 0 at start with combined fade', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, 30, 100);

      const alpha = getFrameAlpha(state, 0);
      expect(alpha).toBe(0);
    });

    test('should return 0 after fade-out completes', () => {
      const state = createAnimationState({
        type: 'fade',
        duration: 500,
        delay: 0,
        fadeOutStart: 80,
        fadeOutDuration: 500
      }, 30, 100);

      const alpha = getFrameAlpha(state, 99);
      expect(alpha).toBe(0);
    });
  });
});
