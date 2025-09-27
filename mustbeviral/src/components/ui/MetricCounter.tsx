import { useEffect, useState, useRef} from 'react';
import { cn} from '../../lib/utils';

interface MetricCounterProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
  showPlus?: boolean;
}

export function MetricCounter({
  value, label, suffix = '', prefix = '', duration = 2000, className, decimals = 0, showPlus = false }: MetricCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {return;}

    const startTime = Date.now();
    const endValue = value;

    const updateCounter = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = endValue * easeOutQuart;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value, duration, isVisible]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(decimals);
  };

  return (
    <div
      ref={elementRef}
      className={cn('text-center animate-in', className)}
    >
      <div className="flex items-center justify-center mb-2">
        <span className="text-4xl md:text-5xl font-heading font-bold bg-gradient-to-r from-primary-500 to-viral-500 bg-clip-text text-transparent">
          {prefix}
          {formatNumber(count)}
          {showPlus && '+'}
          {suffix}
        </span>
      </div>
      <p className="text-gray-600 text-sm md:text-base font-medium">
        {label}
      </p>
    </div>
  );
}