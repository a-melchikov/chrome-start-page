import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { createDefaultMarkdownWidget } from '../../../widgets/markdown/defaults';
import { MarkdownWidget } from '../../../widgets/markdown/MarkdownWidget';
import type { MarkdownWidgetConfig } from '../../../widgets/markdown/types';

function createConfig(
  content: string,
  overrides?: Partial<MarkdownWidgetConfig>,
): MarkdownWidgetConfig {
  return {
    id: 'markdown-widget',
    type: 'markdown',
    title: '',
    content,
    template: 'blank',
    quickAddEnabled: false,
    hideCompletedTasks: false,
    layout: { x: 0, y: 0, w: 4, h: 3 },
    ...overrides,
  };
}

function InteractiveMarkdown({ content }: { content: string }) {
  const [config, setConfig] = useState(createConfig(content));

  return (
    <>
      <MarkdownWidget config={config} onChange={setConfig} />
      <output aria-label="Исходный Markdown">{config.content}</output>
    </>
  );
}

describe('MarkdownWidget', () => {
  it('creates independent widgets with the default 4×3 layout', () => {
    expect(createDefaultMarkdownWidget('markdown-id', 2)).toEqual({
      id: 'markdown-id',
      type: 'markdown',
      title: '',
      content: '',
      template: 'blank',
      quickAddEnabled: false,
      hideCompletedTasks: false,
      showWebsiteSetButton: false,
      layout: { x: 0, y: 6, w: 4, h: 3 },
    });
    expect(createDefaultMarkdownWidget('another-id', 2).id).toBe('another-id');
  });

  it('renders CommonMark, GFM, footnotes, tables, and safe raw HTML', () => {
    const { container } = render(
      <MarkdownWidget
        config={createConfig(`# H1

**strong** and ~~removed~~ with a footnote.[^1]

| A | B |
| - | - |
| 1 | 2 |

<details open><summary>Подробнее</summary><mark>Важно</mark> <kbd>Esc</kbd></details>

[^1]: Note`)}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'H1' })).toBeVisible();
    expect(container.querySelector('strong')).toHaveTextContent('strong');
    expect(container.querySelector('del')).toHaveTextContent('removed');
    expect(screen.getByRole('table')).toBeVisible();
    expect(container.querySelector('details[open]')).toBeVisible();
    expect(container.querySelector('mark')).toHaveTextContent('Важно');
    expect(container.querySelector('kbd')).toHaveTextContent('Esc');
    expect(screen.getByText('Note')).toBeVisible();
  });

  it('keeps safe links in the current tab and shows their favicon fallback', () => {
    const { container } = render(
      <MarkdownWidget config={createConfig('[GitHub](github.com)')} />,
    );

    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/');
    expect(link).not.toHaveAttribute('target');
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(screen.getByTestId('link-favicon-fallback')).toBeVisible();
  });

  it.each([
    'https://mail.google.com/mail/u/0/#inbox',
    '<https://mail.google.com/mail/u/0/#inbox>',
    '[https://mail.google.com/mail/u/0/#inbox](https://mail.google.com/mail/u/0/#inbox)',
    '[https://mail.google.com/mail/u/0/#inbox][mail]\n\n[mail]: https://mail.google.com/mail/u/0/#inbox',
    '<div><a href="https://mail.google.com/mail/u/0/#inbox">https://mail.google.com/mail/u/0/#inbox</a></div>',
  ])(
    'shortens URL-only labels without changing source or destination: %s',
    (content) => {
      const onChange = vi.fn();
      const config = createConfig(content);
      render(<MarkdownWidget config={config} onChange={onChange} />);

      const link = screen.getByRole('link', { name: 'mail.google' });
      expect(link).toHaveAttribute(
        'href',
        'https://mail.google.com/mail/u/0/#inbox',
      );
      expect(link).toHaveAttribute(
        'title',
        'https://mail.google.com/mail/u/0/#inbox',
      );
      expect(link).not.toHaveAttribute('target');
      expect(config.content).toBe(content);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it('preserves custom labels, rich formatting, file links and literal code', () => {
    const { container } = render(
      <MarkdownWidget
        config={createConfig(
          [
            '[Почта](https://mail.google.com/mail/u/0/#inbox)',
            '[https://other.example.com](https://mail.google.com/mail/u/0/#inbox)',
            '[**https://example.com**](https://example.com)',
            '[file:///tmp/doc.pdf](file:///tmp/doc.pdf)',
            '[/tmp/guide.pdf](/tmp/guide.pdf)',
            '`https://mail.google.com/mail/u/0/#inbox`',
            '```text\nhttps://mail.google.com/mail/u/0/#inbox\n```',
          ].join('\n\n'),
        )}
      />,
    );
    expect(screen.getByRole('link', { name: 'Почта' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'https://other.example.com' }),
    ).toBeVisible();
    expect(
      screen
        .getByRole('link', { name: 'https://example.com' })
        .querySelector('strong'),
    ).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'file:///tmp/doc.pdf' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '/tmp/guide.pdf' })).toBeVisible();
    expect(container.querySelectorAll('code')).toHaveLength(2);
    expect(container.querySelector('code')).toHaveTextContent(
      'https://mail.google.com/mail/u/0/#inbox',
    );
  });

  it('renders local file links with DocumentTextIcon and opens them via tabs when allowed', async () => {
    const user = userEvent.setup();
    fakeBrowser.extension.isAllowedFileSchemeAccess = vi
      .fn()
      .mockResolvedValue(true);
    fakeBrowser.tabs.update = vi.fn().mockResolvedValue({} as never);
    fakeBrowser.tabs.create = vi.fn().mockResolvedValue({} as never);

    render(
      <MarkdownWidget
        config={createConfig(
          '[Учебник](file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf)',
        )}
      />,
    );

    const link = screen.getByRole('link', { name: 'Учебник' });
    expect(link).toHaveAttribute(
      'href',
      'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
    );
    expect(screen.getByTestId('link-file-icon')).toBeVisible();

    await user.click(link);
    expect(fakeBrowser.tabs.update).toHaveBeenCalledWith({
      url: 'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
    });

    await user.keyboard('{Control>}');
    await user.click(link);
    await user.keyboard('{/Control}');
    expect(fakeBrowser.tabs.create).toHaveBeenCalledWith({
      url: 'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
    });
  });

  it('copies path to clipboard and shows notice when file URL access is not allowed', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    fakeBrowser.extension.isAllowedFileSchemeAccess = vi
      .fn()
      .mockResolvedValue(false);

    render(
      <MarkdownWidget
        config={createConfig(
          '[Локальный документ](/home/andrey/Downloads/doc.pdf)',
        )}
      />,
    );

    const link = screen.getByRole('link', { name: 'Локальный документ' });
    await user.click(link);

    expect(writeText).toHaveBeenCalledWith(
      'file:///home/andrey/Downloads/doc.pdf',
    );
    expect(
      await screen.findByText(/Ссылка скопирована в буфер обмена/),
    ).toBeVisible();
  });

  it('allows HTTPS images with privacy and loading attributes', () => {
    render(
      <MarkdownWidget
        config={createConfig('![Диаграмма](https://example.com/image.png)')}
      />,
    );

    const image = screen.getByRole('img', { name: 'Диаграмма' });
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(image).toHaveClass('max-w-full');
  });

  it('removes executable HTML, event attributes, arbitrary classes, and dangerous URLs', () => {
    const { container } = render(
      <MarkdownWidget
        config={createConfig(`<script>alert('xss')</script>
<style>body { display: none }</style>
<iframe src="https://example.com"></iframe>
<form><input value="bad"></form>
<span class="attacker" style="color:red" onclick="alert(1)">safe text</span>
[Run](javascript:alert(1))
![Bad](http://example.com/image.png)`)}
      />,
    );

    expect(container.querySelector('script, style, iframe, form')).toBeNull();
    expect(container.querySelector('.attacker, [style], [onclick]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="http:"]')).toBeNull();
    expect(container).toHaveTextContent('safe text');
    expect(screen.queryByRole('link', { name: 'Run' })).not.toBeInTheDocument();
  });

  it('strips picture and source tags to prevent HTTPS and referer bypass', () => {
    const { container } = render(
      <MarkdownWidget
        config={createConfig(
          '<picture><source srcset="http://evil.com/track.png" /><img src="https://example.com/img.png" alt="Test" /></picture>',
        )}
      />,
    );

    expect(container.querySelector('picture, source')).toBeNull();
    const img = screen.getByRole('img', { name: 'Test' });
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('updates the exact task from an interactive checkbox', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveMarkdown content={'- [ ] Одинаково\n- [ ] Одинаково'} />,
    );

    await user.click(screen.getAllByRole('checkbox')[1] as HTMLElement);

    expect(screen.getByLabelText('Исходный Markdown')).toHaveTextContent(
      '- [ ] Одинаково - [x] Одинаково',
    );
  });

  it('changes only the clicked nested task', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveMarkdown
        content={'- [ ] Родитель\n  - [ ] Вложенная задача'}
      />,
    );

    await user.click(screen.getAllByRole('checkbox')[1] as HTMLElement);

    expect(screen.getByLabelText('Исходный Markdown')).toHaveTextContent(
      '- [ ] Родитель - [x] Вложенная задача',
    );
  });

  it('copies fenced code without syntax highlighting', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { container } = render(
      <MarkdownWidget
        config={createConfig('```ts\nconst answer = 42;\n```')}
      />,
    );

    expect(container.querySelector('pre')).toHaveClass('overflow-x-auto');
    await user.click(screen.getByRole('button', { name: 'Копировать код' }));
    expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    expect(
      screen.getByRole('button', { name: 'Код скопирован' }),
    ).toBeVisible();
  });

  it('shows a neutral empty state', () => {
    render(<MarkdownWidget config={createConfig('   ')} />);
    expect(screen.getByText('Markdown пока пуст.')).toBeVisible();
  });

  it('renders large and xlarge text directives with correct font size classes', () => {
    render(
      <MarkdownWidget
        config={createConfig(
          'Обычный :large[Крупный] и :xlarge[Очень крупный]',
        )}
      />,
    );

    const largeSpan = screen.getByText('Крупный');
    expect(largeSpan).toHaveClass('text-[18px]');

    const xlargeSpan = screen.getByText('Очень крупный');
    expect(xlargeSpan).toHaveClass('text-[22px]');
  });

  it('filters completed tasks and preserves parent with incomplete subtask', () => {
    const content = `- [x] Завершённая
- [ ] Открытая
- [x] Родитель
  - [ ] Подзадача`;

    const { rerender } = render(
      <MarkdownWidget
        config={createConfig(content, { hideCompletedTasks: false })}
      />,
    );
    expect(screen.getByText('Завершённая')).toBeVisible();
    expect(screen.getByText('Открытая')).toBeVisible();
    expect(screen.getByText('Родитель')).toBeVisible();
    expect(screen.getByText('Подзадача')).toBeVisible();

    rerender(
      <MarkdownWidget
        config={createConfig(content, { hideCompletedTasks: true })}
      />,
    );
    expect(screen.queryByText('Завершённая')).not.toBeInTheDocument();
    expect(screen.getByText('Открытая')).toBeVisible();
    // Parent should be visible as context for incomplete subtask
    expect(screen.getByText('Родитель')).toBeVisible();
    expect(screen.getByText('Подзадача')).toBeVisible();
  });

  it('shows "Все задачи выполнены" when all tasks are completed', () => {
    const content = `- [x] Задача 1\n- [x] Задача 2`;
    render(
      <MarkdownWidget
        config={createConfig(content, { hideCompletedTasks: true })}
      />,
    );

    expect(screen.getByText('Все задачи выполнены')).toBeVisible();
  });

  it('supports quick add to append new entries', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MarkdownWidget
        config={createConfig('## Список', {
          template: 'tasks',
          quickAddEnabled: true,
        })}
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText('Новая задача…');
    await user.type(input, 'Купить хлеб{enter}');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '## Список\n\n- [ ] Купить хлеб\n',
      }),
    );
  });
  it('names task checkboxes from their own text without including nested tasks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MarkdownWidget
        config={createConfig('- [ ] **Родитель**\n  - [x] Дочерняя задача')}
        onChange={onChange}
      />,
    );
    const parent = screen.getByRole('checkbox', { name: 'Родитель' });
    const child = screen.getByRole('checkbox', { name: 'Дочерняя задача' });
    expect(parent).not.toBeChecked();
    expect(child).toBeChecked();
    parent.focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '- [x] **Родитель**\n  - [x] Дочерняя задача',
      }),
    );
  });
});

