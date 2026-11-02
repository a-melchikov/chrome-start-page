import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  DEFAULT_SETTINGS_PANEL_WIDTH,
  MAX_SETTINGS_PANEL_WIDTH,
  MIN_SETTINGS_PANEL_WIDTH,
} from '../storage/settings-panel';

interface ResizeDrag {
  pointerId: number;
  startX: number;
  startWidth: number;
  width: number;
  target: HTMLDivElement;
}

function releaseDrag(drag: ResizeDrag) {
  if (drag.target.hasPointerCapture?.(drag.pointerId))
    drag.target.releasePointerCapture(drag.pointerId);
}

export function useSettingsPanelResize({
  open,
  preferredWidth = DEFAULT_SETTINGS_PANEL_WIDTH,
  onCommit,
}: {
  open: boolean;
  preferredWidth?: number;
  onCommit: (width: number) => void;
}) {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const dragRef = useRef<ResizeDrag | null>(null);
  const maxWidth = Math.min(viewportWidth, MAX_SETTINGS_PANEL_WIDTH);
  const minWidth = Math.min(MIN_SETTINGS_PANEL_WIDTH, maxWidth);
  const width = Math.min(draftWidth ?? preferredWidth, maxWidth);
  const clampWidth = (next: number) =>
    Math.max(minWidth, Math.min(maxWidth, Math.round(next)));

  const finishResize = useCallback(
    (commit = true) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (commit) onCommit(Math.max(MIN_SETTINGS_PANEL_WIDTH, drag.width));
      setDraftWidth(null);
      releaseDrag(drag);
    },
    [onCommit],
  );

  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const finish = () => finishResize();
    window.addEventListener('blur', finish);
    window.addEventListener('pagehide', finish);
    return () => {
      window.removeEventListener('blur', finish);
      window.removeEventListener('pagehide', finish);
      const drag = dragRef.current;
      if (drag) {
        dragRef.current = null;
        onCommit(Math.max(MIN_SETTINGS_PANEL_WIDTH, drag.width));
        releaseDrag(drag);
      }
    };
  }, [finishResize, onCommit]);

  useEffect(() => {
    if (!open) finishResize();
  }, [open, finishResize]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      width,
      target: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.width = clampWidth(drag.startWidth + drag.startX - event.clientX);
    setDraftWidth(drag.width);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && dragRef.current) {
      event.preventDefault();
      event.stopPropagation();
      finishResize(false);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 64 : 16;
    const next =
      event.key === 'Home'
        ? minWidth
        : event.key === 'End'
          ? maxWidth
          : clampWidth(width + (event.key === 'ArrowLeft' ? step : -step));
    onCommit(Math.max(MIN_SETTINGS_PANEL_WIDTH, next));
  };

  return {
    width,
    minWidth,
    maxWidth,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) finishResize();
      },
      onPointerCancel: () => finishResize(false),
      onLostPointerCapture: () => finishResize(),
      onKeyDown,
      onDoubleClick: () => onCommit(DEFAULT_SETTINGS_PANEL_WIDTH),
    },
  };
}
