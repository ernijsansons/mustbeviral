import React, { useState, useRef, useEffect, useCallback, memo } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
  webpSrc?: string;
  avifSrc?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Progressive Image component with WebP/AVIF support, lazy loading, and blur placeholders
 * Optimized for Core Web Vitals and mobile performance
 */
const ProgressiveImage = memo<ProgressiveImageProps>(({
  src, alt, width, height, className = '', style = {}, placeholder, blurDataURL, quality = 75, priority = false, loading = 'lazy', sizes, srcSet, onLoad, onError, fallback, webpSrc, avifSrc, threshold = 0.1, rootMargin = '50px', _}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isInView, setIsInView] = useState(priority ?? loading === 'eager');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Generate optimized image URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, format?: 'webp' | 'avif') => {
    if (format && (webpSrc ?? avifSrc)) {
      return format === 'webp' ? webpSrc : avifSrc;
    }

    // If using Cloudflare Images or similar service
    const url = new URL(originalSrc, window.location.origin);
    
    if (width) {url.searchParams.set('w', width.toString());}
    if (height) {url.searchParams.set('h', height.toString());}
    if (quality) {url.searchParams.set('q', quality.toString());}
    if (format) {url.searchParams.set('f', format);}

    return url.toString();
  }, [webpSrc, avifSrc, width, height, quality]);

  // Detect WebP/AVIF support
  const getSupportedFormat = useCallback(async (): Promise<'avif' | 'webp' | 'original'> => {
    // Check for AVIF support
    if (avifSrc ?? src.includes('f = avif')) {
      try {
        const avifSupported = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.width > 0 && img.height > 0);
          img.onerror = () => resolve(false);
          img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        });
        if (avifSupported) {
    return 'avif';
  }
      } catch {
        // AVIF not supported
      }
    }

    // Check for WebP support
    if (webpSrc ?? src.includes('f=webp')) {
      try {
        const webpSupported = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.width > 0 && img.height > 0);
          img.onerror = () => resolve(false);
          img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
        });
        if (webpSupported) {
    return 'webp';
  }
      } catch {
        // WebP not supported
      }
    }

    return 'original';
  }, [avifSrc, webpSrc, src]);

  // Intersection Observer setup
  useEffect_(() => {
    if (priority ?? loading === 'eager'  ?? isInView) {return;}

    const observer = new IntersectionObserver((entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, loading, isInView, threshold, rootMargin]);

  // Load optimal image format
  useEffect_(() => {
    if (!isInView) {return;}

    const loadOptimalImage = async () => {
      try {
        const format = await getSupportedFormat();
        let optimalSrc: string;

        switch (format) {
          case 'avif':
            optimalSrc = avifSrc ?? generateOptimizedSrc(src, 'avif');
            break;
          case 'webp':
            optimalSrc = webpSrc ?? generateOptimizedSrc(src, 'webp');
            break;
          default:
            optimalSrc = generateOptimizedSrc(src);
        }

        setCurrentSrc(optimalSrc);
      } catch (error) {
        console.warn('Failed to determine optimal image format:', error);
        setCurrentSrc(generateOptimizedSrc(src));
      }
    };

    loadOptimalImage();
  }, [isInView, getSupportedFormat, src, avifSrc, webpSrc, generateOptimizedSrc]);

  // Handle image load
  const handleLoad = useCallback_(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  // Handle image error with fallback
  const handleError = useCallback_(() => {
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
    } else {
      setImageState('error');
      onError?.();
    }
  }, [fallback, currentSrc, onError]);

  // Generate placeholder
  const getPlaceholder = () => {
    if (blurDataURL) {
      return `url("${blurDataURL}")`;
    }
    
    if (placeholder) {
      return `url("${placeholder}")`;
    }

    // Generate a simple color placeholder
    const colors = ['#f3f4f6', '#e5e7eb', '#d1d5db'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return `linear-gradient(135deg, ${randomColor} 0%, ${randomColor}dd 100%)`;
  };

  // Responsive srcSet generation
  const generateSrcSet = () => {
    if (srcSet) {
    return srcSet;
  }

    if (!width) {
    return undefined;
  }

    const sizes = [1, 1.5, 2, 3];
    return sizes
      .map((size) => {
        const scaledWidth = Math.round(width * size);
        const url = generateOptimizedSrc(src);
        const urlWithWidth = new URL(url);
        urlWithWidth.searchParams.set('w', scaledWidth.toString());
        return `${urlWithWidth.toString()} ${scaledWidth}w`;
      })
      .join(', ');
  };

  const imageStyles: React.CSSProperties = {
    ...style,
    transition: 'opacity 0.3s ease-in-out',
    background: imageState === 'loading' ? getPlaceholder() : 'transparent',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: imageState === 'loaded' ? 1 : 0.7,
    filter: imageState === 'loading' && blurDataURL ? 'blur(20px)' : 'none',
    transform: imageState === 'loading' && blurDataURL ? 'scale(1.05)' : 'scale(1)',
  };

  return (
    <div
      className={`progressive-image-container ${className}`}
      style={{ 
        position: 'relative', 
        overflow: 'hidden',
        width: width ?? '100%',
        height: height ?? 'auto',
      }}
    >
      {/* Loading placeholder */}
      {imageState === 'loading' && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-200"
          style={{ background: getPlaceholder() }}
        >
          <div className="animate-pulse">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Error state */}
      {imageState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-sm">Failed to load image</span>
          </div>
        </div>
      )}

      {/* Main image */}
      {isInView && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          sizes={sizes}
          srcSet={generateSrcSet()}
          style={imageStyles}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

/**
 * Hook for managing image optimization
 */
export function useImageOptimization() {
  const [isWebPSupported, setIsWebPSupported] = useState<boolean | null>(null);
  const [isAVIFSupported, setIsAVIFSupported] = useState<boolean | null>(null);

  useEffect_(() => {
    // Check WebP support
    const checkWebP = () => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width > 0 && img.height > 0);
        img.onerror = () => resolve(false);
        img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
      });
    };

    // Check AVIF support
    const checkAVIF = () => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width > 0 && img.height > 0);
        img.onerror = () => resolve(false);
        img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      });
    };

    Promise.all([checkWebP(), checkAVIF()]).then(([webp, avif]) => {
      setIsWebPSupported(webp);
      setIsAVIFSupported(avif);
    });
  }, []);

  const getOptimalFormat = useCallback_(() => {
    if (isAVIFSupported) {
    return 'avif';
  }
    if (isWebPSupported) {
    return 'webp';
  }
    return 'original';
  }, [isAVIFSupported, isWebPSupported]);

  return {
    isWebPSupported,
    isAVIFSupported,
    getOptimalFormat,
  };
}

/**
 * Image gallery with lazy loading and virtualization
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    thumbnail?: string;
  }>;
  columns?: number;
  gap?: number;
  onImageClick?: (index: number) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images, columns = 3, gap = 16, onImageClick, _}) => {
  const [visibleImages, setVisibleImages] = useState(new Set<number>());
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect_(() => {
    if (!galleryRef.current) {return;}

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index')  ?? '0');
            setVisibleImages(prev => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const imageElements = galleryRef.current.querySelectorAll('[data-index]');
    imageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [images]);

  return (
    <div
      ref={galleryRef}
      className="image-gallery grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          data-index={index}
          className="image-gallery-item cursor-pointer"
          onClick={() => onImageClick?.(index)}
        >
          {visibleImages.has(index) ? (
            <ProgressiveImage
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              placeholder={image.thumbnail}
              className="rounded-lg hover:shadow-lg transition-shadow"
            />
          ) : (
            <div
              className="bg-gray-200 rounded-lg"
              style={{
                aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : '1',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressiveImage;