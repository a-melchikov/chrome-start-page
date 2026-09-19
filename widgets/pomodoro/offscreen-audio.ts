import { browser } from 'wxt/browser';

import { playPomodoroChime } from './audio';
import { POMODORO_AUDIO_ACTION } from './types';

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
  void playPomodoroChime();
}
