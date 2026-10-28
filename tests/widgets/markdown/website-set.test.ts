import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  getWebsiteSetUrls,
  openWebsiteSet,
} from '../../../widgets/markdown/website-set';

describe('website sets', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => vi.restoreAllMocks());

  it('collects unique website URLs in document order from Markdown, GFM, HTML and references', () => {
    const content = [
      '[Почта](https://example.com)',
      '[Та же почта](https://example.com/)',
      '<https://docs.example.com>',
      '<a href="http://intranet.example.com">Портал</a>',
      '[Задачи][tracker]',
      '[tracker]: https://tasks.example.com',
    ].join('\n\n');
    expect(getWebsiteSetUrls(content)).toEqual([
      'https://example.com/',
      'https://docs.example.com/',
      'http://intranet.example.com/',
      'https://tasks.example.com/',
    ]);
  });

  it('excludes files, anchors, executable URLs, images and links shown inside code', () => {
    const content = [
      '[Файл](file:///tmp/doc.md) [Раздел](#section)',
      '[Опасно](javascript:alert%281%29) <a href="data:text/html,bad">Bad</a>',
      '![Изображение](https://example.com/image.png)',
      '~~~md',
      '[Образец](https://example.com/hidden)',
      '~~~',
    ].join('\n\n');
    expect(getWebsiteSetUrls(content)).toEqual([]);
  });

  it('opens unique URLs in background tabs and continues after an individual failure', async () => {
    const create = vi
      .spyOn(fakeBrowser.tabs, 'create')
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('Browser rejected a tab'))
      .mockResolvedValueOnce({} as never);
    expect(
      await openWebsiteSet([
        'https://one.example.com',
        'https://one.example.com/',
        'https://two.example.com/',
        'https://three.example.com/',
      ]),
    ).toEqual({ opened: 2, failedUrls: ['https://two.example.com/'] });
    expect(create.mock.calls.map(([properties]) => properties)).toEqual([
      { url: 'https://one.example.com/', active: false },
      { url: 'https://two.example.com/', active: false },
      { url: 'https://three.example.com/', active: false },
    ]);
  });

  it('validates URLs again at the platform boundary and makes no calls for an empty set', async () => {
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    expect(await openWebsiteSet([])).toEqual({ opened: 0, failedUrls: [] });
    expect(
      await openWebsiteSet(['javascript:alert(1)', 'file:///tmp/doc.md']),
    ).toEqual({
      opened: 0,
      failedUrls: ['javascript:alert(1)', 'file:///tmp/doc.md'],
    });
    expect(create).not.toHaveBeenCalled();
  });
});
