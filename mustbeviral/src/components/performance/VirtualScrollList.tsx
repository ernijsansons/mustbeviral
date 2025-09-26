import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
  estimatedItemSize?: number;
  threshold?: number;
  scrollBehavior?: 'auto' | 'smooth';
  loadMoreItems?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
}

interface ItemBounds {
  top: number;
  height: number;
}

/**
 * High-performance virtual scrolling component for large lists
 * Optimized for 60fps scrolling with thousands of items
 */
function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey,
  estimatedItemSize = 50,
  threshold = 0.8,
  scrollBehavior = 'auto',
  loadMoreItems,
  hasNextPage = false,
  isLoading = false,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const itemBoundsCache = useRef<Map<number, ItemBounds>>(new Map());
  const intersectionObserverRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Memoized item bounds calculation
  const itemBounds = useMemo(() => {
    const bounds: ItemBounds[] = [];
    let currentTop = 0;

    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'function' 
        ? itemHeight(i, items[i]) 
        : itemHeight;
      
      bounds.push({ top: currentTop, height });
      currentTop += height;
    }

    return bounds;
  }, [items, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, 
      itemBounds.findIndex(bound => bound.top + bound.height >= scrollTop) - overscan
    );
    
    const end = Math.min(items.length - 1,
      itemBounds.findIndex(bound => bound.top > scrollTop + containerHeight) + overscan
    );

    return {
      start: start >= 0 ? start : 0,
      end: end >= 0 ? end : items.length - 1,
    };
  }, [scrollTop, containerHeight, itemBounds, overscan, items.length]);

  // Total height calculation
  const totalHeight = useMemo(() => {
    return itemBounds.length > 0 
      ? itemBounds[itemBounds.length - 1].top + itemBounds[itemBounds.length - 1].height
      : 0;
  }, [itemBounds]);

  // Scroll handler with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    setIsScrolling(true);

    onScroll?.(scrollTop);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set isScrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [onScroll]);

  // Scroll to item
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = scrollBehavior) => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) return;

    const targetBound = itemBounds[index];
    if (targetBound) {
      scrollElementRef.current.scrollTo({
        top: targetBound.top,
        behavior,
      });
    }
  }, [itemBounds, items.length, scrollBehavior]);

  // Scroll to top
  const scrollToTop = useCallback((behavior: ScrollBehavior = scrollBehavior) => {
    if (!scrollElementRef.current) return;
    scrollElementRef.current.scrollTo({ top: 0, behavior });
  }, [scrollBehavior]);

  // Setup intersection observer for infinite loading
  useEffect(() => {
    if (!loadMoreItems || !hasNextPage || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading) {
          loadMoreItems();
        }
      },
      { threshold }
    );

    intersectionObserverRef.current = observer;
    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadMoreItems, hasNextPage, isLoading, threshold]);

  // Visible items with memoization
  const visibleItems = useMemo(() => {
    const items_: Array<{
      item: T;
      index: number;
      top: number;
      height: number;
      key: string | number;
    }> = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i] && itemBounds[i]) {
        items_.push({
          item: items[i],
          index: i,
          top: itemBounds[i].top,
          height: itemBounds[i].height,
          key: getItemKey ? getItemKey(items[i], i) : i,
        });
      }
    }

    return items_;
  }, [visibleRange, items, itemBounds, getItemKey]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-scroll-container overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-scroll-content relative"
        style={{ height: totalHeight }}
      >
        {visibleItems.map(({ item, index, top, height, key }) => (
          <VirtualItem
            key={key}
            item={item}
            index={index}
            top={top}
            height={height}
            isScrolling={isScrolling}
            renderItem={renderItem}
          />
        ))}
        
        {/* Infinite loading trigger */}
        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="load-more-trigger h-4 w-full"
            style={{ top: totalHeight - 100 }}
          />
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div
            className="loading-indicator flex items-center justify-center p-4"
            style={{ top: totalHeight }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized item component for performance
interface VirtualItemProps<T> {
  item: T;
  index: number;
  top: number;
  height: number;
  isScrolling: boolean;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
}

const VirtualItem = memo(<T,>({
  item,
  index,
  top,
  height,
  isScrolling,
  renderItem,
}: VirtualItemProps<T>) => {
  return (
    <div
      className="virtual-item absolute w-full"
      style={{
        top,
        height,
        transform: `translateY(0px)`, // Force GPU acceleration
      }}
    >
      {renderItem(item, index, !isScrolling)}
    </div>
  );
});

VirtualItem.displayName = 'VirtualItem';

/**
 * Hook for virtual scroll management
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number | ((index: number, item: T) => number),
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const scrollToItem = useCallback((index: number) => {
    if (typeof itemHeight === 'number') {
      setScrollTop(index * itemHeight);
    }
  }, [itemHeight]);

  return {
    scrollTop,
    visibleRange,
    scrollToItem,
    setScrollTop,
  };
}

/**
 * Grid virtual scrolling component for 2D layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  renderItem,
  getItemKey,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const columnsPerRow = Math.floor(containerWidth / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const totalHeight = totalRows * (itemHeight + gap);

  const startRow = Math.floor(scrollTop / (itemHeight + gap));
  const endRow = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap))
  );

  const visibleItems = useMemo(() => {
    const visible: Array<{ item: T; index: number; x: number; y: number }> = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < items.length) {
          visible.push({
            item: items[index],
            index,
            x: col * (itemWidth + gap),
            y: row * (itemHeight + gap),
          });
        }
      }
    }

    return visible;
  }, [items, startRow, endRow, columnsPerRow, itemWidth, itemHeight, gap]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  return (
    <div
      className="virtual-grid-container overflow-auto"
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-grid-content relative"
        style={{ height: totalHeight, width: '100%' }}
      >
        {visibleItems.map(({ item, index, x, y }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            className="virtual-grid-item absolute"
            style={{
              left: x,
              top: y,
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Performance monitoring for virtual scroll
 */
export function useVirtualScrollPerformance() {
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const measurePerformance = () => {
      const now = performance.now();
      frameCount.current++;

      if (now - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const measureRenderTime = useCallback((callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    setRenderTime(end - start);
  }, []);

  return { fps, renderTime, measureRenderTime };
}

export default VirtualScrollList;