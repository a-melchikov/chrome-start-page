import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';
import type { MarkdownWidgetConfig } from '../../widgets/markdown/types';

async function getStoredMarkdownWidget(): Promise<
  MarkdownWidgetConfig | undefined
> {
  const config = await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
  const widget = config?.widgets[0];
  return widget?.type === 'markdown' ? widget : undefined;
}

describe('useDashboardConfig layout persistence', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('saves x/y/w/h and restores them for a new dashboard session', async () => {
    const widget: MarkdownWidgetConfig = {
      id: 'work-markdown',
      type: 'markdown',
      title: 'Работа',
      content: '[Mail](mail.example.com)',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };
    await saveDashboardConfig({
      version: 2,
      widgets: [widget],
      appearance: { theme: 'system', backgroundColor: '#18181b' },
    });

    const firstSession = renderHook(() => useDashboardConfig());
    await waitFor(() =>
      expect(firstSession.result.current.isLoading).toBe(false),
    );

    const updatedLayout = { x: 5, y: 7, w: 6, h: 4 };
    act(() => {
      firstSession.result.current.updateWidgetLayouts([
        { ...widget, layout: updatedLayout },
      ]);
    });

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.widgets[0]?.layout).toEqual(updatedLayout);
    });
    firstSession.unmount();

    const restoredSession = renderHook(() => useDashboardConfig());
    await waitFor(() =>
      expect(restoredSession.result.current.config?.widgets[0]?.layout).toEqual(
        updatedLayout,
      ),
    );
  });

  it('flushes a pending widget change before the page is hidden', async () => {
    const widget: MarkdownWidgetConfig = {
      id: 'work-markdown',
      type: 'markdown',
      title: 'Работа',
      content: '[Mail](mail.example.com)',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };
    await saveDashboardConfig({
      version: 2,
      widgets: [widget],
      appearance: { theme: 'system', backgroundColor: '#18181b' },
    });
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.updateWidget({
        ...widget,
        content: '[Docs](docs.example.com)',
      });
    });
    expect((await getStoredMarkdownWidget())?.content).toBe(widget.content);

    act(() => window.dispatchEvent(new Event('pagehide')));

    await waitFor(async () => {
      expect((await getStoredMarkdownWidget())?.content).toBe(
        '[Docs](docs.example.com)',
      );
    });
  });
});
