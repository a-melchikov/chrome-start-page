import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultSearchWidget } from '../../../widgets/search/defaults';
import { SEARCH_ENGINES } from '../../../widgets/search/engines';
import { SearchWidget } from '../../../widgets/search/SearchWidget';
import { SearchWidgetEditor } from '../../../widgets/search/SearchWidgetEditor';
import type { SearchWidgetConfig } from '../../../widgets/search/types';

const baseConfig: SearchWidgetConfig = {
  id: 'search-widget',
  type: 'search',
  title: '',
  engine: 'google',
  layout: { x: 0, y: 0, w: 6, h: 1 },
};

describe('SearchWidget', () => {
  it('creates a Google widget with the default 6×1 layout', () => {
    expect(createDefaultSearchWidget('search-id', 2)).toEqual({
      id: 'search-id',
      type: 'search',
      title: '',
      engine: 'google',
      layout: { x: 0, y: 6, w: 6, h: 1 },
    });
  });

  it.each(SEARCH_ENGINES)(
    'renders a native GET form for $name',
    ({ action, iconPath, id, name, queryParameter }) => {
      render(<SearchWidget config={{ ...baseConfig, engine: id }} />);

      const label = `Поиск в ${name}`;
      const form = screen.getByRole('search', { name: label });
      const input = screen.getByRole('searchbox', { name: label });
      const submitButton = screen.getByRole('button', {
        name: `Искать в ${name}`,
      });

      expect(form).toHaveAttribute('action', action);
      expect(form).toHaveAttribute('method', 'get');
      expect(form).not.toHaveAttribute('target');
      expect(input).toHaveAttribute('name', queryParameter);
      expect(input).toHaveAttribute('placeholder', `Найти в ${name}…`);
      expect(input).not.toHaveFocus();
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).toHaveClass('widget-search-submit');

      const icon = screen.getByTestId(`search-engine-icon-${id}`);
      const iconSize = id === 'google' ? '24' : '28';
      expect(iconPath).toBe(`/search-engines/${id}.svg`);
      expect(icon).toHaveAttribute('src', expect.stringContaining(iconPath));
      expect(icon).toHaveAttribute('width', iconSize);
      expect(icon).toHaveAttribute('height', iconSize);
      expect(icon).toHaveClass(iconSize === '28' ? 'size-7' : 'size-6');
      expect(icon.parentElement).toHaveAttribute('data-engine', id);
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
      expect(submitButton).not.toContainElement(icon);
    },
  );

  it('shows a local magnifier when the engine icon fails', () => {
    render(<SearchWidget config={baseConfig} />);

    fireEvent.error(screen.getByTestId('search-engine-icon-google'));

    const fallback = screen.getByTestId('search-engine-icon-fallback');
    expect(fallback).toBeVisible();
    expect(fallback).toHaveClass('size-5');
    expect(
      screen.queryByTestId('search-engine-icon-google'),
    ).not.toBeInTheDocument();
  });

  it('blocks an empty query and trims a non-empty query before submission', () => {
    render(<SearchWidget config={baseConfig} />);

    const form = screen.getByRole('search', { name: 'Поиск в Google' });
    const input = screen.getByRole('searchbox', { name: 'Поиск в Google' });
    const emptySubmit = new Event('submit', {
      bubbles: true,
      cancelable: true,
    });

    act(() => form.dispatchEvent(emptySubmit));
    expect(emptySubmit.defaultPrevented).toBe(true);

    fireEvent.change(input, { target: { value: '  chrome extensions  ' } });
    const validSubmit = new Event('submit', {
      bubbles: true,
      cancelable: true,
    });

    act(() => form.dispatchEvent(validSubmit));
    expect(validSubmit.defaultPrevented).toBe(false);
    expect(input).toHaveValue('chrome extensions');
  });

  it('clears the query with an outline button and restores input focus', async () => {
    const user = userEvent.setup();
    render(<SearchWidget config={baseConfig} />);

    const input = screen.getByRole('searchbox', { name: 'Поиск в Google' });
    expect(
      screen.queryByRole('button', { name: 'Очистить поиск' }),
    ).not.toBeInTheDocument();

    await user.type(input, 'пример');
    const clearButton = screen.getByRole('button', { name: 'Очистить поиск' });
    expect(clearButton).toHaveAttribute('type', 'button');
    expect(clearButton).toHaveClass('widget-search-clear');
    expect(clearButton.querySelector('svg')).toBeInTheDocument();

    await user.click(clearButton);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(clearButton).not.toBeInTheDocument();
  });
});

function SearchEditorHarness({ onFinish }: { onFinish: () => void }) {
  const [config, setConfig] = useState(baseConfig);

  return (
    <>
      <SearchWidgetEditor
        config={config}
        onChange={setConfig}
        onRequestFinish={onFinish}
      />
      <SearchWidget config={config} />
      <output>{JSON.stringify(config)}</output>
    </>
  );
}

describe('SearchWidgetEditor', () => {
  it('updates the selected engine and finishes explicitly', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<SearchEditorHarness onFinish={onFinish} />);

    expect(screen.queryByLabelText('Заголовок')).not.toBeInTheDocument();
    expect(screen.getByTestId('search-engine-icon-google')).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Поисковик' }));
    await user.click(screen.getByRole('option', { name: 'Яндекс' }));

    expect(screen.getByText(/"engine":"yandex"/)).toBeVisible();
    expect(screen.getByTestId('search-engine-icon-yandex')).toBeVisible();
    expect(
      screen.queryByTestId('search-engine-icon-google'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
