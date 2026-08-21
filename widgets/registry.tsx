import type { ComponentType, ReactNode } from 'react';

import type { WidgetConfig, WidgetType } from '../storage/schema';
import { createWidgetId } from './create-widget-id';
import { createDefaultLinksWidget } from './links/defaults';
import { LinksWidget } from './links/LinksWidget';
import { LinksWidgetEditor } from './links/LinksWidgetEditor';
import { parseLinksContent } from './links/parser';
import type { LinksWidgetConfig } from './links/types';

export interface WidgetMetadata {
  name: string;
  description: string;
}

export interface WidgetRenderProps<TConfig extends WidgetConfig> {
  config: TConfig;
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
}

export interface RegisteredWidgetDefinition {
  type: WidgetType;
  metadata: WidgetMetadata;
  create: (id: string, index: number) => WidgetConfig;
  render: (config: unknown) => ReactNode | null;
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
    create: definition.create,
    render: (config) =>
      definition.isConfig(config) ? <Renderer config={config} /> : null,
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

function isLinksWidgetConfig(value: unknown): value is LinksWidgetConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'links' &&
    'content' in value &&
    typeof value.content === 'string'
  );
}

const definitions: readonly RegisteredWidgetDefinition[] = [
  defineWidget<LinksWidgetConfig>({
    type: 'links',
    metadata: {
      name: 'Список ссылок',
      description: 'Компактный список ссылок из Markdown-текста.',
    },
    create: createDefaultLinksWidget,
    isConfig: isLinksWidgetConfig,
    Renderer: LinksWidget,
    Editor: LinksWidgetEditor,
    canFinishEditing: (config) =>
      parseLinksContent(config.content).validation.isValid,
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
