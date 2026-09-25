import type { DashboardConfig, WidgetType } from '../../storage/schema';
import { THEMES } from '../../themes/registry';
import { extractMarkdownLinks } from '../../widgets/markdown/extract-links';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import { getWidgetDisplayName } from './widget-display';

export type AppearanceSection =
  'theme' | 'background' | 'wallpaper' | 'widgets';

export type PaletteCommand =
  | {
      id: string;
      kind: 'action';
      action:
        'edit' | 'add-dialog' | 'appearance' | 'backup' | 'export' | 'themes';
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'section';
      section: AppearanceSection;
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'add';
      widgetType: WidgetType;
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'focus';
      widgetId: string;
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'theme';
      themeId: DashboardConfig['appearance']['theme'];
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'link';
      href: string;
      label: string;
      category: string;
      keywords?: string;
    };

const sections: readonly { id: AppearanceSection; name: string }[] = [
  { id: 'theme', name: 'Тема' },
  { id: 'background', name: 'Фон' },
  { id: 'wallpaper', name: 'Обои' },
  { id: 'widgets', name: 'Виджеты' },
];

export function buildCommandCatalog(
  config: DashboardConfig,
  isEditing: boolean,
): PaletteCommand[] {
  return [
    {
      id: 'action:edit',
      kind: 'action',
      action: 'edit',
      label: isEditing
        ? 'Выйти из режима редактирования'
        : 'Открыть режим редактирования',
      category: 'Действия',
      keywords: 'включить выключить редактирование',
    },
    {
      id: 'action:add-dialog',
      kind: 'action',
      action: 'add-dialog',
      label: 'Добавить виджет',
      category: 'Действия',
    },
    {
      id: 'action:appearance',
      kind: 'action',
      action: 'appearance',
      label: 'Открыть настройки оформления',
      category: 'Настройки',
    },
    {
      id: 'action:backup',
      kind: 'action',
      action: 'backup',
      label: 'Импорт и экспорт',
      category: 'Действия',
    },
    {
      id: 'action:export',
      kind: 'action',
      action: 'export',
      label: 'Экспортировать dashboard',
      category: 'Действия',
      keywords: 'резервная копия скачать',
    },
    {
      id: 'action:themes',
      kind: 'action',
      action: 'themes',
      label: 'Переключить тему',
      category: 'Темы',
    },
    ...sections.map(({ id, name }): PaletteCommand => ({
      id: `section:${id}`,
      kind: 'section',
      section: id,
      label: `Открыть настройки: ${name}`,
      category: 'Настройки',
    })),
    ...getAvailableWidgetDefinitions().map((definition): PaletteCommand => ({
      id: `add:${definition.type}`,
      kind: 'add',
      widgetType: definition.type,
      label: `Добавить ${definition.metadata.name}`,
      category: 'Добавить виджет',
      keywords: `${definition.metadata.description} Добавить ${definition.type}`,
    })),
    ...config.widgets.map((widget, index): PaletteCommand => ({
      id: `focus:${widget.id}`,
      kind: 'focus',
      widgetId: widget.id,
      label:
        widget.type === 'markdown'
          ? `Фокус на Markdown «${getWidgetDisplayName(widget)}»`
          : `Фокус на ${getWidgetDisplayName(widget)}`,
      category: `Виджеты · ${index + 1}`,
      keywords: widget.type,
    })),
    ...THEMES.map((theme): PaletteCommand => ({
      id: `theme:${theme.id}`,
      kind: 'theme',
      themeId: theme.id,
      label: theme.name,
      category: 'Темы',
      keywords: theme.description,
    })),
    ...config.widgets.flatMap((widget) =>
      widget.type === 'markdown'
        ? extractMarkdownLinks(widget.content).map(
            (link, index): PaletteCommand => ({
              id: `link:${widget.id}:${index}`,
              kind: 'link',
              href: link.href,
              label: link.label,
              category: `Ссылки · ${getWidgetDisplayName(widget)}`,
              keywords: link.href,
            }),
          )
        : [],
    ),
  ];
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/\s+/g, ' ').trim();
}

export function filterCommands(
  commands: readonly PaletteCommand[],
  query: string,
): PaletteCommand[] {
  const needle = normalize(query);
  if (!needle) return [...commands];
  return commands.filter((command) =>
    normalize(
      `${command.label} ${command.category} ${command.keywords ?? ''}`,
    ).includes(needle),
  );
}
