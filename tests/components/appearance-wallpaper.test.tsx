import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppearanceDialog } from '../../components/dashboard/AppearanceDialog';
import type { AppearanceConfig } from '../../storage/schema';

const appearance: AppearanceConfig = {
  theme: 'system',
  backgroundColor: '#f4f4f5',
  wallpaper: { type: 'none' },
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AppearanceDialog>> = {},
) {
  const props: React.ComponentProps<typeof AppearanceDialog> = {
    appearance,
    isWallpaperUpdating: false,
    open: true,
    wallpaperError: null,
    wallpaperPreviewSrc: null,
    onAppearanceChange: vi.fn(),
    onClearWallpaperError: vi.fn(),
    onOpenChange: vi.fn(),
    onRemoveWallpaper: vi.fn().mockResolvedValue(undefined),
    onSetLocalWallpaper: vi.fn().mockResolvedValue(undefined),
    onSetUrlWallpaper: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return { ...render(<AppearanceDialog {...props} />), props };
}

describe('AppearanceDialog wallpaper controls', () => {
  it('accepts all supported local image formats and submits the selected file', async () => {
    const user = userEvent.setup();
    const onSetLocalWallpaper = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSetLocalWallpaper });

    const input = screen.getByLabelText('Локальное изображение');
    expect(input).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg',
    );

    const file = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"/>'],
      'wall.svg',
      {
        type: 'image/svg+xml',
      },
    );
    await user.upload(input, file);

    expect(onSetLocalWallpaper).toHaveBeenCalledWith(
      file,
      expect.any(AbortSignal),
    );
  });

  it('submits a remote URL only after an explicit button click', async () => {
    const user = userEvent.setup();
    const onSetUrlWallpaper = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSetUrlWallpaper });

    const input = screen.getByLabelText('Ссылка на изображение');
    await user.type(input, 'https://example.com/wallpaper.jpg');
    expect(onSetUrlWallpaper).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Установить по ссылке' }),
    );

    expect(onSetUrlWallpaper).toHaveBeenCalledWith(
      'https://example.com/wallpaper.jpg',
      expect.any(AbortSignal),
    );
  });

  it('shows a preview, reports errors, and can remove current wallpaper', async () => {
    const user = userEvent.setup();
    const onRemoveWallpaper = vi.fn().mockResolvedValue(undefined);
    renderDialog({
      appearance: {
        ...appearance,
        wallpaper: {
          type: 'url',
          url: 'https://example.com/wallpaper.jpg',
        },
      },
      wallpaperError: 'Изображение не загрузилось',
      wallpaperPreviewSrc: 'https://example.com/wallpaper.jpg',
      onRemoveWallpaper,
    });

    expect(screen.getByTestId('wallpaper-preview')).toHaveAttribute(
      'src',
      'https://example.com/wallpaper.jpg',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Изображение не загрузилось',
    );

    await user.click(screen.getByRole('button', { name: 'Удалить обои' }));
    expect(onRemoveWallpaper).toHaveBeenCalledOnce();
  });

  it('disables conflicting actions while an image is being checked', () => {
    renderDialog({ isWallpaperUpdating: true });

    expect(screen.getByLabelText('Локальное изображение')).toBeDisabled();
    expect(screen.getByLabelText('Ссылка на изображение')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Установить по ссылке' }),
    ).toBeDisabled();
    expect(screen.getByText('Проверяем изображение…')).toBeVisible();
  });

  it('aborts an in-flight validation when the dialog closes', async () => {
    const user = userEvent.setup();
    let receivedSignal: AbortSignal | undefined;
    const onSetUrlWallpaper = vi.fn((_url: string, signal?: AbortSignal) => {
      receivedSignal = signal;
      return new Promise<void>(() => undefined);
    });
    const { props } = renderDialog({ onSetUrlWallpaper });

    await user.type(
      screen.getByLabelText('Ссылка на изображение'),
      'https://example.com/wallpaper.jpg',
    );
    await user.click(
      screen.getByRole('button', { name: 'Установить по ссылке' }),
    );
    expect(receivedSignal?.aborted).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));

    await waitFor(() => expect(receivedSignal?.aborted).toBe(true));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
