import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  createDashboardBackup,
  parseDashboardBackup,
} from '../../../storage/dashboard-backup';
import { createDefaultDashboardConfig } from '../../../storage/defaults';
import {
  isWidgetConfig,
  migrateDashboardConfig,
} from '../../../storage/migrations';
import { createDefaultYandexMusicWidget } from '../../../widgets/yandex-music/defaults';
import {
  getWidgetDefinition,
  getWidgetUnavailableReason,
} from '../../../widgets/registry';
import { AddWidgetDialog } from '../../../components/dashboard/AddWidgetDialog';
import { render, screen } from '@testing-library/react';

const platform = vi.hoisted(() => ({ extension: true }));
vi.mock('../../../app/platform', () => ({
  isExtensionRuntime: () => platform.extension,
}));

describe('Yandex Music registry and storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    platform.extension = true;
  });

  it('round-trips a minimal widget through current config and backup without playback data', async () => {
    const widget = createDefaultYandexMusicWidget('music-test', 2);
    expect(widget.layout).toEqual({ x: 0, y: 8, w: 4, h: 4 });
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [widget];
    const migrated = migrateDashboardConfig(config);
    const backup = await createDashboardBackup(migrated);
    expect(
      parseDashboardBackup(backup).dashboard.workspaces[0]!.widgets,
    ).toEqual([widget]);
    expect(
      Object.keys(backup.dashboard.workspaces[0]!.widgets[0]!).sort(),
    ).toEqual(['id', 'layout', 'type']);
  });

  it('validates inherited appearance and refuses runtime data in widget config', () => {
    const widget = createDefaultYandexMusicWidget('music-test', 0);
    expect(isWidgetConfig(widget)).toBe(true);
    expect(
      isWidgetConfig({ ...widget, appearance: { borderRadius: 20 } }),
    ).toBe(true);
    expect(
      isWidgetConfig({ ...widget, position: 30, metadata: 'derived' }),
    ).toBe(false);
    expect(
      isWidgetConfig({ ...widget, layout: { ...widget.layout, w: NaN } }),
    ).toBe(false);
  });

  it('keeps imported widgets renderable but disables adding them in web mode', () => {
    const definition = getWidgetDefinition('yandex-music')!;
    expect(definition.presentation.layout).toMatchObject({ minW: 3, minH: 4 });
    expect(getWidgetUnavailableReason(definition)).toBeNull();
    platform.extension = false;
    expect(getWidgetUnavailableReason(definition)).toBe(
      'Управление доступно в расширении',
    );
    expect(
      definition.render(createDefaultYandexMusicWidget('music-test', 0)),
    ).not.toBeNull();
    render(
      <AddWidgetDialog
        open
        onOpenChange={vi.fn()}
        onSelectWidgetType={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Яндекс.Музыка' }),
    ).toBeDisabled();
    expect(screen.getByText('Управление доступно в расширении')).toBeVisible();
  });
});
