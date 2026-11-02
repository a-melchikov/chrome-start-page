export const DEFAULT_SETTINGS_PANEL_WIDTH = 448;
export const MIN_SETTINGS_PANEL_WIDTH = 320;
export const MAX_SETTINGS_PANEL_WIDTH = 10000;

export const SETTINGS_BLOCK_IDS = [
  'appearance.theme',
  'appearance.themeGallery',
  'appearance.background',
  'appearance.wallpaperUrl',
  'appearance.grid',
  'appearance.widgets',
  'appearance.glass',
  'interface.toolbar',
  'interface.animations',
  'workspaces.active',
  'workspaces.trash',
  'backup.export',
  'backup.import',
  'shortcuts.bindings',
  'shortcuts.general',
  'shortcuts.editing',
] as const;

export type SettingsBlockId = (typeof SETTINGS_BLOCK_IDS)[number];

export interface SettingsPanelPreferences {
  width?: number;
  collapsedBlocks?: SettingsBlockId[];
}

export function isSettingsPanelPreferences(
  value: unknown,
): value is SettingsPanelPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const preferences = value as Record<string, unknown>;
  const { width, collapsedBlocks } = preferences;
  return (
    (width === undefined ||
      (typeof width === 'number' &&
        Number.isInteger(width) &&
        width >= MIN_SETTINGS_PANEL_WIDTH &&
        width <= MAX_SETTINGS_PANEL_WIDTH)) &&
    (collapsedBlocks === undefined ||
      (Array.isArray(collapsedBlocks) &&
        collapsedBlocks.every((id: unknown) =>
          SETTINGS_BLOCK_IDS.some((known) => known === id),
        ) &&
        new Set(collapsedBlocks).size === collapsedBlocks.length))
  );
}
