import { browser } from 'wxt/browser';

export function isExtensionRuntime(): boolean {
  return !!browser.runtime.id;
}
