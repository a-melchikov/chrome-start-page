import { describe, expect, it } from 'vitest';

import {
  buildCommandCatalog,
  filterCommands,
} from '../../components/dashboard/command-catalog';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { THEMES } from '../../themes/registry';

describe('command catalog', () => {
  it('includes registry widgets, existing cards, themes, settings and duplicate links', () => {
    const config = createDefaultDashboardConfig();
    config.widgets = [
      {
        id: 'one',
        type: 'markdown',
        title: 'Работа',
        content: '[Почта](https://example.com)',
        layout: { x: 0, y: 0, w: 3, h: 3 },
      },
      {
        id: 'two',
        type: 'markdown',
        title: 'Личное',
        content: '[Почта](https://example.com)',
        layout: { x: 3, y: 0, w: 3, h: 3 },
      },
    ];
    const commands = buildCommandCatalog(config, false);

    expect(commands.filter((command) => command.kind === 'add')).toHaveLength(
      5,
    );
    expect(commands.filter((command) => command.kind === 'theme')).toHaveLength(
      THEMES.length,
    );
    expect(
      commands.filter((command) => command.kind === 'section'),
    ).toHaveLength(4);
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
  });
});
