import { useEffect, useState } from 'react';

/**
 * Track mouse position and expose CSS variables for use in styles.
 *
 * Adapted from the ComfyUI-Copilot project under MIT license.
 */
export function useMousePosition(enabled: boolean = true) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    let rafId: number | null = null;
    const handle = (e: MouseEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        setPos({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handle);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handle);
    };
  }, [enabled]);

  return pos;
}
