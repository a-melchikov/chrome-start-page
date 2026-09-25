import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(
      (query: string): MediaQueryList =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    ),
  });

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  }

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.theme;
    document.documentElement.style.removeProperty('color-scheme');
    vi.mocked(window.matchMedia).mockClear();
  });
}

try {
  const { fakeBrowser } = await import('wxt/testing/fake-browser');
  if (fakeBrowser?.permissions) {
    const grantedOrigins = new Set<string>();
    fakeBrowser.permissions.contains = vi
      .fn()
      .mockImplementation(async (details: { origins?: string[] }) => {
        return (
          details.origins?.every((origin) => grantedOrigins.has(origin)) ?? true
        );
      });
    fakeBrowser.permissions.request = vi
      .fn()
      .mockImplementation(async (details: { origins?: string[] }) => {
        details.origins?.forEach((origin) => grantedOrigins.add(origin));
        return true;
      });
    fakeBrowser.permissions.remove = vi
      .fn()
      .mockImplementation(async (details: { origins?: string[] }) => {
        details.origins?.forEach((origin) => grantedOrigins.delete(origin));
        return true;
      });
  }
} catch {
  // Ignored if fakeBrowser is not loaded
}
