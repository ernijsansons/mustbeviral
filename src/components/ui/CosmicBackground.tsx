// Universe-Bending Cosmic Background Component
import React, { _useEffect, useRef, useState } from 'react';
import { _cn, generateParticlePositions } from '../../lib/utils';
import { useTheme } from '../../providers/ThemeProvider';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDelay: number;
  color?: string;
}

interface CosmicBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'stars' | 'nebula' | 'galaxy' | 'quantum' | 'minimal';
  density?: 'low' | 'medium' | 'high' | 'ultra';
  animated?: boolean;
  interactive?: boolean;
}

export function CosmicBackground({ _children,
  className,
  variant = 'stars',
  density = 'medium',
  animated = true,
  interactive = false,
}: CosmicBackgroundProps) {
  const { _cosmicEffectsLevel, isAnimationEnabled } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Determine particle count based on density and cosmic effects level
  const getParticleCount = () => {
    const densityMap = { low: 30, medium: 60, high: 120, ultra: 200 };
    const effectsMultiplier = { minimal: 0.5, moderate: 1, maximum: 1.5 };

    return Math.floor(densityMap[density] * effectsMultiplier[cosmicEffectsLevel]);
  };

  // Generate particles based on variant
  const generateVariantParticles = (count: number): Particle[] => {
    const baseParticles = generateParticlePositions(count);

    return baseParticles.map(particle => {
      let color = '#ffffff';
      let size = particle.size;

      switch (variant) {
        case 'nebula':
          color = ['#ff6b9d', '#c44569', '#f8b500', '#feca57'][Math.floor(Math.random() * 4)];
          size = particle.size * 1.5;
          break;
        case 'galaxy':
          color = ['#667eea', '#764ba2', '#f093fb', '#f5576c'][Math.floor(Math.random() * 4)];
          size = particle.size * 1.2;
          break;
        case 'quantum':
          color = ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7'][Math.floor(Math.random() * 4)];
          size = particle.size * 0.8;
          break;
        case 'minimal':
          color = '#9ca3af';
          size = particle.size * 0.6;
          break;
        default: // stars
          color = '#ffffff';
          break;
      }

      return {
        ...particle,
        size,
        color,
      };
    });
  };

  // Initialize particles
  useEffect(() => {
    const count = getParticleCount();
    setParticles(generateVariantParticles(count));
  }, [variant, density, cosmicEffectsLevel]);

  // Mouse interaction
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  // Canvas animation
  useEffect(() => {
    if (!animated || !isAnimationEnabled || cosmicEffectsLevel === 'minimal') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, _index) => {
        // Calculate position with floating animation
        const baseX = (particle.x / 100) * canvas.width;
        const baseY = (particle.y / 100) * canvas.height;

        let x = baseX + Math.sin(time * 0.001 + index) * 2;
        let y = baseY + Math.cos(time * 0.0015 + index) * 1.5;

        // Interactive effect - particles are attracted to mouse
        if (interactive) {
          const dx = mousePosition.x - x;
          const dy = mousePosition.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const force = (100 - distance) / 100;
            x += dx * force * 0.1;
            y += dy * force * 0.1;
          }
        }

        // Draw particle with glow effect
        const opacity = particle.opacity + Math.sin(time * 0.002 + index) * 0.2;

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, opacity);

        // Main particle
        ctx.fillStyle = particle.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect for non-minimal variants
        if (variant !== 'minimal' && cosmicEffectsLevel !== 'minimal') {
          ctx.globalAlpha = Math.max(0.05, opacity * 0.3);
          ctx.fillStyle = particle.color || '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, particle.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      time += 16; // ~60fps
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles, animated, interactive, mousePosition, variant, cosmicEffectsLevel, isAnimationEnabled]);

  // CSS-only fallback for minimal effects or disabled animations
  const CSSParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.slice(0, Math.min(20, particles.length)).map((particle, _index) => (
        <div
          key={index}
          className={cn(
            'absolute rounded-full',
            animated && isAnimationEnabled && cosmicEffectsLevel !== 'minimal' && 'animate-twinkle',
          )}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color || '#ffffff',
            opacity: particle.opacity,
            animationDelay: `${particle.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Canvas for advanced effects */}
      {cosmicEffectsLevel !== 'minimal' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      {/* CSS fallback for minimal effects */}
      {cosmicEffectsLevel === 'minimal' && <CSSParticles />}

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}