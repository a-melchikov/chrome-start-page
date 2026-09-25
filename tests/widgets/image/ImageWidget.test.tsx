import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { saveImageAsset } from '../../../storage/image-assets';
import { createDefaultImageWidget } from '../../../widgets/image/defaults';
import { ImageWidget } from '../../../widgets/image/ImageWidget';
import type { ImageWidgetConfig } from '../../../widgets/image/types';

const LOCAL_ASSET_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';

const baseConfig: ImageWidgetConfig = {
  id: 'img-widget-1',
  type: 'image',
  source: { type: 'none' },
  objectPosition: 'center',
  layout: { x: 0, y: 0, w: 4, h: 4 },
};

describe('ImageWidget', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('creates an image widget with default 4×4 layout, fitMode cover, and none source', () => {
    const created = createDefaultImageWidget('image-test', 0);
    expect(created).toEqual({
      id: 'image-test',
      type: 'image',
      source: { type: 'none' },
      objectPosition: 'center',
      fitMode: 'cover',
      zoom: 1,
      layout: { x: 0, y: 0, w: 4, h: 4 },
    });
  });

  it('renders an empty placeholder state when source is none', () => {
    render(<ImageWidget config={baseConfig} />);

    expect(screen.getByText('Выберите изображение')).toBeInTheDocument();
    expect(screen.queryByTestId('image-widget-img')).toBeNull();
  });

  it('renders a remote URL image with specified objectPosition and decorative alt', () => {
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/photo.webp' },
      objectPosition: 'top-left',
    };

    render(<ImageWidget config={config} />);

    const img = screen.getByTestId('image-widget-img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.webp');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveClass('object-cover');
    expect(img).toHaveStyle({ objectPosition: 'top-left' });
  });

  it('renders with fitMode contain when configured', () => {
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/photo.webp' },
      fitMode: 'contain',
    };

    render(<ImageWidget config={config} />);

    const img = screen.getByTestId('image-widget-img');
    expect(img).toHaveClass('object-contain');
  });

  it('applies scale transform when zoom is greater than 1', () => {
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/photo.webp' },
      fitMode: 'cover',
      zoom: 1.5,
      objectPosition: '30% 70%',
    };

    render(<ImageWidget config={config} />);

    const img = screen.getByTestId('image-widget-img');
    expect(img).toHaveStyle({
      transform: 'scale(1.5)',
      objectPosition: '30% 70%',
    });
  });

  it('renders a local image asset via useImageSource', async () => {
    await saveImageAsset({
      version: 1,
      assetId: LOCAL_ASSET_ID,
      mimeType: 'image/png',
      encoding: 'base64',
      originalByteLength: 4,
      storedByteLength: 4,
      data: 'AQIDBA==',
    });

    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'local', assetId: LOCAL_ASSET_ID },
      objectPosition: 'center',
    };

    render(<ImageWidget config={config} />);

    const img = await screen.findByTestId('image-widget-img');
    expect(img).toHaveAttribute('src', 'blob:mock-url');
    expect(img).toHaveClass('object-cover');
  });

  it('shows error placeholder when local asset cannot be found', async () => {
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'local', assetId: LOCAL_ASSET_ID },
    };

    render(<ImageWidget config={config} />);

    expect(
      await screen.findByText('Локальное изображение не найдено'),
    ).toBeInTheDocument();
  });

  it('supports GIF pause and play on click and keyboard without indicator overlays', async () => {
    const user = userEvent.setup();
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/cat.gif' },
      objectPosition: 'center',
    };

    // Mock drawImage on canvas context
    const drawImageSpy = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: drawImageSpy,
    } as unknown as CanvasRenderingContext2D);

    render(<ImageWidget config={config} />);

    const button = screen.getByRole('button', {
      name: 'Приостановить GIF анимацию',
    });
    expect(button).toBeInTheDocument();

    const img = screen.getByTestId('image-widget-img');
    expect(img).not.toHaveClass('hidden');

    // Click to pause
    await user.click(button);

    expect(drawImageSpy).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Воспроизвести GIF анимацию' }),
    ).toBeInTheDocument();
    expect(img).toHaveClass('hidden');

    // Click to resume
    await user.click(button);
    expect(
      screen.getByRole('button', { name: 'Приостановить GIF анимацию' }),
    ).toBeInTheDocument();
    expect(img).not.toHaveClass('hidden');

    // Space key to toggle pause
    fireEvent.keyDown(button, { key: ' ' });
    expect(
      screen.getByRole('button', { name: 'Воспроизвести GIF анимацию' }),
    ).toBeInTheDocument();

    // Enter key to resume
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(
      screen.getByRole('button', { name: 'Приостановить GIF анимацию' }),
    ).toBeInTheDocument();
  });

  it('does not toggle pause when clicking a non-GIF image', async () => {
    const user = userEvent.setup();
    const config: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/photo.png' },
      objectPosition: 'center',
    };

    render(<ImageWidget config={config} />);

    expect(screen.queryByRole('button')).toBeNull();
    const img = screen.getByTestId('image-widget-img');
    await user.click(img);
    expect(img).not.toHaveClass('hidden');
  });
});
