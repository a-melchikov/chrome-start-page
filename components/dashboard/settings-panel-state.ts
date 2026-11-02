import { createContext, useContext } from 'react';

import type { SettingsBlockId } from '../../storage/settings-panel';

export interface SettingsPanelState {
  collapsedBlocks: readonly SettingsBlockId[];
  setBlocksOpen: (ids: readonly SettingsBlockId[], open: boolean) => void;
}

export const SettingsPanelStateContext =
  createContext<SettingsPanelState | null>(null);

export function useSettingsPanelState() {
  return useContext(SettingsPanelStateContext);
}
