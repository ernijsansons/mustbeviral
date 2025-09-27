import { useState, useEffect, useRef, ImgHTMLAttributes} from 'react';
import { cn} from '../../lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  blurDataURL?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoadComplete?: () => void;
}

/**
 * Optimized Image Component with:
 * - Lazy loading with Intersection Observer
 * - WebP format detection and fallback
 * - Blur placeholder support
 * - Error handling with fallback image
 * - Responsive image loading
 * - WCAG 2.1 AA compliant alt text handling
 */
export function OptimizedImage({
  src, alt, fallbackSrc = '/images/placeholder.svg', blurDataURL, priority = false, quality = 85, sizes, aspectRatio = '16/9', objectFit = 'cover', className, onLoadComplete, ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(blurDataURL ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate srcSet for responsive images
  const generateSrcSet = (baseUrl: string) => {
    const widths = [640, 768, 1024, 1280, 1536, 1920];
    return widths
      .map(width => {
        const url = baseUrl.includes('?') 
          ? `${baseUrl}&w=${width}&q=${quality}`
          : `${baseUrl}?w=${width}&q=${quality}`;
        return `${url} ${width}w`;
      })
      .join(', ');
  };

  // Check WebP support
  const supportsWebP = useRef<boolean | null>(null);
  useEffect(() => {
    if (supportsWebP.current === null) {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        supportsWebP.current = webP.height === 2;
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    }
  }, []);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Load image when in view
  useEffect(() => {
    if (!isInView) {return;}

    const img = new Image();
    
    // Try WebP format first if supported
    const imageUrl = supportsWebP.current && src.match(/\.(jpg|jpeg|png)$/i)
      ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
      : src;

    img.src = imageUrl;
    img.srcset = generateSrcSet(imageUrl);
    if (sizes) {img.sizes = sizes;}

    img.onload = () => {
      setImageSrc(imageUrl);
      setIsLoading(false);
      setHasError(false);
      onLoadComplete?.();
    };

    img.onerror = () => {
      // Try original format if WebP fails
      if (imageUrl !== src) {
        img.src = src;
        img.srcset = generateSrcSet(src);
      } else {
        setImageSrc(fallbackSrc);
        setIsLoading(false);
        setHasError(true);
      }
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, fallbackSrc, sizes, onLoadComplete]);

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={{ aspectRatio }}
      role="img"
      aria-label={alt}
    >
      {/* Blur placeholder or skeleton loader */}
      {isLoading && (
        <div 
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
          aria-hidden="true"
        >
          {blurDataURL && (
            <img 
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover filter blur-xl scale-110"
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc || fallbackSrc}
        alt={alt}
        srcSet={!hasError && isInView ? generateSrcSet(imageSrc || src) : undefined}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          `object-${objectFit}`
        )}
        style={{
          objectFit,
          imageRendering: hasError ? 'auto' : 'crisp-edges'
        }}
        {...props}
      />

      {/* Error state overlay */}
      {hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          role="alert"
          aria-live="polite"
        >
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Loading shimmer effect */}
      {isLoading && !blurDataURL && (
        <div 
          className="absolute inset-0 -translate-x-full animate-[shimmer2sinfinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Preload critical images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Generate blur data URL from dominant color
export function generateBlurDataURL(dominantColor: string): string {
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${dominantColor}"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default OptimizedImage;