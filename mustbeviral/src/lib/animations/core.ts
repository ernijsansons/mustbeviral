// Universe-Bending Animation Core
// Advanced animation system with cosmic effects

import { easing} from '../utils';
import { designTokens} from '../design/tokens';

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  easing?: keyof typeof easing | string;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
}

export interface CosmicAnimationOptions extends AnimationOptions {
  intensity?: 'subtle' | 'moderate' | 'intense';
  cosmicEffect?: 'glow' | 'particle' | 'warp' | 'quantum' | 'dimensional';
  interactivity?: boolean;
  responsiveness?: boolean;
}

export type AnimationPreset =
  | 'float' | 'pulse' | 'shimmer' | 'rotate' | 'scale' | 'bounce' | 'swing'
  | 'cosmic-drift' | 'quantum-leap' | 'nebula-swirl' | 'star-twinkle' | 'plasma-flow'
  | 'dimensional-flip' | 'energy-burst' | 'void-collapse' | 'aurora-dance';

// Core Animation Controller
export class CosmicAnimationController {
  private animations: Map<string, Animation> = new Map();
  private observer: IntersectionObserver | null = null;
  private prefersReducedMotion = false;

  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setupIntersectionObserver();
    this.bindMediaQuery();
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const animationId = element.dataset.cosmicAnimation;

