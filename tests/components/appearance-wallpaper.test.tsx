import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppearanceDialog } from '../../components/dashboard/AppearanceDialog';
import type { AppearanceConfig } from '../../storage/schema';

const appearance: AppearanceConfig = {
  theme: 'system',
  backgroundColor: '#f4f4f5',
  wallpaper: { type: 'none' },
  liquidGlassEnabled: true,
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
  it('starts with every appearance section collapsed', () => {
    const { container } = renderDialog();

    expect(container.querySelectorAll('details')).not.toHaveLength(0);
    expect(
      [...container.querySelectorAll('details')].every(
        (section) => !section.open,
      ),
    ).toBe(true);
  });

  it('collapses opened sections before the dialog is opened again', async () => {
    const user = userEvent.setup();
    const { container, props, rerender } = renderDialog();
    const themeSection = screen
      .getByText('Тема', { selector: 'summary' })
      .closest('details');

    await user.click(screen.getByText('Тема', { selector: 'summary' }));
    expect(themeSection).toHaveAttribute('open');

    rerender(<AppearanceDialog {...props} open={false} />);
    await waitFor(() => expect(themeSection).not.toHaveAttribute('open'));
    rerender(<AppearanceDialog {...props} open />);

    expect(
      [...container.querySelectorAll('details')].every(
        (section) => !section.open,
      ),
    ).toBe(true);
  });

  it('accepts all supported local image formats and submits the selected file', async () => {
    const user = userEvent.setup();
    const onSetLocalWallpaper = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSetLocalWallpaper });

    await user.click(screen.getByText('Обои', { selector: 'summary' }));
    await user.click(
      screen.getByText('Локальное изображение', { selector: 'summary' }),
    );

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

    await user.click(screen.getByText('Обои', { selector: 'summary' }));
    await user.click(screen.getByText('По ссылке', { selector: 'summary' }));

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

    await user.click(screen.getByText('Обои', { selector: 'summary' }));

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

  it('disables conflicting actions while an image is being checked', async () => {
    const user = userEvent.setup();
    renderDialog({ isWallpaperUpdating: true });

    await user.click(screen.getByText('Обои', { selector: 'summary' }));

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

    await user.click(screen.getByText('Обои', { selector: 'summary' }));
    await user.click(screen.getByText('По ссылке', { selector: 'summary' }));

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

  it('shows persisted local wallpaper status instead of a native empty filename', async () => {
    const user = userEvent.setup();
    renderDialog({
      appearance: {
        ...appearance,
        wallpaper: {
          type: 'local',
          assetId: '8dc04e26-6465-4e84-bc05-633c0e28415b',
        },
      },
      wallpaperPreviewSrc: 'blob:wallpaper',
    });

    await user.click(screen.getByText('Обои', { selector: 'summary' }));
    await user.click(
      screen.getByText('Локальное изображение', { selector: 'summary' }),
    );

    expect(screen.getByText('Локальные обои установлены')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Заменить файл' })).toBeVisible();
    expect(screen.getByLabelText('Локальное изображение')).toHaveClass(
      'sr-only',
    );
    expect(screen.queryByText(/файл не выбран/i)).not.toBeInTheDocument();
  });
});
