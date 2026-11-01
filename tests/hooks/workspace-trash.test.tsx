import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { loadImageAsset, saveImageAsset } from '../../storage/image-assets';
import {
  loadWallpaperAsset,
  saveWallpaperAsset,
} from '../../storage/wallpaper-assets';
import { removeWallpaper } from '../../storage/wallpaper-transactions';
import { trashWorkspace } from '../../storage/workspace-trash';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import { createCustomThemeSnapshot } from '../../themes/color-derivation';

const IMAGE_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';
const WALLPAPER_ID = '7af1599d-ae5f-4590-9791-bc299eb3b4db';
const asset = (assetId: string): LocalWallpaperAssetV1 => ({
  version: 1,
  assetId,
  mimeType: 'image/png',
  encoding: 'base64',
  originalByteLength: 1,
  storedByteLength: 1,
  data: 'AQ==',
});

async function seedWorkspace() {
  const config = createDefaultDashboardConfig();
  const original = config.workspaces[0]!;
  original.widgets = [
    {
      id: 'image-in-trash',
      type: 'image',
      source: { type: 'local', assetId: IMAGE_ID },
      objectPosition: 'center',
      layout: { x: 2, y: 3, w: 4, h: 5 },
    },
  ];
  original.appearance.wallpaper = {
    type: 'local',
    assetId: WALLPAPER_ID,
    enabled: false,
  };
  await saveImageAsset(asset(IMAGE_ID));
  await saveWallpaperAsset(asset(WALLPAPER_ID));
  await saveDashboardConfig(config);
  return { config, original };
}

describe('persisted workspace trash', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => vi.restoreAllMocks());

  it('keeps trash valid when a shared custom theme is explicitly removed', async () => {
    const config = createDefaultDashboardConfig();
    const original = config.workspaces[0]!;
    const theme = createCustomThemeSnapshot('dark', 'dark', 'Тема корзины');
    config.customThemes = [theme];
    original.appearance.theme = { type: 'custom', id: theme.id };
    await saveDashboardConfig(trashWorkspace(config, original.id));
    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteCustomTheme(theme.id));
    await waitFor(async () =>
      expect((await loadDashboardConfig()).customThemes).toEqual([]),
    );
    expect(
      (await loadDashboardConfig()).trashedWorkspaces?.[0]?.workspace.appearance
        .theme,
    ).toEqual({ type: 'builtin', id: 'system' });
    await act(() => result.current.restoreWorkspace(original.id));
    expect(result.current.activeWorkspace?.appearance.theme).toEqual({
      type: 'builtin',
      id: 'system',
    });
  });

  it('restores settings and resource IDs after unmount and a new load', async () => {
    const { original } = await seedWorkspace();
    const first = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await act(() => first.result.current.deleteWorkspace(original.id));
    expect(first.result.current.activeWorkspaceId).not.toBe(original.id);
    expect(
      (await loadDashboardConfig()).trashedWorkspaces?.[0]?.workspace,
    ).toEqual(original);
    first.unmount();
    const second = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(await loadImageAsset(IMAGE_ID)).not.toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).not.toBeNull();
    await act(() => second.result.current.restoreWorkspace(original.id));
    expect(second.result.current.activeWorkspace).toEqual(original);
    expect((await loadDashboardConfig()).workspaces[0]).toEqual(original);
    expect(await loadImageAsset(IMAGE_ID)).not.toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).not.toBeNull();
  });

  it('keeps the active workspace and resources when writing the trash fails, and supports retry', async () => {
    const { original, config } = await seedWorkspace();
    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const write = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockRejectedValueOnce(new Error('Storage full'));
    await act(async () => {
      await expect(result.current.deleteWorkspace(original.id)).rejects.toThrow(
        'Storage full',
      );
    });
    expect(result.current.config).toEqual(config);
    expect(result.current.error).toBe('Storage full');
    expect(await loadDashboardConfig()).toEqual(config);
    expect(await loadImageAsset(IMAGE_ID)).not.toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).not.toBeNull();
    write.mockRestore();
    await act(() => result.current.deleteWorkspace(original.id));
    expect(result.current.config?.trashedWorkspaces).toHaveLength(1);
  });

  it('only removes resources after a successful permanent deletion', async () => {
    const { original, config } = await seedWorkspace();
    await saveDashboardConfig(trashWorkspace(config, original.id));
    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const write = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockRejectedValueOnce(new Error('Write failed'));
    await act(async () => {
      await expect(result.current.purgeWorkspace(original.id)).rejects.toThrow(
        'Write failed',
      );
    });
    expect(result.current.config?.trashedWorkspaces).toHaveLength(1);
    expect(await loadImageAsset(IMAGE_ID)).not.toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).not.toBeNull();
    write.mockRestore();
    await act(() => result.current.purgeWorkspace(original.id));
    expect((await loadDashboardConfig()).trashedWorkspaces).toEqual([]);
    expect(await loadImageAsset(IMAGE_ID)).toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).toBeNull();
  });

  it('preserves shared assets when active wallpaper changes and a trash entry is purged', async () => {
    const { original, config } = await seedWorkspace();
    const other = config.workspaces[1]!;
    other.appearance.wallpaper = original.appearance.wallpaper;
    other.widgets = original.widgets.map((w) => ({ ...w, id: 'shared-image' }));
    const trashed = trashWorkspace(config, original.id);
    await saveDashboardConfig(trashed);
    await removeWallpaper(trashed);
    expect(await loadWallpaperAsset(WALLPAPER_ID)).not.toBeNull();
    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.purgeWorkspace(original.id));
    expect(await loadImageAsset(IMAGE_ID)).not.toBeNull();
    expect(await loadWallpaperAsset(WALLPAPER_ID)).toBeNull();
  });
});
