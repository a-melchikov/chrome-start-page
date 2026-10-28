import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { WidgetHost } from '../../components/dashboard/WidgetHost';
import { App } from '../../entrypoints/newtab/App';
import {
  readStoredDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import type { WidgetConfig } from '../../storage/schema';
import { createDefaultImageWidget } from '../../widgets/image/defaults';
import { createMarkdownWidgetWithTemplate } from '../../widgets/markdown/templates';
import { createDefaultSearchWidget } from '../../widgets/search/defaults';
import { getWidgetDefinition } from '../../widgets/registry';

function hostProps(widget: WidgetConfig) {
  return {
    widget,
    isEditing: false,
    onRequestEdit: vi.fn(),
    onRequestDelete: vi.fn(),
    onWidgetChange: vi.fn(),
  };
}

describe('widget reading view', () => {
  beforeEach(() => fakeBrowser.reset());

  it('opens a read-only Markdown view without mounting its editor or changing content', async () => {
    const user = userEvent.setup();
    const widget = {
      ...createMarkdownWidgetWithTemplate('note', 0, 'tasks'),
      title: 'Материалы',
      content:
        '# Инструкция\n\n- [ ] Проверить документ\n\n[Документация](https://example.com)\n\n<script>alert(1)</script>',
    };
    const props = hostProps(widget);
    render(<WidgetHost {...props} />);
    await user.click(
      screen.getByRole('button', { name: 'Развернуть виджет «Материалы»' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Просмотр: Материалы',
    });
    expect(
      await within(dialog).findByRole('heading', { name: 'Инструкция' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('checkbox', { name: 'Проверить документ' }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('link', { name: 'Документация' }),
    ).toHaveAttribute('href', 'https://example.com/');
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
    expect(dialog.querySelector('script')).toBeNull();
    expect(props.onRequestEdit).not.toHaveBeenCalled();
    expect(props.onWidgetChange).not.toHaveBeenCalled();
  });

  it('closes on Escape or the close button and restores focus to the opener', async () => {
    const user = userEvent.setup();
    const widget = {
      ...createMarkdownWidgetWithTemplate('note', 0),
      title: 'Чтение',
      content: 'Текст заметки',
    };
    render(<WidgetHost {...hostProps(widget)} />);
    const opener = screen.getByRole('button', {
      name: 'Развернуть виджет «Чтение»',
    });
    opener.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog', { name: 'Просмотр: Чтение' });
    expect(
      screen.getByRole('button', { name: 'Закрыть просмотр' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(opener).toHaveFocus();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog', { name: 'Просмотр: Чтение' });
    await user.click(screen.getByRole('button', { name: 'Закрыть просмотр' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(opener).toHaveFocus();
  });

  it('shows updated note contents while reading', async () => {
    const user = userEvent.setup();
    const widget = {
      ...createMarkdownWidgetWithTemplate('note', 0),
      title: 'Материалы',
      content: 'Старая версия',
    };
    const props = hostProps(widget);
    const { rerender } = render(<WidgetHost {...props} />);
    await user.click(screen.getByRole('button', { name: /Развернуть виджет/ }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Просмотр: Материалы',
    });
    await within(dialog).findByText('Старая версия');
    const updatedWidget = { ...widget, content: 'Актуальная версия' };
    rerender(<WidgetHost {...props} widget={updatedWidget} />);
    expect(await within(dialog).findByText('Актуальная версия')).toBeVisible();
    expect(within(dialog).queryByText('Старая версия')).not.toBeInTheDocument();
  });

  it('fits the complete image in the reader while preserving dashboard crop and zoom', async () => {
    const user = userEvent.setup();
    const widget = {
      ...createDefaultImageWidget('picture', 0),
      source: { type: 'url' as const, url: 'https://example.com/photo.webp' },
      objectPosition: 'top-left',
      zoom: 2,
      fitMode: 'cover' as const,
      altText: 'Схема проекта',
    };
    const original = structuredClone(widget);
    const props = hostProps(widget);
    render(<WidgetHost {...props} />);
    const dashboardImage = await screen.findByTestId('image-widget-img');
    await user.click(
      screen.getByRole('button', { name: 'Развернуть виджет «Изображение»' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Просмотр: Изображение',
    });
    const image = await within(dialog).findByRole('img', {
      name: 'Схема проекта',
    });
    expect(image).toHaveClass('object-contain');
    expect(image).toHaveStyle({ objectPosition: '50% 50%' });
    expect(image.style.transform).toBe('');
    expect(dashboardImage).toHaveClass('object-cover');
    expect(dashboardImage).toHaveStyle({
      transform: 'scale(2)',
      objectPosition: 'top-left',
    });
    expect(widget).toEqual(original);
    expect(props.onWidgetChange).not.toHaveBeenCalled();
  });

  it('offers no reader for an empty image or Search and validates reader configs', () => {
    const props = hostProps(createDefaultImageWidget('empty', 0));
    const { rerender } = render(<WidgetHost {...props} />);
    expect(
      screen.queryByRole('button', { name: /Развернуть виджет/ }),
    ).not.toBeInTheDocument();
    rerender(
      <WidgetHost {...props} widget={createDefaultSearchWidget('search', 0)} />,
    );
    expect(
      screen.queryByRole('button', { name: /Развернуть виджет/ }),
    ).not.toBeInTheDocument();
    expect(
      getWidgetDefinition('markdown')?.renderReader?.({ type: 'markdown' }),
    ).toBeNull();
    expect(
      getWidgetDefinition('image')?.renderReader?.({ type: 'image' }),
    ).toBeNull();
  });

  it('closes if an image source is removed and does not reopen when the source returns', async () => {
    const user = userEvent.setup();
    const widget = {
      ...createDefaultImageWidget('picture', 0),
      source: { type: 'url' as const, url: 'https://example.com/photo.webp' },
    };
    const props = hostProps(widget);
    const { rerender } = render(<WidgetHost {...props} />);
    await user.click(screen.getByRole('button', { name: /Развернуть виджет/ }));
    await screen.findByRole('dialog', { name: 'Просмотр: Изображение' });
    const emptyWidget = { ...widget, source: { type: 'none' as const } };
    rerender(<WidgetHost {...props} widget={emptyWidget} />);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    rerender(<WidgetHost {...props} />);
    expect(
      screen.getByRole('button', { name: /Развернуть виджет/ }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves global edit mode and saved geometry when Escape closes the reading view', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      {
        ...createMarkdownWidgetWithTemplate('note', 0),
        title: 'Чтение',
        content: 'Текст',
        layout: { x: 4, y: 6, w: 5, h: 4 },
      },
    ];
    await saveDashboardConfig(config);
    render(<App />);
    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    const article = screen.getByRole('article', { name: 'Чтение' });
    article.focus();
    await user.keyboard(' ');
    expect(article).toHaveAttribute('data-selected', 'true');
    await user.click(
      screen.getByRole('button', { name: 'Развернуть виджет «Чтение»' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Просмотр: Чтение',
    });
    await user.click(
      await within(dialog).findByRole('region', { name: 'Содержимое заметки' }),
    );
    expect(article).toHaveAttribute('data-selected', 'true');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Выключить режим редактирования' }),
    ).toBeVisible();
    expect(article).toHaveAttribute('data-selected', 'true');
    expect(await readStoredDashboardConfig()).toEqual(config);
  });
});
