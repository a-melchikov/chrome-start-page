import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherWidgetEditor } from '../../../widgets/weather/WeatherWidgetEditor';
import type { WeatherWidgetConfig } from '../../../widgets/weather/types';
import * as apiModule from '../../../widgets/weather/api';

describe('WeatherWidgetEditor component', () => {
  const initialConfig: WeatherWidgetConfig = {
    id: 'weather-editor-test',
    type: 'weather',
    mode: 'visual',
    location: { type: 'unset' },
    layout: { x: 0, y: 0, w: 5, h: 5 },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders mode switch and calls onChange when toggling mode', () => {
    const onChange = vi.fn();
    const onFinish = vi.fn();

    render(
      <WeatherWidgetEditor
        config={initialConfig}
        onChange={onChange}
        onRequestFinish={onFinish}
      />,
    );

    const compactButton = screen.getByRole('button', { name: 'Компактный' });
    fireEvent.click(compactButton);

    expect(onChange).toHaveBeenCalledWith({
      ...initialConfig,
      mode: 'compact',
    });
  });

  it('performs debounced search and selects a city from suggestions', async () => {
    const onChange = vi.fn();
    const onFinish = vi.fn();

    vi.spyOn(apiModule, 'searchCities').mockResolvedValue([
      {
        type: 'city',
        id: 524901,
        name: 'Москва',
        region: 'Москва',
        country: 'Россия',
        latitude: 55.75,
        longitude: 37.62,
        timezone: 'Europe/Moscow',
      },
    ]);

    render(
      <WeatherWidgetEditor
        config={initialConfig}
        onChange={onChange}
        onRequestFinish={onFinish}
      />,
    );

    const input = screen.getByPlaceholderText('Введите название (от 2 букв)…');
    fireEvent.change(input, { target: { value: 'Мос' } });

    await waitFor(() => {
      expect(screen.getByText('Москва')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Москва'));

    expect(onChange).toHaveBeenCalledWith({
      ...initialConfig,
      location: {
        type: 'city',
        id: 524901,
        name: 'Москва',
        region: 'Москва',
        country: 'Россия',
        latitude: 55.75,
        longitude: 37.62,
        timezone: 'Europe/Moscow',
      },
    });
  });

  it('calls onRequestFinish when clicking done button', () => {
    const onChange = vi.fn();
    const onFinish = vi.fn();

    render(
      <WeatherWidgetEditor
        config={initialConfig}
        onChange={onChange}
        onRequestFinish={onFinish}
      />,
    );

    const doneButton = screen.getByRole('button', { name: 'Готово' });
    fireEvent.click(doneButton);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
