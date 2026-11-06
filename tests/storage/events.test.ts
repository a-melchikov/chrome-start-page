import { describe, expect, it } from 'vitest';

import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  createDashboardBackup,
  parseDashboardBackupJson,
  serializeDashboardBackup,
} from '../../storage/dashboard-backup';
import { migrateDashboardConfig } from '../../storage/migrations';
import { createDefaultEventsWidget } from '../../widgets/events/defaults';
import { getWidgetDefinition } from '../../widgets/registry';

function configWithEvents() {
  const config = createDefaultDashboardConfig();
  config.workspaces[0]!.widgets = [
    {
      ...createDefaultEventsWidget('events', 0),
      events: [
        {
          id: 'deadline',
          title: 'Сдать работу',
          description: 'Проверить результат\nи отправить',
          date: '2026-11-10',
          time: '10:30',
          repeat: 'monthly',
        },
      ],
    },
  ];
  return config;
}

describe('events persistence and registry', () => {
  it('registers deterministic defaults and preserves config without a migration', () => {
    const definition = getWidgetDefinition('events')!;
    expect(definition.create('events', 0)).toEqual(
      createDefaultEventsWidget('events', 0),
    );
    const config = configWithEvents();
    expect(migrateDashboardConfig(config)).toEqual(config);
  });

  it('round-trips event settings in a complete backup', async () => {
    const config = configWithEvents();
    const backup = await createDashboardBackup(config);
    expect(
      parseDashboardBackupJson(serializeDashboardBackup(backup)).dashboard,
    ).toEqual(config);
  });

  it('rejects corrupt events at the storage boundary instead of losing them', () => {
    const config = configWithEvents();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    widget.events[0]!.date = '2026-02-30';
    expect(() => migrateDashboardConfig(config)).toThrow();
    expect(getWidgetDefinition('events')!.render(widget)).toBeNull();
  });

  it('accepts older events without a description and rejects invalid descriptions', () => {
    const config = configWithEvents();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    delete widget.events[0]!.description;
    expect(migrateDashboardConfig(config)).toEqual(config);
    const malformed = structuredClone(config);
    const event = (malformed.workspaces[0]!.widgets[0] as typeof widget)
      .events[0]!;
    Object.assign(event, { description: 42 });
    expect(() => migrateDashboardConfig(malformed)).toThrow();
  });
});
