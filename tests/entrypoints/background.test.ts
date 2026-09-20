import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  closeOffscreenDocument,
  handlePomodoroAlarm,
  parsePomodoroAlarmWidgetId,
} from '../../entrypoints/background';
import { saveDashboardConfig } from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { createDefaultPomodoroWidget } from '../../widgets/pomodoro/defaults';
import { getPomodoroStorageKey } from '../../widgets/pomodoro/storage';
import {
  POMODORO_AUDIO_ACTION,
  type PomodoroRuntimeState,
} from '../../widgets/pomodoro/types';

describe('background service worker Pomodoro handler', () => {
  const mockCreateDocument = vi.fn().mockResolvedValue(undefined);
  const mockHasDocument = vi.fn().mockResolvedValue(false);
  const mockCloseDocument = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();

    (globalThis as unknown as { chrome: unknown }).chrome = {
      offscreen: {
        createDocument: mockCreateDocument,
        hasDocument: mockHasDocument,
        closeDocument: mockCloseDocument,
      },
    };
  });

  it('parses widgetId correctly from alarm name', () => {
    expect(parsePomodoroAlarmWidgetId('pomodoro:widget-123')).toBe(
      'widget-123',
    );
    expect(parsePomodoroAlarmWidgetId('other:widget-123')).toBeNull();
  });

  it('handles alarm by transitioning phase, creating notification, and creating offscreen document if absent', async () => {
    const widget = createDefaultPomodoroWidget('test-pomodoro-1', 0);
    widget.soundEnabled = true;
    const dashboard = createDefaultDashboardConfig();
    dashboard.widgets.push(widget);
    await saveDashboardConfig(dashboard);

    const runningState: PomodoroRuntimeState = {
      status: 'running',
      phase: 'work',
      targetEndTime: Date.now() - 1000,
      remainingSeconds: 0,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const key = getPomodoroStorageKey(widget.id);
    await storage.setItem(key, runningState);

    await handlePomodoroAlarm(`pomodoro:${widget.id}`);

    const nextState = await storage.getItem<PomodoroRuntimeState>(key);
    expect(nextState?.status).toBe('idle');
    expect(nextState?.phase).toBe('shortBreak');
    expect(nextState?.completedToday).toBe(1);
    expect(nextState?.cycleCount).toBe(1);
    expect(nextState?.remainingSeconds).toBe(5 * 60);

    expect(mockCreateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        reasons: ['AUDIO_PLAYBACK'],
      }),
    );
  });

  it('sends playback message if offscreen document already exists', async () => {
    mockHasDocument.mockResolvedValueOnce(true);
    fakeBrowser.runtime.onMessage.addListener(() => {});
    const sendMessageSpy = vi.spyOn(fakeBrowser.runtime, 'sendMessage');

    const widget = createDefaultPomodoroWidget('test-pomodoro-doc-exists', 0);
    widget.soundEnabled = true;
    const dashboard = createDefaultDashboardConfig();
    dashboard.widgets.push(widget);
    await saveDashboardConfig(dashboard);

    const runningState: PomodoroRuntimeState = {
      status: 'running',
      phase: 'work',
      targetEndTime: Date.now() - 1000,
      remainingSeconds: 0,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const key = getPomodoroStorageKey(widget.id);
    await storage.setItem(key, runningState);

    await handlePomodoroAlarm(`pomodoro:${widget.id}`);

    expect(mockCreateDocument).not.toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: POMODORO_AUDIO_ACTION,
    });
  });

  it('does not play offscreen chime if soundEnabled is false', async () => {
    const widget = createDefaultPomodoroWidget('test-pomodoro-2', 0);
    widget.soundEnabled = false;
    const dashboard = createDefaultDashboardConfig();
    dashboard.widgets.push(widget);
    await saveDashboardConfig(dashboard);

    const runningState: PomodoroRuntimeState = {
      status: 'running',
      phase: 'work',
      targetEndTime: Date.now() - 1000,
      remainingSeconds: 0,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const key = getPomodoroStorageKey(widget.id);
    await storage.setItem(key, runningState);

    await handlePomodoroAlarm(`pomodoro:${widget.id}`);

    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('ignores alarm if state status is not running', async () => {
    const widget = createDefaultPomodoroWidget('test-pomodoro-3', 0);
    const dashboard = createDefaultDashboardConfig();
    dashboard.widgets.push(widget);
    await saveDashboardConfig(dashboard);

    const pausedState: PomodoroRuntimeState = {
      status: 'paused',
      phase: 'work',
      targetEndTime: null,
      remainingSeconds: 100,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const key = getPomodoroStorageKey(widget.id);
    await storage.setItem(key, pausedState);

    await handlePomodoroAlarm(`pomodoro:${widget.id}`);

    const nextState = await storage.getItem<PomodoroRuntimeState>(key);
    expect(nextState?.status).toBe('paused');
    expect(nextState?.remainingSeconds).toBe(100);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('closes offscreen document when it exists', async () => {
    mockHasDocument.mockResolvedValueOnce(true);
    await closeOffscreenDocument();
    expect(mockCloseDocument).toHaveBeenCalled();
  });

  it('does not attempt to close offscreen document when it does not exist', async () => {
    mockHasDocument.mockResolvedValueOnce(false);
    await closeOffscreenDocument();
    expect(mockCloseDocument).not.toHaveBeenCalled();
  });
});
