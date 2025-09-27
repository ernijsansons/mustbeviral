/**
 * 🎭 AuthLayout - Where Viral Dreams Begin
 *
 * This is the authentication experience that users will screenshot and share.
 * Floating emojis, neon gradients, and cinematic polish create an addictive
 * first impression that sets the tone for the entire platform.
 */

import { ReactNode, useEffect, useState, useMemo} from 'react';
import { Link} from 'wouter';
import { ArrowLeft, Sparkles, Heart, Zap, Star, Rocket} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backgroundVariant?: 'cosmic' | 'neon' | 'gradient' | 'minimal';
  className?: string;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  direction: 'up' | 'down' | 'diagonal';
}

/**
 * Floating Emoji Animation Component
 * Creates those viral-worthy floating emojis that make users smile
 */
function FloatingEmojis({ variant = 'cosmic', density = 'medium' }: {
  variant: 'cosmic' | 'neon' | 'gradient' | 'minimal';
  density: 'low' | 'medium' | 'high';
}) {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const emojiSets = {
    cosmic: ['✨', '🌟', '⭐', '🔥', '💫', '🌙', '🚀', '💎'],
    neon: ['💖', '💜', '💙', '💚', '🧡', '💛', '❤️', '🔮'],
    gradient: ['🎨', '🌈', '✨', '🎭', '🎪', '🎊', '🎉', '💫'],
    minimal: ['✨', '⭐', '🌟', '💫']
  };

  const densityMap = {
    low: 8,
    medium: 15,
    high: 25
  };

  // Generate floating emojis
  useEffect_(() => {
    const emojiPool = emojiSets[variant];
    const count = densityMap[density];

    const newEmojis: FloatingEmoji[] = Array.from({ length: count }, (_, i) => ({
      id: `emoji-${i}`,
      emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 20, // 20-40px
      duration: 15 + Math.random() * 10, // 15-25s
      delay: Math.random() * 10, // 0-10s delay
      direction: ['up', 'down', 'diagonal'][Math.floor(Math.random() * 3)] as any
    }));

    setEmojis(newEmojis);
  }, [variant, density]);

  if (variant === 'minimal') {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className={cn(
            'absolute opacity-20 animate-float-emoji',
            'hover:opacity-40 transition-opacity duration-300'
          )}
          style={{
            left: `${emoji.x}%`,
            top: `${emoji.y}%`,
            fontSize: `${emoji.size}px`,
            animationDuration: `${emoji.duration}s`,
            animationDelay: `${emoji.delay}s`,
            animationDirection: emoji.direction === 'up' ? 'normal' : 'reverse'
          }}
          role="presentation"
          aria-hidden="true"
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Auth Sidebar - Branding and Social Proof
 */
function AuthSidebar({ variant }: { variant: string }) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      quote: "This login experience is so beautiful, I actually screenshot it!",
      author: "Sarah K.",
      role: "Content Creator"
    },
    {
      quote: "Finally, an app that understands viral aesthetics from day one.",
      author: "Marcus R.",
      role: "Brand Manager"
    },
    {
      quote: "The UI is so addictive, I keep coming back just to see the animations.",
      author: "Emily W.",
      role: "Marketing Director"
    }
  ];

  useEffect_(() => {
    const timer = setInterval_(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const backgroundClasses = {
    cosmic: 'bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-900',
    neon: 'bg-gradient-to-br from-pink-900 via-purple-900 to-cyan-900',
    gradient: 'bg-gradient-to-br from-primary-900 via-viral-900 to-gold-900',
    minimal: 'bg-slate-900'
  };

  return (
    <div className={cn(
      'hidden lg:flex lg:w-1/2 relative overflow-hidden',
      backgroundClasses[variant as keyof typeof backgroundClasses]  ?? backgroundClasses.cosmic
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between p-12 text-white">
        {/* Logo and Tagline */}
        <div>
          <Link href="/">
            <div className="flex items-center gap-3 mb-2 group">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-400 to-viral-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <GradientText variant="neural" size="2xl" className="font-bold">
                MustBeViral
              </GradientText>
            </div>
          </Link>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Join 50,000+ creators who've transformed their content strategy with AI-powered viral intelligence.
          </p>
        </div>

        {/* Animated Stats */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
              <div className="text-2xl font-bold text-viral-400">50K+</div>
              <div className="text-sm text-white/70">Active Creators</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
              <div className="text-2xl font-bold text-primary-400">10M+</div>
              <div className="text-sm text-white/70">Viral Posts</div>
            </div>
          </div>

          {/* Rotating Testimonials */}
          <div className="relative h-24 overflow-hidden">
            <div
              className="absolute inset-0 flex flex-col transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${currentTestimonial * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="h-24 flex-shrink-0 flex flex-col justify-center">
                  <blockquote className="text-white/90 text-sm italic mb-2">
                    "{testimonial.quote}"
                  </blockquote>
                  <cite className="text-white/70 text-xs">
                    {testimonial.author}, {testimonial.role}
                  </cite>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/80">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="text-sm">Rated 4.9/5 by creators</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm">87% viral prediction accuracy</span>
          </div>
        </div>
      </div>

      {/* Floating Emojis on Sidebar */}
      <FloatingEmojis variant={variant as any} density="low" />
    </div>
  );
}

/**
 * Main Auth Layout Component
 */
export function AuthLayout(_{
  children, title, subtitle, showBackButton = false, backgroundVariant = 'cosmic', className
}: AuthLayoutProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect_(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const containerClasses = {
    cosmic: 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900',
    neon: 'bg-gradient-to-br from-pink-900/20 via-slate-900 to-cyan-900/20',
    gradient: 'bg-gradient-to-br from-primary-900/20 via-slate-900 to-viral-900/20',
    minimal: 'bg-slate-50'
  };

  return (
    <div className={cn(
      'min-h-screen flex relative overflow-hidden',
      containerClasses[backgroundVariant],
      className
    )}>
      {/* Main Floating Emojis */}
      <FloatingEmojis variant={backgroundVariant} density="medium" />

      {/* Auth Sidebar */}
      <AuthSidebar variant={backgroundVariant} />

      {/* Main Auth Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        {(title ?? showBackButton) && (
          <header className="p-6 lg:p-8">
            <div className="flex items-center justify-between">
              {showBackButton && (
                <Link href="/">
                  <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back to Home
                  </Button>
                </Link>
              )}

              {/* Mobile Logo */}
              <Link href="/" className="lg:hidden">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-viral-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg">MustBeViral</span>
                </div>
              </Link>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className={cn(
            'w-full max-w-md transition-all duration-700 ease-out',
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          )}>
            {/* Content Header */}
            {(title ?? subtitle) && (
              <div className="text-center mb-8">
                {title && (
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-slate-600 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Auth Form Container */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl p-8">
              {children}
            </div>

            {/* Trust Badge */}
            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full border border-white/20 dark:border-slate-700/50">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Trusted by 50,000+ creators
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 lg:p-8">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}