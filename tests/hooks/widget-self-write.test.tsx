import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import {
  DASHBOARD_STORAGE_KEY,
  readStoredDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';

describe('widget self writes', () => {
  beforeEach(() => fakeBrowser.reset());

  it('undoes an added widget without treating its own save as another tab', async () => {
    await saveDashboardConfig(createDefaultDashboardConfig());
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() =>
      dashboard.result.current.addWidget({
        id: 'first',
        type: 'markdown',
        title: 'first',
        content: 'first',
        layout: { x: 0, y: 0, w: 3, h: 3 },
      }),
    );
    await waitFor(async () =>
      expect((await readStoredDashboardConfig())?.widgets).toHaveLength(1),
    );

    const saved = await readStoredDashboardConfig();
    if (!saved) throw new Error('Dashboard config is missing');
    // Chrome may return equivalent objects with a different property order.
    await storage.setItem(DASHBOARD_STORAGE_KEY, {
      widgets: saved.widgets,
      appearance: saved.appearance,
      version: saved.version,
      customThemes: saved.customThemes,
    });

    act(() => dashboard.result.current.undo());
    await waitFor(async () =>
      expect((await readStoredDashboardConfig())?.widgets).toHaveLength(0),
    );
    expect(dashboard.result.current.conflict).toBe(false);
    expect(dashboard.result.current.config?.widgets).toEqual([]);

    const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set');
    act(() =>
      dashboard.result.current.addWidget({
        id: 'second',
        type: 'markdown',
        title: 'second',
        content: 'second',
        layout: { x: 0, y: 0, w: 3, h: 3 },
      }),
    );
    act(() => dashboard.result.current.undo());
    await waitFor(() => expect(setSpy).toHaveBeenCalledTimes(2));
    await waitFor(async () =>
      expect((await readStoredDashboardConfig())?.widgets).toHaveLength(0),
    );
    expect(dashboard.result.current.conflict).toBe(false);
  });
});
