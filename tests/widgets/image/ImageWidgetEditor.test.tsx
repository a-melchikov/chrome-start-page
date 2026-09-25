import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { ImageWidgetEditor } from '../../../widgets/image/ImageWidgetEditor';
import type { ImageWidgetConfig } from '../../../widgets/image/types';

class FakeImage {
  decoding: 'async' | 'auto' | 'sync' = 'auto';
  naturalWidth = 1920;
  naturalHeight = 1080;
  onerror: OnErrorEventHandler | null = null;
  onload: ((this: GlobalEventHandlers, event: Event) => unknown) | null = null;
  referrerPolicy = '';
  private source = '';

  get src() {
    return this.source;
  }

  set src(value: string) {
    this.source = value;
    if (value) {
      queueMicrotask(() =>
        this.onload?.call(
          this as unknown as GlobalEventHandlers,
          new Event('load'),
        ),
      );
    }
  }

  async decode() {
    return Promise.resolve();
  }
}

const baseConfig: ImageWidgetConfig = {
  id: 'img-editor-test',
  type: 'image',
  source: { type: 'none' },
  objectPosition: 'center',
  layout: { x: 0, y: 0, w: 4, h: 4 },
};

describe('ImageWidgetEditor', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:editor-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('switches between File and URL source tabs', async () => {
    const user = userEvent.setup();
    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={vi.fn()}
        onRequestFinish={vi.fn()}
      />,
    );

    expect(screen.getByText('Выбрать файл')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('https://example.com/image.jpg'),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: 'По ссылке' }));

    expect(
      screen.getByPlaceholderText('https://example.com/image.jpg'),
    ).toBeInTheDocument();
  });

  it('submits a valid HTTPS URL and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'По ссылке' }));
    const input = screen.getByPlaceholderText('https://example.com/image.jpg');
    await user.type(input, 'https://example.com/photo.jpg');

    await user.click(screen.getByRole('button', { name: 'Применить' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { type: 'url', url: 'https://example.com/photo.jpg' },
        }),
      );
    });
  });

  it('rejects an insecure HTTP URL with an error message', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'По ссылке' }));
    const input = screen.getByPlaceholderText('https://example.com/image.jpg');
    await user.type(input, 'http://insecure.com/pic.png');

    await user.click(screen.getByRole('button', { name: 'Применить' }));

    expect(
      await screen.findByText('Разрешены только HTTPS-ссылки'),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects SVG files when uploading a local file', async () => {
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('Выбрать изображение');
    const svgFile = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      'pic.svg',
      {
        type: 'image/svg+xml',
      },
    );

    fireEvent.change(fileInput, { target: { files: [svgFile] } });

    expect(
      await screen.findByText('Формат SVG не поддерживается'),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uploads a valid PNG file and saves it to storage', async () => {
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('Выбрать изображение');
    // Minimal PNG header bytes
    const pngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0,
    ]);
    const pngFile = new File([pngBytes], 'valid.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            type: 'local',
            assetId: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            ),
          }),
        }),
      );
    });
  });

  it('uploads a valid PNG file containing embedded vector metadata without false-positive error', async () => {
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('Выбрать изображение');
    const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
    const embeddedSvgText =
      '   image/svg+xml   <svg width="100" height="100"></svg>';
    const textBytes = Array.from(new TextEncoder().encode(embeddedSvgText));
    const combinedBytes = new Uint8Array([...pngHeader, ...textBytes]);
    const pngFile = new File([combinedBytes], 'photo.png', {
      type: 'image/png',
    });

    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            type: 'local',
          }),
        }),
      );
    });
  });

  it('uploads a PNG file declared as image/x-png or application/octet-stream', async () => {
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('Выбрать изображение');
    expect(fileInput).toHaveAttribute(
      'accept',
      expect.stringContaining('.png'),
    );

    const pngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0,
    ]);
    const xPngFile = new File([pngBytes], 'screenshot.png', {
      type: 'image/x-png',
    });

    fireEvent.change(fileInput, { target: { files: [xPngFile] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({ type: 'local' }),
        }),
      );
    });
  });

  it('updates objectPosition via 3×3 grid picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const configWithImage: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/pic.webp' },
      objectPosition: 'center',
    };

    render(
      <ImageWidgetEditor
        config={configWithImage}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const topLeftButton = screen.getByRole('radio', {
      name: 'Сверху слева',
    });
    await user.click(topLeftButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ objectPosition: 'top-left' }),
    );
  });

  it('does not render altText input field', () => {
    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={vi.fn()}
        onRequestFinish={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Описание изображения (alt)')).toBeNull();
  });

  it('updates width and height using size controls', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const incWidthBtn = screen.getByRole('button', {
      name: 'Увеличить ширину',
    });
    await user.click(incWidthBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ w: 5, h: 4 }),
      }),
    );

    const decHeightBtn = screen.getByRole('button', {
      name: 'Уменьшить высоту',
    });
    await user.click(decHeightBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ w: 4, h: 3 }),
      }),
    );
  });

  it('applies quick ratio preset 1:1 and 16:9', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '1:1' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          w: expect.any(Number),
          h: expect.any(Number),
        }),
      }),
    );

    await user.click(screen.getByRole('button', { name: '16:9' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          w: expect.any(Number),
          h: expect.any(Number),
        }),
      }),
    );
  });

  it('toggles fit mode between cover and contain', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const configWithImage: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/pic.webp' },
      fitMode: 'cover',
    };

    render(
      <ImageWidgetEditor
        config={configWithImage}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Вписать целиком' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fitMode: 'contain' }),
    );
  });

  it('updates zoom via range slider', () => {
    const onChange = vi.fn();
    const configWithImage: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/pic.webp' },
      fitMode: 'cover',
      zoom: 1,
    };

    render(
      <ImageWidgetEditor
        config={configWithImage}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    const zoomSlider = screen.getByLabelText('Масштаб изображения');
    fireEvent.change(zoomSlider, { target: { value: '1.75' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 1.75 }),
    );
  });

  it('clears the image when clicking delete/clear button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const configWithImage: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/pic.webp' },
    };

    render(
      <ImageWidgetEditor
        config={configWithImage}
        onChange={onChange}
        onRequestFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: { type: 'none' } }),
    );
  });

  it('calls onRequestFinish when clicking done button', async () => {
    const user = userEvent.setup();
    const onRequestFinish = vi.fn();

    render(
      <ImageWidgetEditor
        config={baseConfig}
        onChange={vi.fn()}
        onRequestFinish={onRequestFinish}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(onRequestFinish).toHaveBeenCalledTimes(1);
  });

  it('stops pointer and mouse event propagation on preview canvas to avoid dragging dashboard widget', () => {
    const configWithImage: ImageWidgetConfig = {
      ...baseConfig,
      source: { type: 'url', url: 'https://example.com/pic.webp' },
      fitMode: 'cover',
    };

    render(
      <ImageWidgetEditor
        config={configWithImage}
        onChange={vi.fn()}
        onRequestFinish={vi.fn()}
      />,
    );

    const preview = screen.getByLabelText(
      'Предпросмотр кадрирования изображения',
    );
    expect(preview).toHaveAttribute('data-no-drag', 'true');

    const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true });
    const pointerSpy = vi.spyOn(pointerDownEvent, 'stopPropagation');
    preview.dispatchEvent(pointerDownEvent);
    expect(pointerSpy).toHaveBeenCalled();

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const mouseSpy = vi.spyOn(mouseDownEvent, 'stopPropagation');
    preview.dispatchEvent(mouseDownEvent);
    expect(mouseSpy).toHaveBeenCalled();
  });
});
