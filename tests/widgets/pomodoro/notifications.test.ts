import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  getPomodoroNotificationContent,
  showPomodoroNotification,
} from '../../../widgets/pomodoro/notifications';

describe('pomodoro notifications', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });

  describe('getPomodoroNotificationContent', () => {
    it('returns short break notification when transitioning from work to shortBreak', () => {
      const content = getPomodoroNotificationContent('work', 'shortBreak');
      expect(content.title).toBe('Время отдыхать!');
      expect(content.message).toBe('Время сделать короткий перерыв.');
    });

    it('returns long break notification when transitioning from work to longBreak', () => {
      const content = getPomodoroNotificationContent('work', 'longBreak');
      expect(content.title).toBe('Время отдыхать!');
      expect(content.message).toBe('Отличная работа! Пора на длинный перерыв.');
    });

    it('returns work notification when transitioning from shortBreak to work', () => {
      const content = getPomodoroNotificationContent('shortBreak', 'work');
      expect(content.title).toBe('Перерыв окончен!');
      expect(content.message).toBe(
        'Пора вернуться к работе и сфокусироваться.',
      );
    });

    it('returns work notification when transitioning from longBreak to work', () => {
      const content = getPomodoroNotificationContent('longBreak', 'work');
      expect(content.title).toBe('Перерыв окончен!');
      expect(content.message).toBe(
        'Пора вернуться к работе и сфокусироваться.',
      );
    });
  });

  describe('showPomodoroNotification', () => {
    it('creates desktop notification with correct priority, interaction and icon', async () => {
      const createSpy = vi.spyOn(fakeBrowser.notifications, 'create');

      await showPomodoroNotification('widget-42', 'work', 'shortBreak');

      expect(createSpy).toHaveBeenCalledWith('pomodoro-notif:widget-42', {
        type: 'basic',
        iconUrl: fakeBrowser.runtime.getURL('/icons/icon-128.png'),
        title: 'Время отдыхать!',
        message: 'Время сделать короткий перерыв.',
        priority: 2,
        requireInteraction: true,
      });
    });

    it('catches and logs error without throwing if notifications.create rejects', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.spyOn(fakeBrowser.notifications, 'create').mockRejectedValueOnce(
        new Error('Failed to create'),
      );

      await expect(
        showPomodoroNotification('widget-error', 'work', 'shortBreak'),
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create Pomodoro notification:',
        expect.any(Error),
      );
    });
  });
});
