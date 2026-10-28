import { IDBFactory } from 'fake-indexeddb';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

describe('standalone browser boundary', () => {
  let browser: typeof import('../../web/browser').browser;
  beforeAll(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    browser = (await import('../../web/browser')).browser;
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await browser.storage.close();
    vi.unstubAllGlobals();
  });

  it('loads bundled assets from the web origin without an extension ID', () => {
    expect(browser.runtime.id).toBe('');
    expect(browser.runtime.getURL('/icons/icon-128.png')).toBe(
      new URL('/icons/icon-128.png', window.location.origin).href,
    );
  });

  it('opens websites with a detached opener and surfaces blocked popups', async () => {
    const popup = { opener: window };
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce(popup as Window)
      .mockReturnValueOnce(null);
    await browser.tabs.create({ url: 'https://example.com', active: false });
    expect(open).toHaveBeenCalledWith('https://example.com/', '_blank');
    expect(popup.opener).toBeNull();
    await expect(
      browser.tabs.create({ url: 'https://example.com/blocked' }),
    ).rejects.toThrow('заблокировал');
  });

  it('rejects executable and local URLs at the platform boundary', async () => {
    const open = vi.spyOn(window, 'open');
    await expect(
      browser.tabs.create({ url: 'javascript:alert(1)' }),
    ).rejects.toThrow('HTTP/HTTPS');
    await expect(
      browser.tabs.create({ url: 'file:///tmp/test' }),
    ).rejects.toThrow('HTTP/HTTPS');
    expect(open).not.toHaveBeenCalled();
  });
});
