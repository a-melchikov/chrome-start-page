import type { ComponentType, ReactNode } from 'react';

import type { WidgetConfig, WidgetType } from '../storage/schema';
import { createWidgetId } from './create-widget-id';
import { createDefaultMarkdownWidget } from './markdown/defaults';
import { MarkdownWidget } from './markdown/MarkdownWidget';
import { MarkdownWidgetEditor } from './markdown/MarkdownWidgetEditor';
import type { MarkdownWidgetConfig } from './markdown/types';
import { createDefaultPomodoroWidget } from './pomodoro/defaults';
import { PomodoroWidget } from './pomodoro/PomodoroWidget';
import { PomodoroWidgetEditor } from './pomodoro/PomodoroWidgetEditor';
import type { PomodoroWidgetConfig } from './pomodoro/types';
import { createDefaultSearchWidget } from './search/defaults';
import { isSearchEngine } from './search/engines';
import { SearchWidget } from './search/SearchWidget';
import { SearchWidgetEditor } from './search/SearchWidgetEditor';
import type { SearchWidgetConfig } from './search/types';

export interface WidgetMetadata {
  name: string;
  description: string;
}

export type WidgetResizeHandle = 'e' | 'se';

export interface WidgetLayoutConstraints {
  minW: number;
  minH: number;
  maxH?: number;
  resizeHandles: readonly WidgetResizeHandle[];
}

export interface WidgetPresentation {
  chrome: 'card' | 'bare';
  editor: 'inline' | 'dialog';
  allowCustomTitle: boolean;
  editorTitle?: string;
  editorDialogSize?: 'default' | 'fullscreen';
  titleStyle?: 'default' | 'prominent';
  layout: WidgetLayoutConstraints;
}

export interface WidgetRenderProps<TConfig extends WidgetConfig> {
  config: TConfig;
  onChange?: (config: TConfig) => void;
}

export interface WidgetEditorProps<TConfig extends WidgetConfig> {
  config: TConfig;
  onChange: (config: TConfig) => void;
  onRequestFinish: () => void;
}

interface WidgetDefinition<TConfig extends WidgetConfig> {
  type: TConfig['type'];
  metadata: WidgetMetadata;
  create: (id: string, index: number) => TConfig;
  isConfig: (value: unknown) => value is TConfig;
  Renderer: ComponentType<WidgetRenderProps<TConfig>>;
  Editor?: ComponentType<WidgetEditorProps<TConfig>>;
  canFinishEditing?: (config: TConfig) => boolean;
  presentation: WidgetPresentation;
}

export interface RegisteredWidgetDefinition {
  type: WidgetType;
  metadata: WidgetMetadata;
  presentation: WidgetPresentation;
  create: (id: string, index: number) => WidgetConfig;
  render: (
    config: unknown,
    onChange?: (config: WidgetConfig) => void,
  ) => ReactNode | null;
  renderEditor?: (
    config: unknown,
    onChange: (config: WidgetConfig) => void,
    onRequestFinish: () => void,
  ) => ReactNode | null;
  canFinishEditing?: (config: unknown) => boolean;
}

function defineWidget<TConfig extends WidgetConfig>(
  definition: WidgetDefinition<TConfig>,
): RegisteredWidgetDefinition {
  const Renderer = definition.Renderer;
  const Editor = definition.Editor;

  return {
    type: definition.type,
    metadata: definition.metadata,
    presentation: definition.presentation,
    create: definition.create,
    render: (config, onChange) =>
      definition.isConfig(config) ? (
        <Renderer
          config={config}
          onChange={onChange ? (nextConfig) => onChange(nextConfig) : undefined}
        />
      ) : null,
    renderEditor: Editor
      ? (config, onChange, onRequestFinish) =>
          definition.isConfig(config) ? (
            <Editor
              config={config}
              onChange={onChange}
              onRequestFinish={onRequestFinish}
            />
          ) : null
      : undefined,
    canFinishEditing: definition.canFinishEditing
      ? (config) =>
          definition.isConfig(config)
            ? definition.canFinishEditing?.(config) === true
            : false
      : undefined,
  };
}

