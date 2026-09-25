import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Input } from '../../components/ui';
import { classNames } from '../../components/ui/class-names';
import { useImageSource } from '../../hooks/use-image-source';
import { saveImageAsset } from '../../storage/image-assets';
import { encodeWallpaperAsset } from '../../storage/wallpaper-codec';
import { validateLocalImageFile, validateImageUrl } from './image-validation';
import {
  type ImageFitMode,
  type ImageObjectPositionPreset,
  type ImageWidgetConfig,
} from './types';

interface ImageWidgetEditorProps {
  config: ImageWidgetConfig;
  onChange: (config: ImageWidgetConfig) => void;
  onRequestFinish: () => void;
}

const ACCEPTED_IMAGE_FILES =
  'image/png,image/jpeg,image/webp,image/gif,image/avif,.png,.jpg,.jpeg,.webp,.gif,.avif';

const POSITION_LABELS: Record<ImageObjectPositionPreset, string> = {
  'top-left': 'Сверху слева',
  top: 'Сверху по центру',
  'top-right': 'Сверху справа',
  left: 'По центру слева',
  center: 'По центру',
  right: 'По центру справа',
  'bottom-left': 'Снизу слева',
  bottom: 'Снизу по центру',
  'bottom-right': 'Снизу справа',
};

const POSITION_GRID: ImageObjectPositionPreset[][] = [
  ['top-left', 'top', 'top-right'],
  ['left', 'center', 'right'],
  ['bottom-left', 'bottom', 'bottom-right'],
];

function parseObjectPosition(pos: string): { x: number; y: number } {
  const named: Record<string, { x: number; y: number }> = {
    'top-left': { x: 0, y: 0 },
    top: { x: 50, y: 0 },
    'top-right': { x: 100, y: 0 },
    left: { x: 0, y: 50 },
    center: { x: 50, y: 50 },
    right: { x: 100, y: 50 },
    'bottom-left': { x: 0, y: 100 },
    bottom: { x: 50, y: 100 },
    'bottom-right': { x: 100, y: 100 },
  };
  const matched = named[pos];
  if (matched) {
    return matched;
  }
  const match = pos.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (match && match[1] && match[2]) {
    return { x: Number(match[1]), y: Number(match[2]) };
  }
  return { x: 50, y: 50 };
}

function getPositionDisplay(pos: string): string {
  if (pos in POSITION_LABELS) {
    return POSITION_LABELS[pos as ImageObjectPositionPreset];
  }
  const match = pos.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (match) {
    return `${Math.round(Number(match[1]))}% × ${Math.round(Number(match[2]))}%`;
  }
  return pos;
}

function calculatePresetLayout(targetRatio: number): { w: number; h: number } {
  let bestW = 4;
  let bestH = 4;
  let minDiff = Number.POSITIVE_INFINITY;

  for (let w = 2; w <= 12; w += 1) {
    for (let h = 2; h <= 12; h += 1) {
      // 1 column is ~80px width, 1 row is ~64px height (unit ratio ~1.25)
      const gridRatio = (w / h) * 1.25;
      const diff = Math.abs(gridRatio - targetRatio);

      if (diff < minDiff) {
        minDiff = diff;
        bestW = w;
        bestH = h;
      }
    }
  }

  return { w: bestW, h: bestH };
}

