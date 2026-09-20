import { browser } from 'wxt/browser';

import { playPomodoroChime } from './audio';
import { POMODORO_AUDIO_ACTION, POMODORO_AUDIO_FINISHED } from './types';

function notifyAudioFinished(): void {
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    void browser.runtime
      .sendMessage({ type: POMODORO_AUDIO_FINISHED })
      .catch(() => undefined);
  }
}

// Listen for playback messages from background service worker
if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === POMODORO_AUDIO_ACTION) {
      void playPomodoroChime()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.warn('Offscreen message chime playback failed:', error);
          sendResponse({ success: false, error: String(error) });
        })
        .finally(() => {
          notifyAudioFinished();
        });
      return true; // Keep message channel open for async response
    }
    return false;
  });
}

// Play immediately on load if requested via URL hash (e.g. /offscreen.html#play)
if (
  typeof location !== 'undefined' &&
  typeof location.hash === 'string' &&
  location.hash.includes('play')
) {
  void playPomodoroChime().finally(() => {
    notifyAudioFinished();
  });
}
