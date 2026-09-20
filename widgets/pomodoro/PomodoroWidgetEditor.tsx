import { useId, useState } from 'react';

import { Button, Input } from '../../components/ui';
import { loadPomodoroRuntime, savePomodoroRuntime } from './storage';
import type { PomodoroWidgetConfig } from './types';

interface PomodoroWidgetEditorProps {
  config: PomodoroWidgetConfig;
  onChange: (config: PomodoroWidgetConfig) => void;
  onRequestFinish: () => void;
}

function clamp(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function PomodoroWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: PomodoroWidgetEditorProps) {
  const workId = useId();
  const shortBreakId = useId();
  const longBreakId = useId();
  const intervalId = useId();
  const soundId = useId();

  const [workInput, setWorkInput] = useState(String(config.workDuration));
  const [shortBreakInput, setShortBreakInput] = useState(
    String(config.shortBreakDuration),
  );
  const [longBreakInput, setLongBreakInput] = useState(
    String(config.longBreakDuration),
  );
  const [intervalInput, setIntervalInput] = useState(
    String(config.longBreakInterval),
  );

  const [hasResetToday, setHasResetToday] = useState(false);

  const handleResetToday = async () => {
    try {
      const state = await loadPomodoroRuntime(config.id, config);
      await savePomodoroRuntime(config.id, {
        ...state,
        completedToday: 0,
      });
      setHasResetToday(true);
    } catch (error) {
      console.error('Failed to reset today count:', error);
    }
  };

  const handleFinish = () => {
    const clampedWork = clamp(Number.parseInt(workInput, 10), 1, 120, 25);
    const clampedShort = clamp(Number.parseInt(shortBreakInput, 10), 1, 60, 5);
    const clampedLong = clamp(Number.parseInt(longBreakInput, 10), 1, 60, 15);
    const clampedInterval = clamp(Number.parseInt(intervalInput, 10), 1, 12, 4);

    onChange({
      ...config,
      workDuration: clampedWork,
      shortBreakDuration: clampedShort,
      longBreakDuration: clampedLong,
      longBreakInterval: clampedInterval,
    });
    onRequestFinish();
  };

  return (
    <div className="space-y-4 text-theme-text-primary">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={workId}>
            Фокус (мин)
          </label>
          <Input
            data-dialog-initial-focus
            id={workId}
            max={120}
            min={1}
            type="number"
            value={workInput}
            onBlur={() => {
              const clamped = clamp(Number.parseInt(workInput, 10), 1, 120, 25);
              setWorkInput(String(clamped));
              onChange({ ...config, workDuration: clamped });
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setWorkInput(raw);
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 120) {
                onChange({ ...config, workDuration: parsed });
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={shortBreakId}>
            Короткий перерыв (мин)
          </label>
          <Input
            id={shortBreakId}
            max={60}
            min={1}
            type="number"
            value={shortBreakInput}
            onBlur={() => {
              const clamped = clamp(
                Number.parseInt(shortBreakInput, 10),
                1,
                60,
                5,
              );
              setShortBreakInput(String(clamped));
              onChange({ ...config, shortBreakDuration: clamped });
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setShortBreakInput(raw);
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 60) {
                onChange({ ...config, shortBreakDuration: parsed });
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={longBreakId}>
            Длинный перерыв (мин)
          </label>
          <Input
            id={longBreakId}
            max={60}
            min={1}
            type="number"
            value={longBreakInput}
            onBlur={() => {
              const clamped = clamp(
                Number.parseInt(longBreakInput, 10),
                1,
                60,
                15,
              );
              setLongBreakInput(String(clamped));
              onChange({ ...config, longBreakDuration: clamped });
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setLongBreakInput(raw);
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 60) {
                onChange({ ...config, longBreakDuration: parsed });
              }
            }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={intervalId}>
            Интервал длинного перерыва
          </label>
          <Input
            id={intervalId}
            max={12}
            min={1}
            type="number"
            value={intervalInput}
            onBlur={() => {
              const clamped = clamp(
                Number.parseInt(intervalInput, 10),
                1,
                12,
                4,
              );
              setIntervalInput(String(clamped));
              onChange({ ...config, longBreakInterval: clamped });
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setIntervalInput(raw);
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 12) {
                onChange({ ...config, longBreakInterval: parsed });
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          checked={config.soundEnabled}
          className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
          id={soundId}
          type="checkbox"
          onChange={(e) => {
            onChange({ ...config, soundEnabled: e.target.checked });
          }}
        />
        <label className="cursor-pointer text-xs font-medium" htmlFor={soundId}>
          Звуковой сигнал при завершении фазы
        </label>
      </div>

      <div className="pt-3">
        <div className="flex items-center justify-between gap-2">
          <Button size="small" variant="secondary" onClick={handleResetToday}>
            {hasResetToday ? 'Счётчик сброшен' : 'Сбросить счётчик за сегодня'}
          </Button>

          <Button size="small" variant="primary" onClick={handleFinish}>
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
}
