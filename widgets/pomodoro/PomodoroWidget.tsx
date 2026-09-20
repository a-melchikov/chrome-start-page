import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from '../../components/icons';
import { Button, IconButton } from '../../components/ui';
import { classNames } from '../../components/ui/class-names';
import type { PomodoroPhase, PomodoroWidgetConfig } from './types';
import { usePomodoro } from './use-pomodoro';

interface PomodoroWidgetProps {
  config: PomodoroWidgetConfig;
}

const PHASES: Array<{ id: PomodoroPhase; label: string }> = [
  { id: 'work', label: 'Фокус' },
  { id: 'shortBreak', label: 'Перерыв' },
  { id: 'longBreak', label: 'Длинный' },
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function PomodoroWidget({ config }: PomodoroWidgetProps) {
  const {
    state,
    remainingSeconds,
    totalPhaseSeconds,
    progressPercent,
    start,
    pause,
    reset,
    skip,
    seek,
    setPhase,
  } = usePomodoro(config);

  const [scrubbingSeconds, setScrubbingSeconds] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const isScrubbing = scrubbingSeconds !== null;
  const currentRemaining = isScrubbing ? scrubbingSeconds : remainingSeconds;
  const currentProgressPercent = isScrubbing
    ? totalPhaseSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((totalPhaseSeconds - scrubbingSeconds) / totalPhaseSeconds) * 100,
          ),
        )
      : 0
    : progressPercent;

  const formattedTime = useMemo(
    () => formatTime(currentRemaining),
    [currentRemaining],
  );

  const calculateSecondsFromClientX = useCallback(
    (clientX: number): number => {
      const slider = sliderRef.current;
      if (!slider) {
        return remainingSeconds;
      }

      const rect = slider.getBoundingClientRect();
      if (rect.width <= 0) {
        return remainingSeconds;
      }

      const offsetX = clientX - rect.left;
      const progressFraction = Math.max(0, Math.min(1, offsetX / rect.width));
      return Math.round(totalPhaseSeconds * (1 - progressFraction));
    },
    [remainingSeconds, totalPhaseSeconds],
  );

  useEffect(() => {
    const handleMove = (event: globalThis.PointerEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      const targetSeconds = calculateSecondsFromClientX(event.clientX);
      setScrubbingSeconds(targetSeconds);
    };

    const handleFinish = (event: globalThis.PointerEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      isDraggingRef.current = false;
      const targetSeconds = calculateSecondsFromClientX(event.clientX);
      setScrubbingSeconds(null);
      void seek(targetSeconds);
    };

    const handleCancel = () => {
      if (!isDraggingRef.current) {
        return;
      }
      isDraggingRef.current = false;
      setScrubbingSeconds(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleFinish);
    window.addEventListener('pointercancel', handleCancel);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleFinish);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [calculateSecondsFromClientX, seek]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }

    e.preventDefault();
    isDraggingRef.current = true;
    const targetSeconds = calculateSecondsFromClientX(e.clientX);
    setScrubbingSeconds(targetSeconds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const STEP = 15;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      void seek(Math.max(0, remainingSeconds - STEP));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      void seek(Math.min(totalPhaseSeconds, remainingSeconds + STEP));
    } else if (e.key === 'Home') {
      e.preventDefault();
      void seek(totalPhaseSeconds);
    } else if (e.key === 'End') {
      e.preventDefault();
      void seek(0);
    }
  };

  const isRunning = state.status === 'running';

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-2 overflow-hidden select-none">
      {/* Phase selection tabs */}
      <div
        aria-label="Выбор фазы таймера"
        className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-theme-surface-muted p-1"
        role="tablist"
      >
        {PHASES.map((phase) => {
          const isSelected = state.phase === phase.id;
          return (
            <button
              key={phase.id}
              aria-selected={isSelected}
              className={classNames(
                'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-theme-surface text-theme-text-primary shadow-xs'
                  : 'text-theme-text-secondary hover:text-theme-text-primary',
              )}
              role="tab"
              type="button"
              onClick={() => setPhase(phase.id)}
            >
              {phase.label}
            </button>
          );
        })}
      </div>

      {/* Main countdown & progress display */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
        <span
          aria-live="polite"
          className="theme-glow font-mono text-3xl font-bold tracking-tight tabular-nums text-theme-text-primary sm:text-4xl"
          data-testid="pomodoro-timer-display"
        >
          {formattedTime}
        </span>

        {/* Interactive Seek Bar / Slider */}
        <div
          ref={sliderRef}
          aria-label="Перемотка времени текущей фазы"
          aria-valuemax={totalPhaseSeconds}
          aria-valuemin={0}
          aria-valuenow={currentRemaining}
          aria-valuetext={formattedTime}
          className="group nodrag relative flex h-5 w-4/5 max-w-xs cursor-pointer items-center touch-none select-none"
          data-testid="pomodoro-seek-bar"
          role="slider"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
        >
          {/* Track background */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-theme-border transition-all group-hover:h-2">
            {/* Filled progress bar */}
            <div
              className={classNames(
                'h-full bg-theme-accent',
                isScrubbing
                  ? 'transition-none'
                  : 'transition-all duration-300 ease-out',
              )}
              style={{ width: `${currentProgressPercent}%` }}
            />
          </div>

          {/* Thumb handle */}
          <div
            className={classNames(
              'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-theme-accent bg-theme-surface shadow-xs transition-opacity',
              'size-3.5',
              isScrubbing
                ? 'scale-110 opacity-100 ring-2 ring-theme-ring/30'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
            )}
            style={{ left: `${currentProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Primary and secondary control buttons */}
      <div className="flex shrink-0 items-center justify-center gap-2">
        <IconButton
          aria-label="Сбросить текущую фазу"
          size="small"
          title="Сбросить"
          variant="secondary"
          onClick={reset}
        >
          <RotateCcwIcon className="size-5" />
        </IconButton>

        <Button
          aria-label={isRunning ? 'Пауза' : 'Старт'}
          className="min-w-24 gap-1.5"
          size="small"
          variant="primary"
          onClick={isRunning ? pause : start}
        >
          {isRunning ? (
            <>
              <PauseIcon className="size-4" />
              <span>Пауза</span>
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              <span>Старт</span>
            </>
          )}
        </Button>

        <IconButton
          aria-label="Пропустить текущую фазу"
          size="small"
          title="Пропустить"
          variant="secondary"
          onClick={skip}
        >
          <ForwardIcon className="size-5" />
        </IconButton>
      </div>

      {/* Cycle indicator dots & daily count */}
      <div className="flex shrink-0 items-center justify-between pt-1.5 text-xs text-theme-text-secondary">
        <div
          aria-label={`Цикл: ${state.cycleCount} из ${config.longBreakInterval}`}
          className="flex items-center gap-1.5"
          title={`Цикл: ${state.cycleCount} из ${config.longBreakInterval}`}
        >
          {Array.from({ length: config.longBreakInterval }).map((_, index) => (
            <span
              key={index}
              className={classNames(
                'size-2 rounded-full transition-colors',
                index < state.cycleCount
                  ? 'bg-theme-accent'
                  : 'border border-theme-border',
              )}
            />
          ))}
        </div>

        <span title="Выполнено помидоров за сегодня">
          Сегодня:{' '}
          <span className="font-semibold text-theme-text-primary">
            {state.completedToday}
          </span>
        </span>
      </div>
    </div>
  );
}
