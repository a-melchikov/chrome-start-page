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
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-theme-border/40 bg-theme-surface/30 backdrop-blur-md">
        <div className="flex size-12 animate-pulse items-center justify-center rounded-full border border-theme-border/50 bg-theme-surface/60 text-theme-text-muted/50">
          <PhotoIcon className="size-6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-400 backdrop-blur-md">
        <div className="flex size-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20 text-red-400">
          <PhotoIcon className="size-5" />
        </div>
        <span className="line-clamp-2 max-w-xs">{error}</span>
      </div>
    );
  }

  if (!src || config.source.type === 'none') {
    return (
      <div className="group relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-xl border border-theme-border/70 bg-theme-surface/40 p-4 text-center shadow-xs backdrop-blur-md transition-all duration-200 hover:border-theme-accent/50 hover:bg-theme-surface/60 hover:shadow-md">
        <div className="flex size-12 items-center justify-center rounded-full border border-theme-border/60 bg-theme-surface/80 text-theme-text-secondary shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:border-theme-accent/40 group-hover:text-theme-accent">
          <PhotoIcon className="size-6 transition-transform duration-200 group-hover:scale-105" />
        </div>
        <span className="mt-2.5 text-xs font-medium text-theme-text-primary transition-colors duration-200 group-hover:text-theme-accent">
          Выберите изображение
        </span>
        <span className="mt-0.5 text-2xs text-theme-text-muted">
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
