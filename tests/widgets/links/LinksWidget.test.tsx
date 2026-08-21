import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LinksWidget } from '../../../widgets/links/LinksWidget';
import type { LinksWidgetConfig } from '../../../widgets/links/types';

function createConfig(content: string): LinksWidgetConfig {
  return {
    id: 'links-widget',
    type: 'links',
    title: '',
    content,
    layout: { x: 0, y: 0, w: 4, h: 3 },
  };
}

describe('LinksWidget', () => {
  it('renders a Markdown link as a native anchor in the current tab', () => {
    render(
      <LinksWidget
        config={createConfig('[Mail](https://mail.example.com/)')}
      />,
    );

    const link = screen.getByRole('link', { name: 'Mail' });
    expect(link).toHaveAttribute('href', 'https://mail.example.com/');
    expect(link).not.toHaveAttribute('target');
    expect(link).toHaveAttribute('title', 'Mail');
  });

  it('keeps multiple links on the same rendered line', () => {
    const { container } = render(
      <LinksWidget
        config={createConfig(
          '[Mail](https://mail.example.com/) [Docs](https://docs.example.com/)',
        )}
      />,
    );

    const line = container.querySelector('[data-links-line="1"]');
    expect(line).not.toBeNull();
    expect(within(line as HTMLElement).getAllByRole('link')).toHaveLength(2);
    expect(container.querySelectorAll('[data-links-line]')).toHaveLength(1);
  });

  it('renders plain text and preserves Markdown line breaks', () => {
    const { container } = render(
      <LinksWidget config={createConfig('Первая строка\n\nВторая строка')} />,
    );

    const lines = container.querySelectorAll('[data-links-line]');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('Первая строка');
    expect(lines[1]).toBeEmptyDOMElement();
    expect(lines[2]).toHaveTextContent('Вторая строка');
  });

  it('shows the built-in icon when a favicon fails to load', () => {
    const { container } = render(
      <LinksWidget
        config={createConfig('[Mail](https://mail.example.com/)')}
      />,
    );

    const favicon = container.querySelector('img');
    expect(favicon).not.toBeNull();
    fireEvent.error(favicon as HTMLImageElement);

    expect(screen.getByTestId('link-favicon-fallback')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mail' })).toBeVisible();
  });

  it('uses a normalized href for a scheme-less URL', () => {
    render(<LinksWidget config={createConfig('[GitHub](github.com)')} />);

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/',
    );
  });
});
