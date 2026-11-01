import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppearanceDialog } from '../../components/dashboard/AppearanceDialog';
import type { AppearanceConfig } from '../../storage/schema';

const appearance: AppearanceConfig = {
  theme: { type: 'builtin', id: 'system' },
  backgroundColor: { type: 'custom', color: '#f4f4f5' },
  wallpaper: { type: 'none' },
  liquidGlass: {
    enabled: true,
    transparency: 40,
    blur: 18,
    shadow: 50,
  },
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AppearanceDialog>> = {},
) {
  const props: React.ComponentProps<typeof AppearanceDialog> = {
    appearance,
    toolbar: { mode: 'top-right' },
    onToolbarChange: vi.fn(),
    isWallpaperUpdating: false,
    open: true,
    wallpaperError: null,
    wallpaperPreviewSrc: null,
    onAppearanceChange: vi.fn(),
    onAppearancePreview: vi.fn(),
    onClearWallpaperError: vi.fn(),
    onFlushAppearancePreview: vi.fn(),
    onOpenChange: vi.fn(),
    onRemoveWallpaper: vi.fn().mockResolvedValue(undefined),
    onSetWallpaperEnabled: vi.fn().mockResolvedValue(undefined),
    onSetLocalWallpaper: vi.fn().mockResolvedValue(undefined),
    onSetUrlWallpaper: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return { ...render(<AppearanceDialog {...props} />), props };
}

describe('AppearanceDialog wallpaper controls', () => {
  it('keeps rounding available without Liquid Glass and commits on pointer, keyboard, and blur', async () => {
    const { props } = renderDialog({
      appearance: {
        ...appearance,
        liquidGlass: { ...appearance.liquidGlass, enabled: false },
      },
    });
    const radius = screen.getByRole('slider', { name: 'Скругление углов' });
    expect(radius).toBeEnabled();
    expect(radius).toHaveValue('12');
    expect(radius).toHaveAttribute('min', '0');
    expect(radius).toHaveAttribute('max', '40');
    expect(
      screen.getByRole('button', { name: 'Сбросить скругление' }),
    ).toBeDisabled();
    fireEvent.change(radius, { target: { value: '0' } });
    expect(props.onAppearancePreview).toHaveBeenLastCalledWith({
      widgetBorderRadius: 0,
    });
    expect(props.onAppearanceChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(radius);
    fireEvent.keyUp(radius, { key: 'ArrowRight' });
    fireEvent.blur(radius);
    expect(props.onFlushAppearancePreview).toHaveBeenCalledTimes(3);
  });

  it('separates global settings and supports keyboard tab navigation', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();
    const appearanceTab = screen.getByRole('tab', { name: 'Оформление' });
    expect(screen.getByRole('heading', { name: 'Карточки' })).toBeVisible();
    expect(
      screen.queryByRole('combobox', { name: 'Расположение и видимость' }),
    ).not.toBeInTheDocument();
    appearanceTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Интерфейс' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Интерфейс' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByText('Настройка применяется ко всем рабочим пространствам.'),
    ).toBeVisible();
    expect(props.onAppearanceChange).not.toHaveBeenCalled();
    await user.keyboard('{Home}');
    expect(appearanceTab).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Карточки' })).toBeVisible();
  });

  it('hides glass controls when the effect is disabled', () => {
    renderDialog({
      appearance: {
        ...appearance,
        liquidGlass: { ...appearance.liquidGlass, enabled: false },
      },
    });
    expect(
      screen.queryByRole('button', { name: 'Настроить эффект' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: 'Скругление углов' }),
    ).toBeEnabled();
  });

  it('starts with advanced settings collapsed', () => {
    const { container } = renderDialog();

    expect(
      container.querySelectorAll('[aria-expanded][aria-controls]'),
    ).not.toHaveLength(0);
    expect(
      [...container.querySelectorAll('[aria-expanded][aria-controls]')].every(
        (section) => section.getAttribute('aria-expanded') === 'false',
      ),
    ).toBe(true);
  });

  it('collapses opened sections before the dialog is opened again', async () => {
    const user = userEvent.setup();
    const { container, props, rerender } = renderDialog();
    const themeSection = screen.getByText('Выбрать тему', {
      selector: 'button',
    });

    await user.click(screen.getByText('Выбрать тему', { selector: 'button' }));
    expect(themeSection).toHaveAttribute('aria-expanded', 'true');

    rerender(<AppearanceDialog {...props} open={false} />);
    await waitFor(() =>
      expect(themeSection).toHaveAttribute('aria-expanded', 'false'),
    );
    rerender(<AppearanceDialog {...props} open />);

    expect(
      [...container.querySelectorAll('[aria-expanded][aria-controls]')].every(
        (section) => section.getAttribute('aria-expanded') === 'false',
      ),
    ).toBe(true);
  });

  it('shows card settings immediately and toggles glass', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();
    expect(screen.getByRole('heading', { name: 'Карточки' })).toBeVisible();

    const glassSwitch = screen.getByRole('switch', {
      name: 'Эффект стекла',
    });
    expect(glassSwitch).toBeChecked();

    await user.click(glassSwitch);
    expect(props.onAppearanceChange).toHaveBeenCalledWith({
      liquidGlass: {
        enabled: false,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    });
  });

  it('previews Liquid Glass controls and commits them after interaction', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));

    const transparency = screen.getByRole('slider', {
      name: 'Прозрачность',
    });
    const blur = screen.getByRole('slider', { name: 'Размытие' });
    const shadow = screen.getByRole('slider', { name: 'Тень' });

    expect(transparency).toHaveAttribute('min', '0');
    expect(transparency).toHaveAttribute('max', '100');
    expect(transparency).toHaveValue('40');
    expect(blur).toHaveAttribute('max', '40');
    expect(blur).toHaveValue('18');
    expect(shadow).toHaveValue('50');
    await waitFor(() => expect(screen.getByText('40%')).toBeVisible());
    expect(screen.getByText('18 px')).toBeVisible();
    expect(screen.getByText('50%')).toBeVisible();

    fireEvent.change(transparency, { target: { value: '70' } });
    expect(props.onAppearancePreview).toHaveBeenLastCalledWith({
      liquidGlass: {
        enabled: true,
        transparency: 70,
        blur: 18,
        shadow: 50,
      },
    });

    fireEvent.pointerUp(transparency);
    expect(props.onFlushAppearancePreview).toHaveBeenCalledOnce();
  });

  it('resets only the Liquid Glass parameters while preserving the toggle', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog({
      appearance: {
        ...appearance,
        liquidGlass: {
          enabled: true,
          transparency: 70,
          blur: 8,
          shadow: 90,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));

    expect(screen.getByRole('slider', { name: 'Прозрачность' })).toBeEnabled();
    expect(screen.getByRole('slider', { name: 'Размытие' })).toBeEnabled();
    expect(screen.getByRole('slider', { name: 'Тень' })).toBeEnabled();

    await user.click(
      screen.getByRole('button', { name: 'Вернуть стандартные параметры' }),
    );

    expect(props.onAppearanceChange).toHaveBeenCalledWith({
      liquidGlass: {
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    });
  });

  it('flushes a Liquid Glass preview before closing the dialog', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(props.onFlushAppearancePreview).toHaveBeenCalledOnce();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    const flushOrder =
      vi.mocked(props.onFlushAppearancePreview).mock.invocationCallOrder[0] ??
      Number.POSITIVE_INFINITY;
    const closeOrder =
      vi.mocked(props.onOpenChange).mock.invocationCallOrder[0] ?? 0;
    expect(flushOrder).toBeLessThan(closeOrder);
  });

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

    await user.click(
      screen.getByText('Использовать ссылку', { selector: 'button' }),
    );

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

  it('disables conflicting actions while an image is being checked', async () => {
    const user = userEvent.setup();
    renderDialog({ isWallpaperUpdating: true });

    await user.click(
      screen.getByText('Использовать ссылку', { selector: 'button' }),
    );

    expect(screen.getByLabelText('Локальное изображение')).toBeDisabled();
    expect(screen.getByLabelText('Ссылка на изображение')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Установить по ссылке' }),
    ).toBeDisabled();
    expect(await screen.findByText('Проверяем изображение…')).toBeVisible();
  });

  it('aborts an in-flight validation when the dialog closes', async () => {
    const user = userEvent.setup();
    let receivedSignal: AbortSignal | undefined;
    const onSetUrlWallpaper = vi.fn((_url: string, signal?: AbortSignal) => {
      receivedSignal = signal;
      return new Promise<void>(() => undefined);
    });
    const { props } = renderDialog({ onSetUrlWallpaper });

    await user.click(
      screen.getByText('Использовать ссылку', { selector: 'button' }),
    );

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

    await waitFor(() =>
      expect(screen.getByText('Локальные обои установлены')).toBeVisible(),
    );
    expect(screen.getByRole('button', { name: 'Заменить файл' })).toBeVisible();
    expect(screen.getByLabelText('Локальное изображение')).toHaveClass(
      'sr-only',
    );
    expect(screen.queryByText(/файл не выбран/i)).not.toBeInTheDocument();
  });

  it('renders toggle switch for active wallpaper and handles toggle', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog({
      appearance: {
        ...appearance,
        wallpaper: {
          type: 'url',
          url: 'https://example.com/wallpaper.jpg',
          enabled: true,
        },
      },
      wallpaperPreviewSrc: 'https://example.com/wallpaper.jpg',
    });

    const toggle = screen.getByRole('switch', { name: 'Показывать обои' });
    await waitFor(() => expect(toggle).toBeVisible());
    expect(toggle).toBeChecked();

    await user.click(toggle);
    expect(props.onSetWallpaperEnabled).toHaveBeenCalledWith(false);
  });

  it('displays disabled badge and dimmed opacity when wallpaper is disabled', async () => {
    renderDialog({
      appearance: {
        ...appearance,
        wallpaper: {
          type: 'local',
          assetId: '8dc04e26-6465-4e84-bc05-633c0e28415b',
          enabled: false,
        },
      },
      wallpaperPreviewSrc: 'blob:wallpaper',
    });

    const toggle = screen.getByRole('switch', { name: 'Показывать обои' });
    await waitFor(() => expect(toggle).toBeVisible());
    expect(toggle).not.toBeChecked();

    await waitFor(() => expect(screen.getByText('Отключено')).toBeVisible());
    expect(screen.getByTestId('wallpaper-preview').parentElement).toHaveClass(
      'opacity-60',
    );
  });

  it('does not display toggle switch when wallpaper is none', async () => {
    renderDialog({
      appearance: {
        ...appearance,
        wallpaper: { type: 'none' },
      },
    });

    expect(
      screen.queryByRole('switch', { name: 'Показывать обои' }),
    ).not.toBeInTheDocument();
  });
});
