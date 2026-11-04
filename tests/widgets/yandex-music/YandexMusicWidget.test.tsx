import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MusicClientSnapshot } from '../../../widgets/yandex-music/client';
import { emptyMusicState } from '../../../widgets/yandex-music/types';
import { player } from './fixtures';

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
  function ready() {
    mock.snapshot!.state = {
      ...emptyMusicState('ready'),
      player: player(),
      sourceId: 10,
      sources: [{ id: 10, label: 'Музыка', playing: true }],
    };
  }

  it('requests access only on explicit connection', async () => {
    render(<YandexMusicWidget />);
    expect(mock.connect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Подключить' }));
    expect(mock.connect).toHaveBeenCalledOnce();
    expect(mock.open).not.toHaveBeenCalled();
  });

  it('offers a link in web mode without playback or permission controls', () => {
    mock.snapshot!.state = emptyMusicState('unsupported');
    render(<YandexMusicWidget />);
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
      render(<YandexMusicWidget />);
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
    render(<YandexMusicWidget />);
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

  it('commits ranges once on completion, including blur, and cancels a pointer draft', () => {
    ready();
    render(<YandexMusicWidget />);
    const seek = screen.getByRole('slider', { name: 'Позиция трека' });
    fireEvent.change(seek, { target: { value: '70' } });
    expect(mock.command).not.toHaveBeenCalled();
    fireEvent.pointerUp(seek);
    fireEvent.blur(seek);
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'seek',
      value: 70,
    });
    const volume = screen.getByRole('slider', { name: 'Громкость' });
    fireEvent.change(volume, { target: { value: '0.3' } });
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

  it('disables unavailable controls with an explanation and falls back for failed artwork', () => {
    ready();
    mock.snapshot!.state.player!.capabilities.seek = false;
    render(<YandexMusicWidget />);
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
    render(<YandexMusicWidget />);
    const trigger = screen.getByRole('button', {
      name: 'Подключение Яндекс.Музыки',
    });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', {
      name: 'Подключение Яндекс.Музыки',
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
    render(<YandexMusicWidget />);
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
    const view = render(<YandexMusicWidget />);
    const volume = screen.getByRole('slider', { name: 'Громкость' });
    volume.focus();
    mock.snapshot!.busy = true;
    view.rerender(<YandexMusicWidget />);
    expect(volume).not.toBeDisabled();
    expect(volume).toHaveAttribute('aria-disabled', 'true');
    expect(volume).toHaveFocus();
    fireEvent.change(volume, { target: { value: '0.8' } });
    fireEvent.keyUp(volume, { key: 'ArrowRight' });
    expect(mock.command).not.toHaveBeenCalled();
    mock.snapshot!.busy = false;
    view.rerender(<YandexMusicWidget />);
    fireEvent.change(volume, { target: { value: '0.51' } });
    fireEvent.keyUp(volume, { key: 'ArrowRight' });
    expect(mock.command).toHaveBeenCalledExactlyOnceWith({
      type: 'volume',
      value: 0.51,
    });
    expect(volume).toHaveFocus();
  });
});
