import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MusicClientSnapshot } from '../../../widgets/yandex-music/client';
import { emptyMusicState } from '../../../widgets/yandex-music/types';
import { player } from './fixtures';
import { createDefaultYandexMusicWidget } from '../../../widgets/yandex-music/defaults';
import { AnimationContext } from '../../../components/ui/animation-preferences';
import { createDashboardDragConfig } from '../../../components/dashboard/dashboard-drag';

const mock = vi.hoisted(() => ({
  snapshot: null as MusicClientSnapshot | null,
  connect: vi.fn(),
  open: vi.fn(),
  disconnect: vi.fn(),
  select: vi.fn(),
  command: vi.fn(),
}));
vi.mock('../../../widgets/yandex-music/client', () => ({
  useMusicPlayer: () => mock.snapshot,
  musicClient: mock,
}));

import { YandexMusicWidget } from '../../../widgets/yandex-music/YandexMusicWidget';

const widget = createDefaultYandexMusicWidget('music-test', 0);

describe('YandexMusicWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.snapshot = {
      state: emptyMusicState('permission-required'),
      busy: false,
      initializing: false,
      error: null,
    };
  });

  function volumeSlider() {
    act(() => screen.getByRole('button', { name: 'Выключить звук' }).focus());
    return screen.getByRole('slider', { name: 'Громкость' });
  }

  function ready() {
    mock.snapshot!.state = {
      ...emptyMusicState('ready'),
      player: player(),
      sourceId: 10,
      sources: [{ id: 10, label: 'Музыка', playing: true }],
    };
  }

  it('requests access only on explicit connection', async () => {
    render(<YandexMusicWidget config={widget} />);
    expect(mock.connect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Подключить' }));
    expect(mock.connect).toHaveBeenCalledOnce();
    expect(mock.open).not.toHaveBeenCalled();
  });

  it('offers a link in web mode without playback or permission controls', () => {
    mock.snapshot!.state = emptyMusicState('unsupported');
    render(<YandexMusicWidget config={widget} />);
    expect(screen.getByText('Управление доступно в расширении')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Открыть Яндекс.Музыку' }),
    ).toHaveAttribute('href', 'https://music.yandex.ru');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['no-tabs', 'no-track'] as const)(
    'opens the service on demand in %s state',
    async (status) => {
      mock.snapshot!.state = emptyMusicState(status);
      render(<YandexMusicWidget config={widget} />);
      expect(mock.open).not.toHaveBeenCalled();
      await userEvent.click(
        screen
          .getAllByRole('button', { name: 'Открыть Яндекс.Музыку' })
          .at(-1)!,
      );
      expect(mock.open).toHaveBeenCalledOnce();
    },
  );

  it('renders metadata and sends explicit controls', async () => {
    ready();
    render(<YandexMusicWidget config={widget} />);
    expect(screen.getByText('Новый день')).toBeVisible();
    expect(screen.getByText('Тестовая группа')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Пауза' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Следующий трек' }),
    );
    expect(mock.command.mock.calls).toEqual([
      [{ type: 'pause' }],
      [{ type: 'next' }],
    ]);
    expect(screen.getByRole('slider', { name: 'Позиция трека' })).toHaveValue(
      '30',
    );
  });

  it('sends explicit reaction states and renders the source result without optimistic toggling', async () => {
    ready();
    const view = render(<YandexMusicWidget config={widget} />);
    const like = screen.getByRole('button', { name: 'Нравится' });
    await userEvent.click(like);
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'like',
      value: true,
    });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    mock.snapshot!.state.player!.liked = true;
    view.rerender(<YandexMusicWidget config={widget} />);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(like);
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'like',
      value: false,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Не нравится' }));
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'dislike',
      value: true,
    });
    mock.snapshot!.busy = true;
    view.rerender(<YandexMusicWidget config={widget} />);
    mock.command.mockClear();
    await userEvent.click(like);
    expect(mock.command).not.toHaveBeenCalled();
    delete mock.snapshot!.state.player!.capabilities.like;
    view.rerender(<YandexMusicWidget config={widget} />);
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('title', 'Недоступно для текущего трека');
  });

  it('allows dragging the artwork and track surface while excluding interactive controls', () => {
    ready();
    const { container } = render(<YandexMusicWidget config={widget} />);
    const { cancel } = createDashboardDragConfig(true);
    expect(
      container.querySelector('.music-player-artwork')!.closest(cancel),
    ).toBeNull();
    expect(screen.getByText('Новый день').closest(cancel)).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute(
      'draggable',
      'false',
    );
    expect(
      screen.getByRole('button', { name: 'Пауза' }).closest(cancel),
    ).not.toBeNull();
    expect(volumeSlider().closest(cancel)).not.toBeNull();
  });

  it('commits ranges once on completion, including blur, and cancels a pointer draft', () => {
    ready();
    render(<YandexMusicWidget config={widget} />);
    const seek = screen.getByRole('slider', { name: 'Позиция трека' });
    fireEvent.change(seek, { target: { value: '70' } });
    expect(screen.getByText('01:10 / 03:00')).toBeVisible();
    expect(mock.command).not.toHaveBeenCalled();
    fireEvent.pointerUp(seek);
    fireEvent.blur(seek);
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'seek',
      value: 70,
    });
    const volume = volumeSlider();
    fireEvent.change(volume, { target: { value: '0.3' } });
    expect(volume).toHaveAttribute('aria-valuetext', '30%');
    expect(volume.style.getPropertyValue('--music-range-fill')).toBe('30%');
    fireEvent.blur(volume);
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'volume',
      value: 0.3,
    });
    fireEvent.change(volume, { target: { value: '0.8' } });
    fireEvent.pointerCancel(volume);
    fireEvent.blur(volume);
    expect(mock.command).toHaveBeenCalledTimes(2);
  });

  it('opens vertical volume on hover and focus and dismisses it outside', async () => {
    ready();
    render(<YandexMusicWidget config={widget} />);
    const trigger = screen.getByRole('button', {
      name: 'Выключить звук',
    });
    expect(
      screen.queryByRole('slider', { name: 'Громкость' }),
    ).not.toBeInTheDocument();
    await userEvent.hover(trigger);
    expect(screen.getByRole('slider', { name: 'Громкость' })).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.unhover(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(screen.getByRole('slider', { name: 'Громкость' })).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes volume on pointer leave after adjusting a focused slider', async () => {
    ready();
    const view = render(<YandexMusicWidget config={widget} />);
    const trigger = screen.getByRole('button', { name: 'Выключить звук' });
    await userEvent.hover(trigger);
    const slider = screen.getByRole('slider', { name: 'Громкость' });
    act(() => slider.focus());
    fireEvent.change(slider, { target: { value: '0.7' } });
    fireEvent.pointerUp(slider);
    mock.snapshot!.state.player!.volume = 0.7;
    view.rerender(<YandexMusicWidget config={widget} />);
    await userEvent.unhover(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(
      screen.queryByRole('slider', { name: 'Громкость' }),
    ).not.toBeInTheDocument();
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'volume',
      value: 0.7,
    });
  });

  it('mutes on an icon click and restores the previous volume across track changes', async () => {
    ready();
    mock.snapshot!.state.player!.volume = 0.8;
    const view = render(<YandexMusicWidget config={widget} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Выключить звук' }),
    );
    expect(mock.command).toHaveBeenLastCalledWith({ type: 'volume', value: 0 });
    mock.snapshot!.state.player = player({
      volume: 0,
      trackKey: 'other-track',
    });
    view.rerender(<YandexMusicWidget config={widget} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Включить звук' }),
    );
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'volume',
      value: 0.8,
    });
    mock.snapshot!.state.player!.volume = 0.8;
    view.rerender(<YandexMusicWidget config={widget} />);
    expect(
      screen.getByRole('button', { name: 'Выключить звук' }),
    ).toHaveAttribute('title', 'Выключить звук (80%)');
  });

  it('does not reuse another source volume and blocks muting while busy or unavailable', async () => {
    ready();
    mock.snapshot!.state.player!.volume = 0.9;
    const view = render(<YandexMusicWidget config={widget} />);
    mock.snapshot!.state.sourceId = 20;
    mock.snapshot!.state.player!.volume = 0;
    view.rerender(<YandexMusicWidget config={widget} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Включить звук' }),
    );
    expect(mock.command).toHaveBeenLastCalledWith({
      type: 'volume',
      value: 0.5,
    });
    mock.command.mockClear();
    mock.snapshot!.busy = true;
    view.rerender(<YandexMusicWidget config={widget} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Включить звук' }),
    );
    expect(mock.command).not.toHaveBeenCalled();
    mock.snapshot!.state.player!.capabilities.volume = false;
    view.rerender(<YandexMusicWidget config={widget} />);
    expect(
      screen.getByRole('button', { name: 'Включить звук' }),
    ).toBeDisabled();
  });

  it('supports keyboard volume and consumes Escape before it can exit dashboard editing', () => {
    ready();
    const ancestorKeyDown = vi.fn();
    render(
      <div onKeyDown={ancestorKeyDown}>
        <YandexMusicWidget config={widget} />
      </div>,
    );
    const trigger = screen.getByRole('button', {
      name: 'Выключить звук',
    });
    act(() => trigger.focus());
    const slider = screen.getByRole('slider', { name: 'Громкость' });
    act(() => slider.focus());
    fireEvent.change(slider, { target: { value: '0.8' } });
    fireEvent.keyUp(slider, { key: 'ArrowUp' });
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'volume',
      value: 0.8,
    });
    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(ancestorKeyDown).not.toHaveBeenCalled();
  });

  it('disables unavailable controls with an explanation and falls back for failed artwork', () => {
    ready();
    mock.snapshot!.state.player!.capabilities.seek = false;
    render(<YandexMusicWidget config={widget} />);
    expect(
      screen.getByRole('slider', { name: 'Позиция трека' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('slider', { name: 'Позиция трека' }),
    ).toHaveAttribute('title', 'Недоступно для текущего трека');
    const artwork = document.querySelector('img')!;
    expect(artwork).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.error(artwork);
    expect(document.querySelector('img')).toBeNull();
  });

  it('selects a common source, disconnects and closes with Escape returning focus', async () => {
    ready();
    mock.snapshot!.state.sources.push({
      id: 20,
      label: 'Вторая вкладка',
      playing: false,
    });
    render(<YandexMusicWidget config={widget} />);
    const trigger = screen.getByRole('button', {
      name: 'Подключение Яндекс.Музыки',
    });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', {
      name: 'Настройки Яндекс.Музыки',
    });
    await userEvent.click(
      within(dialog).getByRole('combobox', {
        name: 'Источник воспроизведения',
      }),
    );
    await userEvent.click(
      screen.getByRole('option', { name: /Вторая вкладка/ }),
    );
    expect(mock.select).toHaveBeenCalledWith({ mode: 'manual', tabId: 20 });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Отключить доступ' }),
    );
    expect(mock.disconnect).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows failures and offers a retry without enabling stale playback', () => {
    ready();
    mock.snapshot!.state.status = 'unavailable';
    mock.snapshot!.error = 'Связь с плеером прервана';
    render(<YandexMusicWidget config={widget} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Связь с плеером прервана',
    );
    expect(
      screen.getByRole('button', { name: 'Повторить подключение' }),
    ).toBeVisible();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('retains keyboard focus during pending commands without accepting repeated input', () => {
    ready();
    const view = render(<YandexMusicWidget config={widget} />);
    const volume = volumeSlider();
    volume.focus();
    mock.snapshot!.busy = true;
    view.rerender(<YandexMusicWidget config={widget} />);
    expect(volume).not.toBeDisabled();
    expect(volume).toHaveAttribute('aria-disabled', 'true');
    expect(volume).toHaveFocus();
    fireEvent.change(volume, { target: { value: '0.8' } });
    fireEvent.keyUp(volume, { key: 'ArrowRight' });
    expect(mock.command).not.toHaveBeenCalled();
    mock.snapshot!.busy = false;
    view.rerender(<YandexMusicWidget config={widget} />);
    fireEvent.change(volume, { target: { value: '0.51' } });
    fireEvent.keyUp(volume, { key: 'ArrowRight' });
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'volume',
      value: 0.51,
    });
    expect(volume).toHaveFocus();
  });
  it('hides the missing artist line and preserves the full track title', () => {
    ready();
    mock.snapshot!.state.player = player({ artist: '' });
    render(<YandexMusicWidget config={widget} />);
    expect(screen.queryByText('Исполнитель не указан')).not.toBeInTheDocument();
    expect(screen.getByText('Новый день')).toHaveAttribute(
      'title',
      'Новый день',
    );
  });

  it('saves the visual preference per instance without changing the common source', async () => {
    ready();
    const onChange = vi.fn();
    const view = render(
      <YandexMusicWidget config={widget} onChange={onChange} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Подключение Яндекс.Музыки' }),
    );
    const checkbox = screen.getByRole('checkbox', { name: /Волны на обложке/ });
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      ...widget,
      surfaceWaves: true,
    });
    expect(mock.select).not.toHaveBeenCalled();
    view.rerender(
      <YandexMusicWidget
        config={{ ...widget, surfaceWaves: true }}
        onChange={onChange}
      />,
    );
    expect(checkbox).toBeChecked();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      screen.getByRole('button', { name: 'Подключение Яндекс.Музыки' }),
    );
    expect(
      screen.getByRole('checkbox', { name: /Волны на обложке/ }),
    ).toBeChecked();
  });

  it('runs waves only during visible playback with an enabled preference and available artwork', () => {
    ready();
    const enabled = { ...widget, surfaceWaves: true };
    const view = render(<YandexMusicWidget config={widget} />);
    const waves = () => view.container.querySelector('.music-surface-waves');
    expect(waves()).toBeNull();
    view.rerender(<YandexMusicWidget config={enabled} />);
    expect(waves()).toHaveAttribute('aria-hidden', 'true');
    mock.snapshot!.state.player!.playing = false;
    view.rerender(<YandexMusicWidget config={enabled} />);
    expect(waves()).toHaveAttribute('data-active', 'false');
    const pausedWaves = waves();
    mock.snapshot!.state.player!.playing = true;
    view.rerender(<YandexMusicWidget config={enabled} />);
    expect(waves()).toBe(pausedWaves);
    expect(waves()).toHaveAttribute('data-active', 'true');
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(waves()).toBeNull();
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(waves()).not.toBeNull();
    visibility.mockRestore();
    view.rerender(
      <AnimationContext value="reduced">
        <YandexMusicWidget config={enabled} />
      </AnimationContext>,
    );
    expect(waves()).toBeNull();
    view.rerender(<YandexMusicWidget config={enabled} />);
    fireEvent.error(view.container.querySelector('img')!);
    expect(waves()).toBeNull();
  });

  it('changes composition at pixel aspect-ratio boundaries and stops waves offscreen', () => {
    ready();
    let resize: ResizeObserverCallback = () => undefined;
    let intersect: IntersectionObserverCallback = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          resize = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          intersect = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    try {
      const view = render(
        <YandexMusicWidget config={{ ...widget, surfaceWaves: true }} />,
      );
      const root = view.container.querySelector('.music-widget')!;
      const size = (width: number, height: number) =>
        act(() =>
          resize(
            [{ contentRect: { width, height } } as ResizeObserverEntry],
            {} as ResizeObserver,
          ),
        );
      size(250, 200);
      expect(root).toHaveAttribute('data-layout', 'square');
      size(251, 200);
      expect(root).toHaveAttribute('data-layout', 'wide');
      size(160, 200);
      expect(root).toHaveAttribute('data-layout', 'square');
      size(159, 200);
      expect(root).toHaveAttribute('data-layout', 'tall');
      act(() =>
        intersect(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
      expect(view.container.querySelector('.music-surface-waves')).toBeNull();
      act(() =>
        intersect(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
      expect(
        view.container.querySelector('.music-surface-waves'),
      ).not.toBeNull();
      view.unmount();
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