          if (animationId) {
            const animation = this.animations.get(animationId);
            if (animation) {
              if (entry.isIntersecting) {
                animation.play();
              } else {
                // Optionally pause animations when out of view for performance
                // animation.pause();
              }
            }
          }
        });
      },
      { threshold: 0.1 }
    );
  }

  private bindMediaQuery() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', _(e) => {
      this.prefersReducedMotion = e.matches;
      if (e.matches) {
        this.pauseAllAnimations();
      } else {
        this.resumeAllAnimations();
      }
    });
  }

  // Create animation from preset
  createAnimation(
    element: HTMLElement,
    preset: AnimationPreset,
    options: CosmicAnimationOptions = {}
  ): string {
    if (this.prefersReducedMotion) {
      return 'reduced-motion';
    }

    const animationId = this.generateId();
    const keyframes = this.getPresetKeyframes(preset, options);
    const animationOptions = this.buildAnimationOptions(preset, options);

    try {
      const animation = element.animate(keyframes, animationOptions);

      // Store animation
      this.animations.set(animationId, animation);
      element.dataset.cosmicAnimation = animationId;

      // Add to intersection observer for performance optimization
      if (this.observer) {
        this.observer.observe(element);
      }

      // Add cosmic effects if specified
      if (options.cosmicEffect) {
        this.applyCosmicEffect(element, options.cosmicEffect, options.intensity);
      }

      return animationId;
    } catch (error: unknown) {
      console.warn('Animation creation failed:', error);
      return 'failed';
    }
  }

  // Create custom animation
  createCustomAnimation(
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: CosmicAnimationOptions = {}
  ): string {
    if(this.prefersReducedMotion) {
      return 'reduced-motion';
    }

    const animationId = this.generateId();
    const animationOptions = this.buildAnimationOptions('custom', options);

    try {
      const animation = element.animate(keyframes, animationOptions);

      this.animations.set(animationId, animation);
      element.dataset.cosmicAnimation = animationId;

      if (this.observer) {
        this.observer.observe(element);
      }

      if (options.cosmicEffect) {
        this.applyCosmicEffect(element, options.cosmicEffect, options.intensity);
      }

      return animationId;
    } catch (error: unknown) {
      console.warn('Custom animation creation failed:', error);
      return 'failed';
    }
  }

  // Control animations
  play(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation && !this.prefersReducedMotion) {
      animation.play();
    }
  }

  pause(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation) {
      animation.pause();
    }
  }

  stop(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation) {
      animation.cancel();
      this.animations.delete(animationId);
    }
  }

  // Batch controls
  pauseAllAnimations(): void {
    this.animations.forEach(animation => animation.pause());
  }

  resumeAllAnimations(): void {
    if (!this.prefersReducedMotion) {
      this.animations.forEach(animation => animation.play());
    }
  }

  stopAllAnimations(): void {
    this.animations.forEach(animation => animation.cancel());
    this.animations.clear();
  }

  // Get preset keyframes
  private getPresetKeyframes(preset: AnimationPreset, options: CosmicAnimationOptions): Keyframe[] {
    const intensity = options.intensity ?? 'moderate';
    const intensityMap = { subtle: 0.5, moderate: 1, intense: 1.5 };
    const factor = intensityMap[intensity];

    switch (preset) {
      case 'float':
        return [
          { transform: 'translateY(0px)', offset: 0 },
          { transform: `translateY(${-10 * factor}px)`, offset: 0.5 },
          { transform: 'translateY(0px)', offset: 1 }
        ];

      case 'pulse':
        return [
          { transform: 'scale(1)', opacity: '1', offset: 0 },
          { transform: `scale(${1 + 0.05 * factor})`, opacity: '0.8', offset: 0.5 },
          { transform: 'scale(1)', opacity: '1', offset: 1 }
        ];

      case 'shimmer':
        return [
          { transform: 'translateX(-100%)', offset: 0 },
          { transform: 'translateX(100%)', offset: 1 }
        ];

      case 'rotate':
        return [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: 'rotate(360deg)', offset: 1 }
        ];

      case 'scale':
        return [
          { transform: 'scale(1)', offset: 0 },
          { transform: `scale(${1 + 0.1 * factor})`, offset: 0.5 },
          { transform: 'scale(1)', offset: 1 }
        ];

      case 'bounce':
        return [
          { transform: 'translateY(0)', animationTimingFunction: 'ease-out', offset: 0 },
          { transform: `translateY(${-15 * factor}px)`, animationTimingFunction: 'ease-in', offset: 0.5 },
          { transform: 'translateY(0)', animationTimingFunction: 'ease-out', offset: 1 }
        ];

      case 'cosmic-drift':
        return [
          {
            transform: 'translate(0, 0) rotate(0deg)',
            filter: `hue-rotate(0deg) brightness(1)`,
            offset: 0
          },
          {
            transform: `translate(${5 * factor}px, ${-3 * factor}px) rotate(${2 * factor}deg)`,
            filter: `hue-rotate(${90 * factor}deg) brightness(1.1)`,
            offset: 0.33
          },
          {
            transform: `translate(${-3 * factor}px, ${4 * factor}px) rotate(${-1 * factor}deg)`,
            filter: `hue-rotate(${180 * factor}deg) brightness(0.9)`,
            offset: 0.66
          },
          {
            transform: 'translate(0, 0) rotate(0deg)',
            filter: `hue-rotate(360deg) brightness(1)`,
            offset: 1
          }
        ];

      case 'quantum-leap':
        return [
          { transform: 'scale(1) translateX(0)', opacity: '1', offset: 0 },
          { transform: `scale(${0.5 + 0.3 * factor}) translateX(${20 * factor}px)`, opacity: '0.3', offset: 0.3 },
          { transform: `scale(${1.2 * factor}) translateX(${-10 * factor}px)`, opacity: '0.7', offset: 0.7 },
          { transform: 'scale(1) translateX(0)', opacity: '1', offset: 1 }
        ];

      case 'nebula-swirl':
        return [
          {
            transform: 'rotate(0deg) scale(1)',
            filter: 'blur(0px) hue-rotate(0deg)',
            opacity: '1',
            offset: 0
          },
          {
            transform: `rotate(${180 * factor}deg) scale(${1.1 * factor})`,
            filter: `blur(${1 * factor}px) hue-rotate(${120 * factor}deg)`,
            opacity: '0.8',
            offset: 0.5
          },
          {
            transform: `rotate(${360 * factor}deg) scale(1)`,
            filter: 'blur(0px) hue-rotate(360deg)',
            opacity: '1',
            offset: 1
          }
        ];

      case 'star-twinkle':
        return [
          { opacity: '0.3', transform: 'scale(0.8)', offset: 0 },
          { opacity: '1', transform: `scale(${1.2 * factor})`, offset: 0.5 },
          { opacity: '0.3', transform: 'scale(0.8)', offset: 1 }
        ];

      case 'plasma-flow':
        return [
          {
            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            transform: 'translateX(0) skewX(0deg)',
            offset: 0
          },
          {
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            transform: `translateX(${10 * factor}px) skewX(${5 * factor}deg)`,
            offset: 0.5
          },
          {
            background: 'linear-gradient(225deg, #4facfe 0%, #00f2fe 100%)',
            transform: 'translateX(0) skewX(0deg)',
            offset: 1
          }
        ];

      case 'dimensional-flip':
        return [
          { transform: 'rotateY(0deg) rotateX(0deg)', offset: 0 },
          { transform: `rotateY(${180 * factor}deg) rotateX(${90 * factor}deg)`, offset: 0.5 },
          { transform: 'rotateY(360deg) rotateX(0deg)', offset: 1 }
        ];

      case 'energy-burst':
        return [
          {
            transform: 'scale(1)',
            boxShadow: '0 0 0 rgba(108, 92, 231, 0)',
            offset: 0
          },
          {
            transform: `scale(${1.1 * factor})`,
            boxShadow: `0 0 ${20 * factor}px rgba(108, 92, 231, ${0.6 * factor})`,
            offset: 0.5
          },
          {
            transform: 'scale(1)',
            boxShadow: '0 0 0 rgba(108, 92, 231, 0)',
            offset: 1
          }
        ];

      case 'void-collapse':
        return [
          {
            transform: 'scale(1)',
            filter: 'brightness(1) contrast(1)',
            offset: 0
          },
          {
            transform: `scale(${0.3 + 0.4 * factor})`,
            filter: `brightness(${0.3 + 0.4 * factor}) contrast(${2 * factor})`,
            offset: 0.7
          },
          {
            transform: 'scale(1)',
            filter: 'brightness(1) contrast(1)',
            offset: 1
          }
        ];

      case 'aurora-dance':
        return [
          {
            background: 'linear-gradient(45deg, #ff6b9d 0%, #c44569 50%, #f8b500 100%)',
            transform: 'translateY(0) rotate(0deg)',
            filter: 'hue-rotate(0deg)',
            offset: 0
          },
          {
            background: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 50%, #54a0ff 100%)',
            transform: `translateY(${-5 * factor}px) rotate(${10 * factor}deg)`,
            filter: `hue-rotate(${120 * factor}deg)`,
            offset: 0.33
          },
          {
            background: 'linear-gradient(225deg, #5f27cd 0%, #00d2d3 50%, #ff9ff3 100%)',
            transform: `translateY(${5 * factor}px) rotate(${-5 * factor}deg)`,
            filter: `hue-rotate(${240 * factor}deg)`,
            offset: 0.66
          },
          {
            background: 'linear-gradient(315deg, #ff6b9d 0%, #c44569 50%, #f8b500 100%)',
            transform: 'translateY(0) rotate(0deg)',
            filter: 'hue-rotate(360deg)',
            offset: 1
          }
        ];

      default:
        return [
          { transform: 'translateY(0px)', offset: 0 },
          { transform: 'translateY(-10px)', offset: 0.5 },
          { transform: 'translateY(0px)', offset: 1 }
        ];
    }
  }

  private buildAnimationOptions(preset: AnimationPreset, options: CosmicAnimationOptions): KeyframeAnimationOptions {

    return {
      duration: options.duration ?? this.getPresetDuration(preset),
      delay: options.delay ?? 0,
      easing: this.getEasingFunction(options.easing ?? this.getPresetEasing(preset)),
      iterations: options.iterations ?? this.getPresetIterations(preset),
      direction: options.direction ?? 'normal',
      fill: options.fillMode ?? 'both'
    };
  }

  private getPresetDuration(preset: AnimationPreset): number {
    const durations: Record<AnimationPreset, number> = {
      'float': 3000,
      'pulse': 2000,
      'shimmer': 1500,
      'rotate': 20000,
      'scale': 2000,
      'bounce': 1000,
      'swing': 2500,
      'cosmic-drift': 8000,
      'quantum-leap': 1200,
      'nebula-swirl': 6000,
      'star-twinkle': 1500,
      'plasma-flow': 4000,
      'dimensional-flip': 2000,
      'energy-burst': 1500,
      'void-collapse': 3000,
      'aurora-dance': 5000
    };

    return durations[preset]  ?? 2000;
  }

  private getPresetEasing(preset: AnimationPreset): string {
    const easings: Record<AnimationPreset, string> = {
      'float': 'ease-in-out',
      'pulse': 'ease-in-out',
      'shimmer': 'linear',
      'rotate': 'linear',
      'scale': 'ease-in-out',
      'bounce': 'ease-out',
      'swing': 'ease-in-out',
      'cosmic-drift': 'ease-in-out',
      'quantum-leap': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'nebula-swirl': 'ease-in-out',
      'star-twinkle': 'ease-in-out',
      'plasma-flow': 'linear',
      'dimensional-flip': 'ease-in-out',
      'energy-burst': 'ease-out',
      'void-collapse': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      'aurora-dance': 'ease-in-out'
    };

    return easings[preset]  ?? 'ease-in-out';
  }

  private getPresetIterations(preset: AnimationPreset): number | 'infinite' {
    const finite = ['quantum-leap', 'dimensional-flip', 'energy-burst', 'void-collapse'];
    return finite.includes(preset) ? 1 : 'infinite';
  }

  private getEasingFunction(easing: string): string {
    if (easing.startsWith('cubic-bezier')  ?? ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(easing)) {
      return easing;
    }

    const customEasings: Record<string, string> = {
      cosmic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      quantum: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      energy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    };

    return customEasings[easing]  ?? 'ease-in-out';
  }

  private applyCosmicEffect(
    element: HTMLElement,
    effect: 'glow' | 'particle' | 'warp' | 'quantum' | 'dimensional',
    intensity: 'subtle' | 'moderate' | 'intense' = 'moderate'
  ): void {
    const intensityMap = { subtle: 0.3, moderate: 0.6, intense: 1 };
    const factor = intensityMap[intensity];

    switch (effect) {
      case 'glow':
        element.style.filter = `drop-shadow(0 0 ${10 * factor}px rgba(108, 92, 231, ${0.6 * factor}))`;
        break;
      case 'warp':
        element.style.transform += ` perspective(1000px)`;
        break;
      case 'quantum':
        element.style.filter = `blur(${0.5 * factor}px) brightness(${1 + 0.2 * factor})`;
        break;
      case 'dimensional':
        element.style.transformStyle = 'preserve-3d';
        break;
    }
  }

  private generateId(): string {
    return 'cosmic-anim-' + Math.random().toString(36).substr(2, 9);
  }

  // Cleanup
  destroy(): void {
    this.stopAllAnimations();
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Global animation controller instance
export const cosmicAnimations = new CosmicAnimationController();