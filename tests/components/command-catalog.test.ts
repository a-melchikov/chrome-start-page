import { describe, expect, it } from 'vitest';

import {
  buildCommandCatalog,
  filterCommands,
} from '../../components/dashboard/command-catalog';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { THEMES } from '../../themes/registry';

describe('command catalog', () => {
  it('includes registry widgets, existing cards, themes, settings, workspaces and duplicate links', () => {
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      {
        id: 'one',
        type: 'markdown',
        title: 'Работа',
        content: '[Почта](https://example.com)',
        layout: { x: 0, y: 0, w: 3, h: 3 },
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
      {
        id: 'two',
        type: 'markdown',
        title: 'Личное',
        content: '[Почта](https://example.com)',
        layout: { x: 3, y: 0, w: 3, h: 3 },
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
    ];
    const commands = buildCommandCatalog(config, false);

    expect(commands.filter((command) => command.kind === 'add')).toHaveLength(
      6,
    );

    expect(commands.filter((command) => command.kind === 'theme')).toHaveLength(
      THEMES.length,
    );
    expect(
      commands.filter((command) => command.kind === 'section'),
    ).toHaveLength(5);
    expect(
      commands.filter((command) => command.kind === 'workspace'),
    ).toHaveLength(2);
    expect(commands.find((c) => c.id === 'action:workspaces')).toBeDefined();
    expect(commands.filter((command) => command.kind === 'link')).toHaveLength(
      2,
    );
    expect(filterCommands(commands, '  ФОКУС   НА   MARKDOWN ')).toHaveLength(
      2,
    );
    expect(
      filterCommands(commands, ' фокус на markdown «работа» '),
    ).toHaveLength(1);
    expect(filterCommands(commands, 'Добавить Pomodoro')).toHaveLength(1);
    expect(filterCommands(commands, 'example.com')).toHaveLength(2);
    expect(
      filterCommands(commands, 'Переключить рабочее пространство:'),
    ).toHaveLength(2);
  });
});