export function ImageWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: ImageWidgetEditorProps) {
  const [sourceTab, setSourceTab] = useState<'local' | 'url'>(
    config.source.type === 'url' ? 'url' : 'local',
  );
  const [urlInput, setUrlInput] = useState(
    config.source.type === 'url' ? config.source.url : '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPos: { x: number; y: number };
  } | null>(null);

  const { src } = useImageSource(config.source);
  const fitMode = config.fitMode ?? 'cover';
  const currentZoom = config.zoom ?? 1;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { bytes, mimeType, width, height } = await validateLocalImageFile(
        file,
        controller.signal,
      );

      const assetId = crypto.randomUUID();
      const asset = await encodeWallpaperAsset(assetId, mimeType, bytes);
      await saveImageAsset(asset);

      setNaturalDimensions({ width, height });
      onChange({
        ...config,
        source: { type: 'local', assetId },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== 'ImageValidationAbortedError'
      ) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = urlInput.trim();

    if (!trimmed) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { url, width, height } = await validateImageUrl(
        trimmed,
        controller.signal,
      );
      setNaturalDimensions({ width, height });
      onChange({
        ...config,
        source: { type: 'url', url },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== 'ImageValidationAbortedError'
      ) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearImage = () => {
    setErrorMessage(null);
    setNaturalDimensions(null);
    setUrlInput('');
    onChange({
      ...config,
      source: { type: 'none' },
    });
  };

  const handleUpdateSize = (w: number, h: number) => {
    const clampedW = Math.max(2, Math.min(12, w));
    const clampedH = Math.max(2, Math.min(12, h));
    onChange({
      ...config,
      layout: {
        ...config.layout,
        w: clampedW,
        h: clampedH,
      },
    });
  };

  const handleApplyPresetRatio = (ratioW: number, ratioH: number) => {
    const { w, h } = calculatePresetLayout(ratioW / ratioH);
    handleUpdateSize(w, h);
  };

  const handleApplyRecommendedSize = () => {
    if (!naturalDimensions) return;
    const { w, h } = calculatePresetLayout(
      naturalDimensions.width / naturalDimensions.height,
    );
    handleUpdateSize(w, h);
  };

  const handleFitModeChange = (mode: ImageFitMode) => {
    onChange({
      ...config,
      fitMode: mode,
    });
  };

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(1, Math.min(3, Number(newZoom.toFixed(2))));
    onChange({
      ...config,
      zoom: clamped,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (fitMode === 'contain') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPos: parseObjectPosition(config.objectPosition),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragStartRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const zoomMultiplier = Math.max(1, currentZoom);

    const deltaPercentX = (dx / rect.width) * (100 / zoomMultiplier);
    const deltaPercentY = (dy / rect.height) * (100 / zoomMultiplier);

    const newX = Math.max(
      0,
      Math.min(
        100,
        Math.round(dragStartRef.current.initialPos.x - deltaPercentX),
      ),
    );
    const newY = Math.max(
      0,
      Math.min(
        100,
        Math.round(dragStartRef.current.initialPos.y - deltaPercentY),
      ),
    );

    onChange({
      ...config,
      objectPosition: `${newX}% ${newY}%`,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (dragStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragStartRef.current = null;
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (fitMode === 'contain') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(currentZoom + delta);
  };

  // Preview frame aspect ratio based on current grid columns and rows
  const frameAspectRatio = (config.layout.w / config.layout.h) * 1.25;

  return (
    <div className="space-y-4">
      {/* Source selector tabs */}
      <div>
        <div className="flex gap-1 rounded-lg border border-theme-border bg-theme-surface-muted p-1">
          <button
            className={classNames(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
              sourceTab === 'local'
                ? 'bg-theme-surface text-theme-text-primary shadow-xs'
                : 'text-theme-text-secondary hover:text-theme-text-primary',
            )}
            type="button"
            onClick={() => {
              setSourceTab('local');
              setErrorMessage(null);
            }}
          >
            Файл
          </button>
          <button
            className={classNames(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
              sourceTab === 'url'
                ? 'bg-theme-surface text-theme-text-primary shadow-xs'
                : 'text-theme-text-secondary hover:text-theme-text-primary',
            )}
            type="button"
            onClick={() => {
              setSourceTab('url');
              setErrorMessage(null);
            }}
          >
            По ссылке
          </button>
        </div>

        <div className="mt-3">
          {sourceTab === 'local' ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                accept={ACCEPTED_IMAGE_FILES}
                aria-label="Выбрать изображение"
                className="sr-only"
                disabled={isLoading}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    void handleFileUpload(file);
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  disabled={isLoading}
                  size="small"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isLoading
                    ? 'Загрузка...'
                    : config.source.type === 'local'
                      ? 'Заменить файл'
                      : 'Выбрать файл'}
                </Button>
                {config.source.type !== 'none' ? (
                  <Button
                    disabled={isLoading}
                    size="small"
                    variant="ghost"
                    onClick={handleClearImage}
                  >
                    Удалить
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-theme-text-muted">
                PNG, JPEG, WebP, GIF или AVIF (до 32 МБ). SVG не поддерживается.
              </p>
            </div>
          ) : (
            <form className="space-y-2" onSubmit={handleUrlSubmit}>
              <div className="flex gap-2">
                <Input
                  className="flex-1 text-sm"
                  disabled={isLoading}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button
                  disabled={isLoading || !urlInput.trim()}
                  size="small"
                  type="submit"
                  variant="primary"
                >
                  {isLoading ? '...' : 'Применить'}
                </Button>
                {config.source.type !== 'none' ? (
                  <Button
                    disabled={isLoading}
                    size="small"
                    type="button"
                    variant="ghost"
                    onClick={handleClearImage}
                  >
                    Удалить
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-theme-text-muted">
                Прямая HTTPS-ссылка на изображение.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
          {errorMessage}
        </div>
      ) : null}

      {/* Preview, Fit Mode, Pan & Zoom */}
      {src ? (
        <div className="space-y-3 rounded-lg border border-theme-border bg-theme-surface-muted/40 p-3">
          {/* Fit mode selector */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-theme-text-secondary">
              Режим отображения:
            </span>
            <div className="flex gap-1 rounded-md border border-theme-border bg-theme-surface p-0.5">
              <button
                className={classNames(
                  'rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
                  fitMode === 'cover'
                    ? 'bg-theme-accent text-white shadow-xs'
                    : 'text-theme-text-secondary hover:text-theme-text-primary',
                )}
                type="button"
                onClick={() => handleFitModeChange('cover')}
              >
                Заполнить
              </button>
              <button
                className={classNames(
                  'rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
                  fitMode === 'contain'
                    ? 'bg-theme-accent text-white shadow-xs'
                    : 'text-theme-text-secondary hover:text-theme-text-primary',
                )}
                type="button"
                onClick={() => handleFitModeChange('contain')}
              >
                Вписать целиком
              </button>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-theme-border/60 bg-theme-surface/60 p-2">
            <div
              ref={previewRef}
              aria-label="Предпросмотр кадрирования изображения"
              className={classNames(
                'relative max-h-44 max-w-full overflow-hidden rounded-md border border-theme-border select-none touch-none',
                fitMode === 'cover' &&
                  (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
              )}
              data-no-drag="true"
              style={{
                aspectRatio: `${frameAspectRatio}`,
                width: frameAspectRatio >= 1 ? '100%' : 'auto',
                height: frameAspectRatio < 1 ? '100%' : 'auto',
              }}
              onDragStart={(e) => e.preventDefault()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            >
              <img
                alt=""
                className={classNames(
                  'pointer-events-none h-full w-full',
                  fitMode === 'contain' ? 'object-contain' : 'object-cover',
                )}
                draggable={false}
                referrerPolicy="no-referrer"
                src={src}
                style={{
                  objectPosition: config.objectPosition,
                  transform:
                    currentZoom > 1 && fitMode === 'cover'
                      ? `scale(${currentZoom})`
                      : undefined,
                  transformOrigin: config.objectPosition,
                }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setNaturalDimensions({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                  }
                }}
              />
              {fitMode === 'cover' ? (
                <div className="pointer-events-none absolute bottom-1 right-1.5 rounded-xs bg-black/60 px-1.5 py-0.5 text-2xs text-white/90 backdrop-blur-xs">
                  Зажмите и тяните
                </div>
              ) : null}
            </div>
          </div>

          {/* Zoom Slider (for cover mode) */}
          {fitMode === 'cover' ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-text-secondary">
                  Масштаб (Zoom):
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs font-semibold text-theme-text-primary">
                    {currentZoom.toFixed(1)}×
                  </span>
                  {currentZoom > 1 ? (
                    <button
                      className="text-2xs text-theme-accent hover:underline"
                      type="button"
                      onClick={() => handleZoomChange(1)}
                    >
                      Сброс
                    </button>
                  ) : null}
                </div>
              </div>
              <input
                aria-label="Масштаб изображения"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-theme-border accent-theme-accent"
                max={3}
                min={1}
                step={0.05}
                type="range"
                value={currentZoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
              />
            </div>
          ) : null}

          {/* 3x3 Grid Picker */}
          <div className="flex items-center justify-between gap-4 border-t border-theme-border/60 pt-2">
            <div className="space-y-0.5">
              <span className="block text-xs font-medium text-theme-text-secondary">
                Выравнивание
              </span>
              <span className="text-2xs text-theme-text-muted">
                {getPositionDisplay(config.objectPosition)}
              </span>
            </div>
            <div
              aria-label="Сетка выравнивания изображения"
              className="inline-grid grid-cols-3 gap-1 rounded-md border border-theme-border bg-theme-surface p-1"
              role="radiogroup"
            >
              {POSITION_GRID.map((row) =>
                row.map((pos) => {
                  const isSelected = config.objectPosition === pos;
                  return (
                    <button
                      key={pos}
                      aria-checked={isSelected}
                      aria-label={POSITION_LABELS[pos]}
                      className={classNames(
                        'flex size-6 items-center justify-center rounded-xs transition-colors',
                        isSelected
                          ? 'bg-theme-accent text-white shadow-xs'
                          : 'text-theme-text-muted hover:bg-theme-surface-muted hover:text-theme-text-primary',
                      )}
                      role="radio"
                      title={POSITION_LABELS[pos]}
                      type="button"
                      onClick={() =>
                        onChange({ ...config, objectPosition: pos })
                      }
                    >
                      <span
                        className={classNames(
                          'rounded-full',
                          isSelected
                            ? 'size-2 bg-white'
                            : 'size-1.5 bg-current',
                        )}
                      />
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Widget Size Controls */}
      <div className="space-y-2.5 rounded-lg border border-theme-border bg-theme-surface-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-theme-text-primary">
            Размер на дашборде
          </span>
          {naturalDimensions ? (
            <span className="text-2xs text-theme-text-muted">
              {naturalDimensions.width} × {naturalDimensions.height} px
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Width controller */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-text-secondary">Ширина:</span>
            <div className="flex items-center rounded-md border border-theme-border bg-theme-surface">
              <button
                aria-label="Уменьшить ширину"
                className="flex size-7 items-center justify-center text-sm font-semibold text-theme-text-secondary hover:text-theme-text-primary disabled:opacity-40"
                disabled={config.layout.w <= 2}
                type="button"
                onClick={() =>
                  handleUpdateSize(config.layout.w - 1, config.layout.h)
                }
              >
                −
              </button>
              <span className="w-8 text-center text-xs font-semibold text-theme-text-primary">
                {config.layout.w}
              </span>
              <button
                aria-label="Увеличить ширину"
                className="flex size-7 items-center justify-center text-sm font-semibold text-theme-text-secondary hover:text-theme-text-primary disabled:opacity-40"
                disabled={config.layout.w >= 12}
                type="button"
                onClick={() =>
                  handleUpdateSize(config.layout.w + 1, config.layout.h)
                }
              >
                +
              </button>
            </div>
            <span className="text-2xs text-theme-text-muted">кол.</span>
          </div>

          {/* Height controller */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-text-secondary">Высота:</span>
            <div className="flex items-center rounded-md border border-theme-border bg-theme-surface">
              <button
                aria-label="Уменьшить высоту"
                className="flex size-7 items-center justify-center text-sm font-semibold text-theme-text-secondary hover:text-theme-text-primary disabled:opacity-40"
                disabled={config.layout.h <= 2}
                type="button"
                onClick={() =>
                  handleUpdateSize(config.layout.w, config.layout.h - 1)
                }
              >
                −
              </button>
              <span className="w-8 text-center text-xs font-semibold text-theme-text-primary">
                {config.layout.h}
              </span>
              <button
                aria-label="Увеличить высоту"
                className="flex size-7 items-center justify-center text-sm font-semibold text-theme-text-secondary hover:text-theme-text-primary disabled:opacity-40"
                disabled={config.layout.h >= 12}
                type="button"
                onClick={() =>
                  handleUpdateSize(config.layout.w, config.layout.h + 1)
                }
              >
                +
              </button>
            </div>
            <span className="text-2xs text-theme-text-muted">стр.</span>
          </div>
        </div>

        {/* Quick aspect ratio presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-2xs text-theme-text-muted">Пропорции:</span>
          <button
            className="rounded-xs border border-theme-border bg-theme-surface px-2 py-0.5 text-2xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-surface-muted hover:text-theme-text-primary"
            type="button"
            onClick={() => handleApplyPresetRatio(1, 1)}
          >
            1:1
          </button>
          <button
            className="rounded-xs border border-theme-border bg-theme-surface px-2 py-0.5 text-2xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-surface-muted hover:text-theme-text-primary"
            type="button"
            onClick={() => handleApplyPresetRatio(4, 3)}
          >
            4:3
          </button>
          <button
            className="rounded-xs border border-theme-border bg-theme-surface px-2 py-0.5 text-2xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-surface-muted hover:text-theme-text-primary"
            type="button"
            onClick={() => handleApplyPresetRatio(16, 9)}
          >
            16:9
          </button>
          {naturalDimensions ? (
            <button
              className="rounded-xs border border-theme-border bg-theme-surface px-2 py-0.5 text-2xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-surface-muted hover:text-theme-text-primary"
              type="button"
              onClick={handleApplyRecommendedSize}
            >
              По оригиналу
            </button>
          ) : null}
        </div>
      </div>

      {/* Done button */}
      <div className="flex justify-end pt-1">
        <Button size="small" variant="primary" onClick={onRequestFinish}>
          Готово
        </Button>
      </div>
    </div>
  );
}
