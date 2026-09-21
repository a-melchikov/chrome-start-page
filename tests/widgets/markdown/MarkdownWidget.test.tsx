import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultMarkdownWidget } from '../../../widgets/markdown/defaults';
import { MarkdownWidget } from '../../../widgets/markdown/MarkdownWidget';
import type { MarkdownWidgetConfig } from '../../../widgets/markdown/types';

function createConfig(content: string): MarkdownWidgetConfig {
  return {
    id: 'markdown-widget',
    type: 'markdown',
    title: '',
    content,
    layout: { x: 0, y: 0, w: 4, h: 3 },
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
});
