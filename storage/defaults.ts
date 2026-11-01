import {
  DASHBOARD_CONFIG_VERSION,
  type AppearanceConfig,
  type DashboardConfig,
  type LiquidGlassConfig,
  type ToolbarConfig,
  type WorkspaceConfig,
} from './schema';
import { createDefaultSearchWidget } from '../widgets/search/defaults';
import { createMarkdownWidgetWithTemplate } from '../widgets/markdown/templates';
import { createDefaultPomodoroWidget } from '../widgets/pomodoro/defaults';

export const DEFAULT_LIQUID_GLASS: Readonly<LiquidGlassConfig> = {
  enabled: true,
  transparency: 40,
  blur: 18,
  shadow: 50,
};

export const DEFAULT_GRID_GAP = 16;
export const DEFAULT_GRID_PADDING = 24;
export const MAX_GRID_GAP = 48;
export const MAX_GRID_PADDING = 64;

export const DEFAULT_WIDGET_BORDER_RADIUS = 12;
export const MAX_WIDGET_BORDER_RADIUS = 40;

export const DEFAULT_TOOLBAR: Readonly<ToolbarConfig> = { mode: 'top-right' };

export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: { type: 'builtin', id: 'system' },
  backgroundColor: { type: 'theme' },
  wallpaper: { type: 'none' },
  liquidGlass: DEFAULT_LIQUID_GLASS,
};

export function createDefaultMainWorkspace(
  id = crypto.randomUUID(),
): WorkspaceConfig {
  return {
    id,
    name: 'Основной',
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: { ...DEFAULT_APPEARANCE.theme },
      backgroundColor: { ...DEFAULT_APPEARANCE.backgroundColor },
      wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
      liquidGlass: { ...DEFAULT_LIQUID_GLASS },
    },
    widgets: [],
  };
}

export function createDefaultWorkWorkspace(
  id = crypto.randomUUID(),
): WorkspaceConfig {
  const searchId = crypto.randomUUID();
  const pomodoroId = crypto.randomUUID();
  const tasksId = crypto.randomUUID();

  return {
    id,
    name: 'Работа',
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: { type: 'builtin', id: 'nord' },
      backgroundColor: { ...DEFAULT_APPEARANCE.backgroundColor },
      wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
      liquidGlass: { ...DEFAULT_LIQUID_GLASS },
    },
    widgets: [
      {
        ...createDefaultSearchWidget(searchId, 0),
        layout: { x: 0, y: 0, w: 12, h: 1 },
      },
      {
        ...createDefaultPomodoroWidget(pomodoroId, 0),
        layout: { x: 0, y: 1, w: 4, h: 4 },
      },
      {
        ...createMarkdownWidgetWithTemplate(tasksId, 0, 'tasks'),
        title: 'Задачи',
        layout: { x: 4, y: 1, w: 8, h: 4 },
      },
    ],
  };
}

export function createDefaultWorkspaces(): WorkspaceConfig[] {
  return [createDefaultMainWorkspace(), createDefaultWorkWorkspace()];
}

export function createDefaultDashboardConfig(): DashboardConfig {
  const workspaces = createDefaultWorkspaces();

  return {
    version: DASHBOARD_CONFIG_VERSION,
    toolbar: { ...DEFAULT_TOOLBAR },
    activeWorkspaceId: workspaces[0]!.id,
    workspaces,
    customThemes: [],
  };
}