describe('MarkdownWidget website sets', () => {
  const createWebsiteSetConfig = (content: string) =>
    createConfig(content, { showWebsiteSetButton: true });

  it('hides the launch button by default and when explicitly disabled', () => {
    const content = '[A](https://one.example.com)';
    const { rerender } = render(
      <MarkdownWidget config={createConfig(content)} />,
    );
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
    rerender(
      <MarkdownWidget
        config={createConfig(content, { showWebsiteSetButton: false })}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
  });
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the set size, opens only on explicit keyboard activation and leaves config unchanged', async () => {
    const user = userEvent.setup();
    const create = vi
      .spyOn(fakeBrowser.tabs, 'create')
      .mockResolvedValue({} as never);
    const onChange = vi.fn();
    render(
      <MarkdownWidget
        config={createWebsiteSetConfig(
          '[A](https://one.example.com) [B](https://two.example.com) [A2](https://one.example.com/)',
        )}
        onChange={onChange}
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Начать работу: открыть сайты (2)',
    });
    expect(create).not.toHaveBeenCalled();
    button.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Открыто сайтов: 2 из 2.',
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith({
      url: 'https://one.example.com/',
      active: false,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not offer a website launch for an empty note or file-only links', () => {
    const { rerender } = render(
      <MarkdownWidget config={createWebsiteSetConfig('Обычная заметка')} />,
    );
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
    rerender(
      <MarkdownWidget
        config={createWebsiteSetConfig('[Файл](file:///tmp/doc.md)')}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
  });

  it('disables launch while opening a set to prevent duplicate activation', async () => {
    const user = userEvent.setup();
    let complete: (() => void) | undefined;
    const create = vi.spyOn(fakeBrowser.tabs, 'create').mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = () => resolve({} as never);
        }),
    );
    render(
      <MarkdownWidget
        config={createWebsiteSetConfig('[A](https://one.example.com)')}
      />,
    );
    const button = screen.getByRole('button', { name: /Начать работу/ });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.dblClick(button);
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => complete?.());
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('retries only failed sites and clears stale feedback after changing the note', async () => {
    const user = userEvent.setup();
    const create = vi
      .spyOn(fakeBrowser.tabs, 'create')
      .mockRejectedValueOnce(new Error('Tab failed'))
      .mockResolvedValue({} as never);
    const config = createWebsiteSetConfig(
      '[A](https://one.example.com) [B](https://two.example.com)',
    );
    const { rerender } = render(<MarkdownWidget config={config} />);
    await user.click(screen.getByRole('button', { name: /Начать работу/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Открыто сайтов: 1 из 2.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Повторить открытие сайтов (1)' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Открыто сайтов: 2 из 2.',
    );
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenLastCalledWith({
      url: 'https://one.example.com/',
      active: false,
    });
    rerender(
      <MarkdownWidget
        config={{ ...config, content: '[C](https://three.example.com)' }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Начать работу: открыть сайты (1)' }),
    ).toBeVisible();
  });
});
