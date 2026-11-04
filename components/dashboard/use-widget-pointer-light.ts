import { useEffect, useRef, type PointerEvent } from 'react';

import { useAnimationPreferences } from '../ui/animation-preferences';

export function useWidgetPointerLight(disabled: boolean) {
  const { reduced } = useAnimationPreferences();
  const surfaceRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointRef = useRef({ x: 0, y: 0 });

  const clear = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    surfaceRef.current?.removeAttribute('data-pointer-light');
    surfaceRef.current = null;
  };

  useEffect(() => {
    if (disabled || reduced) clear();
    return clear;
  }, [disabled, reduced]);

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (disabled || reduced || event.pointerType !== 'mouse') return;
    const host = event.currentTarget;
    if (
      host.dataset.widgetGlass !== 'true' ||
      host.dataset.widgetPointerLight !== 'true'
    )
      return;
    const surface = host.matches('.liquid-glass-surface')
      ? host
      : host.querySelector<HTMLElement>('.widget-search-surface');
    if (!surface || surface.querySelector('.weather-visual')) return;

    surfaceRef.current = surface;
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const target = surfaceRef.current;
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      target.style.setProperty(
        '--pointer-light-x',
        `${pointRef.current.x - bounds.left}px`,
      );
      target.style.setProperty(
        '--pointer-light-y',
        `${pointRef.current.y - bounds.top}px`,
      );
      target.setAttribute('data-pointer-light', 'true');
    });
  };

  return { onPointerMove, onPointerLeave: clear, onPointerCancel: clear };
}
