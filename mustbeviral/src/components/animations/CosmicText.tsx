// Universe-Bending Text Animation Component
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useCosmicAnimation, useCosmicSequence } from '../../hooks/useCosmicAnimation';
import { useTheme } from '../../providers/ThemeProvider';

interface CosmicTextProps {
  children: string;
  className?: string;
  variant?: 'typewriter' | 'wave' | 'glitch' | 'hologram' | 'quantum' | 'stellar';
  speed?: 'slow' | 'normal' | 'fast';
  delay?: number;
  loop?: boolean;
  trigger?: 'mount' | 'intersect' | 'hover';
  glowEffect?: boolean;
}

export function CosmicText({ children, className, variant = 'typewriter', speed = 'normal', delay = 0, loop = false, trigger = 'mount', glowEffect = true }: CosmicTextProps) {
  const { cosmicEffectsLevel, isAnimationEnabled } = useTheme();
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Speed configuration
  const speeds = {
    slow: 150,
    normal: 100,
    fast: 50,
  };

  const baseSpeed = speeds[speed];

  // Typewriter effect
  useEffect(() => {
    if (variant !== 'typewriter' || !isAnimationEnabled) {
      setDisplayText(children);
      return;
    }

    const startTypewriter = () => {
      setDisplayText('');
      setCurrentIndex(0);

      const timeout = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          setCurrentIndex((prev) => {
            if (prev >= children.length) {
              if (loop) {
                setDisplayText('');
                return 0;
              } else {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                return prev;
              }
            }
            setDisplayText(children.slice(0, prev + 1));
            return prev + 1;
          });
        }, baseSpeed);
      }, delay);

      return () => {
        clearTimeout(timeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    };

    if (trigger === 'mount') {
      return startTypewriter();
    }

    // Intersection observer for 'intersect' trigger
    if (trigger === 'intersect' && containerRef.current) {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startTypewriter();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [children, variant, baseSpeed, delay, loop, trigger, isAnimationEnabled]);

  // Animation hooks for different variants
  const waveAnimation = useCosmicAnimation('cosmic-drift', {
    enabled: variant === 'wave' && isAnimationEnabled,
    trigger: trigger as unknown,
    duration: 3000,
    iterations: loop ? 'infinite' : 1,
    intensity: cosmicEffectsLevel === 'minimal' ? 'subtle' : 'moderate',
  });

  const glitchAnimation = useCosmicAnimation('quantum-leap', {
    enabled: variant === 'glitch' && isAnimationEnabled,
    trigger: trigger as unknown,
    duration: 200,
    iterations: loop ? 'infinite' : 3,
    intensity: cosmicEffectsLevel === 'minimal' ? 'subtle' : 'intense',
  });

  const hologramAnimation = useCosmicAnimation('star-twinkle', {
    enabled: variant === 'hologram' && isAnimationEnabled,
    trigger: trigger as unknown,
    duration: 2000,
    iterations: loop ? 'infinite' : 1,
    cosmicEffect: 'glow',
    intensity: cosmicEffectsLevel === 'minimal' ? 'subtle' : 'moderate',
  });

  const quantumAnimation = useCosmicAnimation('nebula-swirl', {
    enabled: variant === 'quantum' && isAnimationEnabled,
    trigger: trigger as unknown,
    duration: 4000,
    iterations: loop ? 'infinite' : 1,
    cosmicEffect: 'quantum',
    intensity: cosmicEffectsLevel === 'minimal' ? 'subtle' : 'intense',
  });

  const stellarAnimation = useCosmicAnimation('aurora-dance', {
    enabled: variant === 'stellar' && isAnimationEnabled,
    trigger: trigger as unknown,
    duration: 5000,
    iterations: loop ? 'infinite' : 1,
    cosmicEffect: 'dimensional',
    intensity: cosmicEffectsLevel === 'minimal' ? 'subtle' : 'moderate',
  });

  // Get the appropriate ref based on variant
  const getAnimationRef = () => {
    switch (variant) {
      case 'wave': return waveAnimation.ref;
      case 'glitch': return glitchAnimation.ref;
      case 'hologram': return hologramAnimation.ref;
      case 'quantum': return quantumAnimation.ref;
      case 'stellar': return stellarAnimation.ref;
      default: return containerRef;
    }
  };

  // Get event handlers for hover trigger
  const getEventHandlers = () => {
    if (trigger !== 'hover') {
    return {};
  }

    switch (variant) {
      case 'wave': return { onMouseEnter: waveAnimation.onMouseEnter, onMouseLeave: waveAnimation.onMouseLeave };
      case 'glitch': return { onMouseEnter: glitchAnimation.onMouseEnter, onMouseLeave: glitchAnimation.onMouseLeave };
      case 'hologram': return { onMouseEnter: hologramAnimation.onMouseEnter, onMouseLeave: hologramAnimation.onMouseLeave };
      case 'quantum': return { onMouseEnter: quantumAnimation.onMouseEnter, onMouseLeave: quantumAnimation.onMouseLeave };
      case 'stellar': return { onMouseEnter: stellarAnimation.onMouseEnter, onMouseLeave: stellarAnimation.onMouseLeave };
      default: return {};
    }
  };

  // Character-level animations for wave effect
  const renderWaveText = () => {
    if (variant !== 'wave') {
    return children;
  }

    return children.split('').map((char, index) => (
      <span
        key={index}
        className={cn(
          'inline-block',
          isAnimationEnabled && 'animate-float'
        )}
        style={{
          animationDelay: `${index * 0.1}s`,
          animationDuration: '2s',
        }}
      >
        {char === ' ' ? 'u00A0' : char}
      </span>
    ));
  };

  // Glitch text effect
  const renderGlitchText = () => {
    if (variant !== 'glitch') {
    return children;
  }

    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const [glitchedText, setGlitchedText] = useState(children);

    useEffect_(() => {
      if (!isAnimationEnabled) {return;}

      const glitchInterval = setInterval_(() => {
        const shouldGlitch = Math.random() < 0.1;
        if (shouldGlitch) {
          const glitched = children
            .split('')
            .map((char, index) => {
              if (Math.random() < 0.1) {
                return glitchChars[Math.floor(Math.random() * glitchChars.length)];
              }
              return char;
            })
            .join('');
          setGlitchedText(glitched);

          setTimeout(() => setGlitchedText(children), 50);
        }
      }, 100);

      return () => clearInterval(glitchInterval);
    }, [children, isAnimationEnabled]);

    return glitchedText;
  };

  // Hologram text effect with scan lines
  const renderHologramText = () => {
    if (variant !== 'hologram') {
    return children;
  }

    return (
      <div className="relative">
        <div className={cn(
          'relative z-10',
          cosmicEffectsLevel !== 'minimal' && 'text-glow-quantum'
        )}>
          {children}
        </div>
        {cosmicEffectsLevel !== 'minimal' && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-pulse opacity-30" />
        )}
        {cosmicEffectsLevel === 'maximum' && (
          <div className="absolute inset-0 bg-repeat-y opacity-10"
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px)',
                 animation: 'shimmer 2s linear infinite',
               }} />
        )}
      </div>
    );
  };

  const renderText = () => {
    switch (variant) {
      case 'typewriter':
        return displayText;
      case 'wave':
        return renderWaveText();
      case 'glitch':
        return renderGlitchText();
      case 'hologram':
        return renderHologramText();
      default:
        return children;
    }
  };

  const getVariantClasses = () => {
    const classes: Record<string, string> = {
      typewriter: 'font-mono',
      wave: '',
      glitch: 'font-bold text-gradient-plasma',
      hologram: 'text-cyan-400 font-mono tracking-wider',
      quantum: 'text-gradient-cosmic font-bold',
      stellar: 'text-gradient-aurora font-bold',
    };

    return classes[variant]  ?? '';
  };

  return (
    <div
      ref={getAnimationRef()}
      className={cn(
        'inline-block',
        getVariantClasses(),
        glowEffect && cosmicEffectsLevel !== 'minimal' && variant !== 'hologram' && 'text-glow-cosmic',
        variant === 'typewriter' && 'relative',
        className
      )}
      {...getEventHandlers()}
    >
      {renderText()}

      {/* Typewriter cursor */}
      {variant === 'typewriter' && currentIndex < children.length && isAnimationEnabled && (
        <span className="animate-pulse ml-1 text-primary-500">|</span>
      )}
    </div>
  );
}

// Word-by-word reveal animation
export function CosmicWordReveal({ children, className, delay = 100, trigger = 'intersect', stagger = true }: {
  children: string;
  className?: string;
  delay?: number;
  trigger?: 'mount' | 'intersect' | 'hover';
  stagger?: boolean;
}) {
  const words = children.split(' ');
  const { isAnimationEnabled } = useTheme();

  const { getRef, play, currentIndex} = useCosmicSequence(
    words.map((_, index) => ({
      preset: 'quantum-leap' as const,
      delay: stagger ? index * delay : 0,
      options: {
        duration: 600,
        intensity: 'moderate' as const,
      },
    })),
    { enabled: isAnimationEnabled }
  );

  useEffect_(() => {
    if (trigger === 'mount') {
      play();
    }
  }, [play, trigger]);

  return (
    <div className={cn('inline', className)}>
      {words.map((word, index) => (
        <span
          key={index}
          ref={getRef(index)}
          className={cn(
            'inline-block mr-2',
            !isAnimationEnabled ?? currentIndex >= index ? 'opacity-100' : 'opacity-0'
          )}
        >
          {word}
        </span>
      ))}
    </div>
  );
}