function isMarkdownWidgetConfig(value: unknown): value is MarkdownWidgetConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'markdown' &&
    'content' in value &&
    typeof value.content === 'string'
  );
}

function isSearchWidgetConfig(value: unknown): value is SearchWidgetConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'search' &&
    'engine' in value &&
    isSearchEngine(value.engine)
  );
}

function isPomodoroWidgetConfig(value: unknown): value is PomodoroWidgetConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'pomodoro' &&
    'workDuration' in value &&
    typeof value.workDuration === 'number' &&
    'shortBreakDuration' in value &&
    typeof value.shortBreakDuration === 'number' &&
    'longBreakDuration' in value &&
    typeof value.longBreakDuration === 'number' &&
    'longBreakInterval' in value &&
    typeof value.longBreakInterval === 'number' &&
    'soundEnabled' in value &&
    typeof value.soundEnabled === 'boolean'
  );
}

const definitions: readonly RegisteredWidgetDefinition[] = [
  defineWidget<MarkdownWidgetConfig>({
    type: 'markdown',
    metadata: {
      name: 'Markdown',
      description: 'Текст, списки, ссылки, таблицы, задачи и код.',
    },
    create: createDefaultMarkdownWidget,
    isConfig: isMarkdownWidgetConfig,
    Renderer: MarkdownWidget,
    Editor: MarkdownWidgetEditor,
    presentation: {
      chrome: 'card',
      editor: 'dialog',
      allowCustomTitle: true,
      editorTitle: 'Редактор Markdown',
      editorDialogSize: 'fullscreen',
      titleStyle: 'prominent',
      layout: {
        minW: 3,
        minH: 3,
        resizeHandles: ['se'],
      },
    },
  }),
  defineWidget<SearchWidgetConfig>({
    type: 'search',
    metadata: {
      name: 'Поиск',
      description: 'Поиск через выбранную поисковую систему.',
    },
    create: createDefaultSearchWidget,
    isConfig: isSearchWidgetConfig,
    Renderer: SearchWidget,
    Editor: SearchWidgetEditor,
    presentation: {
      chrome: 'bare',
      editor: 'dialog',
      allowCustomTitle: false,
      editorTitle: 'Настройки поиска',
      layout: {
        minW: 3,
        minH: 1,
        maxH: 1,
        resizeHandles: ['e'],
      },
    },
  }),
  defineWidget<PomodoroWidgetConfig>({
    type: 'pomodoro',
    metadata: {
      name: 'Помодоро',
      description: 'Таймер фокуса и перерывов по методу Pomodoro.',
    },
    create: createDefaultPomodoroWidget,
    isConfig: isPomodoroWidgetConfig,
    Renderer: PomodoroWidget,
    Editor: PomodoroWidgetEditor,
    presentation: {
      chrome: 'card',
      editor: 'dialog',
      allowCustomTitle: true,
      editorTitle: 'Настройки Помодоро',
      editorDialogSize: 'default',
      titleStyle: 'default',
      layout: {
        minW: 3,
        minH: 4,
        resizeHandles: ['se'],
      },
    },
  }),
];

const registry = new Map(
  definitions.map((definition) => [definition.type, definition]),
);

export function getAvailableWidgetDefinitions(): readonly RegisteredWidgetDefinition[] {
  return definitions;
}

export function getWidgetDefinition(
  type: string,
): RegisteredWidgetDefinition | undefined {
  return registry.get(type as WidgetType);
}

export function createWidgetConfig(
  type: WidgetType,
  index: number,
): WidgetConfig | null {
  const definition = getWidgetDefinition(type);
  return definition?.create(createWidgetId(), index) ?? null;
}
