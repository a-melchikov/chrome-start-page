import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadedModules = vi.hoisted(() => ({
  markdownRenderer: false,
  markdownEditor: false,
}));

vi.mock('../../widgets/markdown/MarkdownWidget', () => {
  loadedModules.markdownRenderer = true;

  return {
    MarkdownWidget: () => createElement('p', null, 'mock markdown renderer'),
  };
});

vi.mock('../../widgets/markdown/MarkdownWidgetEditor', () => {
  loadedModules.markdownEditor = true;

  return {
    MarkdownWidgetEditor: () =>
      createElement('p', null, 'mock markdown editor'),
  };
});

import { getWidgetDefinition } from '../../widgets/registry';

describe('widget registry lazy loading', () => {
  beforeEach(() => {
    loadedModules.markdownRenderer = false;
    loadedModules.markdownEditor = false;
  });

  it('loads the renderer with the widget and defers its editor until requested', async () => {
    const definition = getWidgetDefinition('markdown');
    expect(definition).toBeDefined();

    const widget = {
      id: 'markdown-lazy-test',
      type: 'markdown' as const,
      title: 'Notes',
      content: 'Hello',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };

    expect(loadedModules).toEqual({
      markdownRenderer: false,
      markdownEditor: false,
    });

    render(definition!.render(widget));
    expect(await screen.findByText('mock markdown renderer')).toBeVisible();
    expect(loadedModules.markdownRenderer).toBe(true);
    expect(loadedModules.markdownEditor).toBe(false);

    render(definition!.renderEditor!(widget, vi.fn(), vi.fn()));
    expect(await screen.findByText('mock markdown editor')).toBeVisible();
    expect(loadedModules.markdownEditor).toBe(true);
  });
});
