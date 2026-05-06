import type { ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<void> }) {
  const { containerRef, distance, refreshing, threshold } = usePullToRefresh(onRefresh);
  const visibleHeight = refreshing ? 48 : distance;
  const past = distance >= threshold;

  return (
    <div ref={containerRef}>
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden text-slate-500"
        style={{
          height: visibleHeight,
          transition: distance === 0 || refreshing ? 'height 200ms' : 'none',
        }}
      >
        {refreshing ? (
          <Loader2 size={20} className="animate-spin" />
        ) : distance > 0 ? (
          <ArrowDown
            size={20}
            style={{
              transform: `rotate(${past ? 180 : 0}deg)`,
              transition: 'transform 180ms',
            }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
