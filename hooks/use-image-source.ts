import { useEffect, useState } from 'react';

import { loadImageAsset } from '../storage/image-assets';
import { decodeWallpaperAsset } from '../storage/wallpaper-codec';
import type { ImageWidgetSource } from '../widgets/image/types';

export interface ImageSourceState {
  src: string | null;
  mimeType: string | null;
  error: string | null;
  isLoading: boolean;
}

interface LocalImageSourceState {
  assetId: string;
  src: string | null;
  mimeType: string | null;
  error: string | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось загрузить локальное изображение';
}

function getImmediateState(source: ImageWidgetSource): ImageSourceState {
  return {
    src: source.type === 'url' ? source.url : null,
    mimeType: null,
    error: null,
    isLoading: false,
  };
}

export function useImageSource(source: ImageWidgetSource): ImageSourceState {
  const localAssetId = source.type === 'local' ? source.assetId : null;
  const [localState, setLocalState] = useState<LocalImageSourceState | null>(
    null,
  );

  useEffect(() => {
    if (!localAssetId) {
      return;
    }

    let isActive = true;
    let displayUrl: string | null = null;

    void loadImageAsset(localAssetId)
      .then(async (asset) => {
        if (!asset) {
          throw new Error('Локальное изображение не найдено');
        }

        const bytes = await decodeWallpaperAsset(asset);
        displayUrl = URL.createObjectURL(
          new Blob([bytes as Uint8Array<ArrayBuffer>], {
            type: asset.mimeType,
          }),
        );

        if (!isActive) {
          URL.revokeObjectURL(displayUrl);
          displayUrl = null;
          return;
        }

        setLocalState({
          assetId: localAssetId,
          src: displayUrl,
          mimeType: asset.mimeType,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLocalState({
            assetId: localAssetId,
            src: null,
            mimeType: null,
            error: getErrorMessage(error),
          });
        }
      });

    return () => {
      isActive = false;

      if (displayUrl) {
        URL.revokeObjectURL(displayUrl);
      }
    };
  }, [localAssetId]);

  if (source.type !== 'local') {
    return getImmediateState(source);
  }

  const matches = localState?.assetId === source.assetId;

  return {
    src: matches ? localState.src : null,
    mimeType: matches ? localState.mimeType : null,
    error: matches ? localState.error : null,
    isLoading: !matches,
  };
}
