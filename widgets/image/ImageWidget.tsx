import { type KeyboardEvent, useRef, useState } from 'react';

import { PhotoIcon } from '../../components/icons';
import { classNames } from '../../components/ui/class-names';
import { useImageSource } from '../../hooks/use-image-source';
import type { ImageWidgetConfig } from './types';

interface ImageWidgetProps {
  config: ImageWidgetConfig;
}

export function ImageWidget({ config }: ImageWidgetProps) {
  const { src, mimeType, error, isLoading } = useImageSource(config.source);
  const [isPaused, setIsPaused] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isGif =
    mimeType === 'image/gif' ||
    (config.source.type === 'url' && /\.gif($|\?)/i.test(config.source.url));

  const toggleGifPause = () => {
    if (!isGif || !imgRef.current || !canvasRef.current) {
      return;
    }

    if (!isPaused) {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      const width = img.naturalWidth || img.clientWidth || 300;
      const height = img.naturalHeight || img.clientHeight || 300;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(img, 0, 0, width, height);
          setIsPaused(true);
        } catch {
          // If canvas is tainted or cannot be drawn, keep playing
        }
      }
    } else {
      setIsPaused(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isGif && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleGifPause();
    }
  };

  if (isLoading) {
    return (
      <div className="widget-card-surface liquid-glass-surface flex h-full w-full flex-col items-center justify-center rounded-xl p-6 text-center">
        <div className="flex size-14 animate-pulse items-center justify-center rounded-full border border-theme-border bg-theme-surface-elevated text-theme-text-muted/60 shadow-xs">
          <PhotoIcon className="size-7" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-theme-danger-border bg-theme-danger-bg p-4 text-center text-theme-danger-text backdrop-blur-md">
        <div className="flex size-10 items-center justify-center rounded-full border border-theme-danger-border bg-theme-danger-hover-bg text-theme-danger">
          <PhotoIcon className="size-5" />
        </div>
        <span className="line-clamp-2 max-w-xs text-xs">{error}</span>
      </div>
    );
  }

  if (!src || config.source.type === 'none') {
    return (
      <div className="widget-card-surface liquid-glass-surface group relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center transition-[border-color,box-shadow] duration-150 hover:border-theme-accent/60 hover:shadow-lg">
        <div className="flex size-14 items-center justify-center rounded-full border border-theme-border bg-theme-surface-elevated text-theme-accent shadow-xs transition-[transform,border-color,background-color,box-shadow] duration-150 group-hover:scale-110 group-hover:border-theme-accent group-hover:bg-theme-accent/15 group-hover:shadow-md">
          <PhotoIcon className="size-7 transition-transform duration-150 group-hover:scale-105" />
        </div>
        <span className="mt-3 text-sm font-semibold text-theme-text-primary transition-colors duration-200 group-hover:text-theme-accent">
          Выберите изображение
        </span>
        <span className="mt-1 text-xs text-theme-text-muted transition-colors duration-200 group-hover:text-theme-text-secondary">
          Нажмите, чтобы настроить
        </span>
      </div>
    );
  }

  const fitMode = config.fitMode ?? 'cover';
  const objectFitClass =
    fitMode === 'contain' ? 'object-contain' : 'object-cover';
  const zoom = config.zoom && config.zoom > 1 ? config.zoom : undefined;
  const imageStyle = {
    objectPosition: config.objectPosition,
    transform: zoom ? `scale(${zoom})` : undefined,
    transformOrigin: config.objectPosition,
  };

  return (
    <div
      aria-label={
        isGif
          ? isPaused
            ? 'Воспроизвести GIF анимацию'
            : 'Приостановить GIF анимацию'
          : undefined
      }
      className={classNames(
        'relative h-full w-full overflow-hidden rounded-xl',
        isGif &&
          'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-ring',
      )}
      role={isGif ? 'button' : undefined}
      tabIndex={isGif ? 0 : undefined}
      onClick={isGif ? toggleGifPause : undefined}
      onKeyDown={isGif ? handleKeyDown : undefined}
    >
      {isGif ? (
        <canvas
          ref={canvasRef}
          aria-hidden={!isPaused}
          className={classNames(
            'h-full w-full',
            objectFitClass,
            !isPaused && 'hidden',
          )}
          style={imageStyle}
        />
      ) : null}
      <img
        ref={imgRef}
        alt=""
        aria-hidden={isGif && isPaused}
        className={classNames(
          'h-full w-full',
          objectFitClass,
          isGif && isPaused && 'hidden',
        )}
        data-testid="image-widget-img"
        draggable={false}
        referrerPolicy="no-referrer"
        src={src}
        style={imageStyle}
      />
    </div>
  );
}
