import { useEffect, useState } from 'react';

import { loadWallpaperAsset } from '../storage/wallpaper-assets';
import { decodeWallpaperAsset } from '../storage/wallpaper-codec';
import type { WallpaperConfig } from '../storage/schema';
import { validateWallpaperBytes } from '../wallpaper/image-validation';

export interface WallpaperImageState {
  src: string | null;
  error: string | null;
  sourceType: WallpaperConfig['type'];
}

interface LocalWallpaperImageState {
  assetId: string;
  src: string | null;
  error: string | null;
}

function getImmediateState(wallpaper: WallpaperConfig): WallpaperImageState {
  return {
    src: wallpaper.type === 'url' ? wallpaper.url : null,
    error: null,
    sourceType: wallpaper.type,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось загрузить локальные обои';
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function useWallpaperImage(
  wallpaper: WallpaperConfig,
): WallpaperImageState {
  const localAssetId = wallpaper.type === 'local' ? wallpaper.assetId : null;
  const [localState, setLocalState] = useState<LocalWallpaperImageState | null>(
    null,
  );

  useEffect(() => {
    if (!localAssetId) {
      return;
    }

    let isActive = true;
    let displayUrl: string | null = null;

    void loadWallpaperAsset(localAssetId)
      .then(async (asset) => {
        if (!asset) {
          throw new Error('Локальные обои не найдены');
        }

        const bytes = await decodeWallpaperAsset(asset);
        await validateWallpaperBytes(bytes, asset.mimeType);
        displayUrl = URL.createObjectURL(
          new Blob([copyBytes(bytes)], { type: asset.mimeType }),
        );

        if (!isActive) {
          URL.revokeObjectURL(displayUrl);
          displayUrl = null;
          return;
        }

        setLocalState({ assetId: localAssetId, src: displayUrl, error: null });
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLocalState({
            assetId: localAssetId,
            src: null,
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

  if (wallpaper.type !== 'local') {
    return getImmediateState(wallpaper);
  }

  return {
    src: localState?.assetId === wallpaper.assetId ? localState.src : null,
    error: localState?.assetId === wallpaper.assetId ? localState.error : null,
    sourceType: 'local',
  };
}
