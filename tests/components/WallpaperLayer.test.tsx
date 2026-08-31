import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WallpaperLayer } from '../../components/dashboard/WallpaperLayer';

describe('WallpaperLayer', () => {
  it('does not render an image without a source', () => {
    const { container } = render(<WallpaperLayer src={null} />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('renders a decorative fixed cover image with privacy attributes', () => {
    const onLoadError = vi.fn();
    const onLoad = vi.fn();
    const { container } = render(
      <WallpaperLayer
        src="https://example.com/wallpaper.svg"
        onLoad={onLoad}
        onLoadError={onLoadError}
      />,
    );
    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('aria-hidden', 'true');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(image).toHaveAttribute('draggable', 'false');
    expect(image).toHaveClass(
      'pointer-events-none',
      'fixed',
      'inset-0',
      'size-full',
      'object-cover',
      'object-center',
      'z-0',
    );

    fireEvent.load(image!);
    fireEvent.error(image!);

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoadError).toHaveBeenCalledOnce();
  });
});
