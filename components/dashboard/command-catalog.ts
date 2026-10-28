import {
  isWallpaperEnabled,
  type DashboardConfig,
  type WidgetType,
} from '../../storage/schema';
import { THEMES } from '../../themes/registry';
import type { BuiltinThemeId, ThemeRef } from '../../themes/types';
import { extractMarkdownLinks } from '../../widgets/markdown/extract-links';
import {
  createSearchSnippet,
  extractMarkdownSearchText,
} from '../../widgets/markdown/search-text';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import { getWidgetDisplayName } from './widget-display';

export type AppearanceSection =
  'theme' | 'background' | 'wallpaper' | 'widgets' | 'toolbar';

export type PaletteCommand =
  | {
      id: string;
      kind: 'action';
      action:
        | 'edit'
        | 'add-dialog'
        | 'appearance'
        | 'backup'
        | 'export'
        | 'themes'
        | 'add-custom-theme'
        | 'workspaces'
        | 'add-workspace'
        | 'toggle-wallpaper';
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
      kind: 'workspace';
      workspaceId: string;
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
      themeId: ThemeRef;
      label: string;
      category: string;
      keywords?: string;
    }
  | {
      id: string;
      kind: 'note';
      workspaceId: string;
      widgetId: string;
      label: string;
      category: string;
      searchText: string;
      snippet?: string;
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
  { id: 'toolbar', name: 'Панель управления' },
];

export function buildCommandCatalog(
  config: DashboardConfig,
  isEditing: boolean,
): PaletteCommand[] {
  const activeWorkspace =
    config.workspaces.find((w) => w.id === config.activeWorkspaceId) ??
    config.workspaces[0];
  const widgets = activeWorkspace?.widgets ?? [];
  const wallpaperConfig = activeWorkspace?.appearance.wallpaper;
  const hasWallpaper = Boolean(
    wallpaperConfig && wallpaperConfig.type !== 'none',
  );
  const wallpaperEnabled = hasWallpaper && isWallpaperEnabled(wallpaperConfig!);

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
      id: 'action:add-custom-theme',
      kind: 'action',
      action: 'add-custom-theme',
      label: 'Добавить собственную тему',
      category: 'Действия',
      keywords: 'создать добавить тему палитра цветов',
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
    ...(hasWallpaper
      ? [
          {
            id: 'action:toggle-wallpaper' as const,
            kind: 'action' as const,
            action: 'toggle-wallpaper' as const,
            label: wallpaperEnabled ? 'Отключить обои' : 'Включить обои',
            category: 'Оформление',
            keywords: 'обои включить выключить фон изображение wallpaper',
          },
        ]
      : []),
    {
      id: 'action:workspaces',
      kind: 'action',
      action: 'workspaces',
      label: 'Управление рабочими пространствами',
      category: 'Рабочие пространства',
      keywords: 'воркспейсы профили настроить создать переименовать',
    },
    ...config.workspaces.map((workspace): PaletteCommand => ({
      id: `workspace:${workspace.id}`,
      kind: 'workspace',
      workspaceId: workspace.id,
      label: `Переключить рабочее пространство: ${workspace.name}`,
      category: 'Рабочие пространства',
      keywords: `воркспейс рабочий стол профиль ${workspace.name}`,
    })),
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
    ...widgets.map((widget, index): PaletteCommand => ({
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
    ...config.workspaces.flatMap((workspace) =>
      workspace.widgets.flatMap((widget): PaletteCommand[] =>
        widget.type === 'markdown'
          ? [
              {
                id: 'note:' + workspace.id + ':' + widget.id,
                kind: 'note',
                workspaceId: workspace.id,
                widgetId: widget.id,
                label: 'Заметка «' + getWidgetDisplayName(widget) + '»',
                category: 'Заметки · ' + workspace.name,
                searchText: extractMarkdownSearchText(widget.content),
              },
            ]
          : [],
      ),
    ),
    ...THEMES.map((theme): PaletteCommand => ({
      id: `theme:builtin:${theme.id}`,
      kind: 'theme',
      themeId: { type: 'builtin', id: theme.id as BuiltinThemeId },
      label: theme.name,
      category: 'Темы',
      keywords: theme.description,
    })),
    ...(config.customThemes ?? []).map((theme): PaletteCommand => ({
      id: `theme:custom:${theme.id}`,
      kind: 'theme',
      themeId: { type: 'custom', id: theme.id },
      label: theme.name,
      category: 'Темы',
      keywords: theme.description ?? 'собственная тема',
    })),
    ...widgets.flatMap((widget) =>
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
  if (!needle) return commands.filter((command) => command.kind !== 'note');
  return commands
    .filter((command) =>
      normalize(
        [
          command.label,
          command.category,
          command.kind === 'note'
            ? command.searchText
            : (command.keywords ?? ''),
        ].join(' '),
      ).includes(needle),
    )
    .map((command) =>
      command.kind === 'note'
        ? {
            ...command,
            snippet: createSearchSnippet(command.searchText, needle),
          }
        : command,
    );
}
