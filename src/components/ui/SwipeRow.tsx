import type { ReactNode, TouchEvent } from 'react';
import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

const TRIGGER = 140;
const MAX_DRAG = 220;

export function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const lockedAxis = useRef<'x' | 'y' | null>(null);
  const [translate, setTranslate] = useState(0);
  const [exiting, setExiting] = useState(false);

  function handleStart(event: TouchEvent) {
    if (exiting) return;
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    lockedAxis.current = null;
  }

  function handleMove(event: TouchEvent) {
    if (startX.current === null || exiting) return;
    const dx = event.touches[0].clientX - startX.current;
    const dy = event.touches[0].clientY - startY.current;

    if (lockedAxis.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (lockedAxis.current !== 'x') return;
    if (dx >= 0) {
      setTranslate(0);
      return;
    }
    setTranslate(Math.max(dx, -MAX_DRAG));
  }

  function handleEnd() {
    startX.current = null;
    if (translate <= -TRIGGER) {
      setExiting(true);
      setTranslate(-window.innerWidth);
      window.setTimeout(() => onDelete(), 220);
    } else {
      setTranslate(0);
    }
    lockedAxis.current = null;
  }

  const progress = Math.min(1, Math.abs(translate) / TRIGGER);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0 flex items-center justify-end gap-2 pr-5 text-white"
        style={{
          backgroundColor: progress >= 1 ? '#e11d48' : 'rgba(225,29,72,0.65)',
          transition: 'background-color 150ms',
        }}
      >
        <Trash2 size={18} />
        <span className="text-sm font-bold">{progress >= 1 ? 'Release' : 'Delete'}</span>
      </div>
      <div
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        style={{
          transform: `translateX(${translate}px)`,
          transition: startX.current !== null && !exiting ? 'none' : 'transform 220ms ease-out',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
