import { useEffect, useRef, useState } from 'react';

const TRIGGER = 70;
const MAX_PULL = 140;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleStart = (event: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startY.current = event.touches[0].clientY;
      pulling.current = true;
    };

    const handleMove = (event: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        if (distanceRef.current !== 0) setDistance(0);
        return;
      }
      const next = Math.min(delta * 0.5, MAX_PULL);
      setDistance(next);
    };

    const handleEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (distanceRef.current >= TRIGGER) {
        setRefreshing(true);
        setDistance(50);
        try {
          await onRefreshRef.current();
        } catch {
          // surface elsewhere via toast/store
        } finally {
          setRefreshing(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
      el.removeEventListener('touchcancel', handleEnd);
    };
  }, []);

  return { containerRef, distance, refreshing, threshold: TRIGGER };
}
