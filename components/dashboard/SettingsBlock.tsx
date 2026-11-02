import { useState, type ReactNode } from 'react';

import type { SettingsBlockId } from '../../storage/settings-panel';
import { Disclosure } from '../ui/Disclosure';
import { useSettingsPanelState } from './settings-panel-state';

interface SettingsBlockProps {
  blockId: SettingsBlockId;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  'data-appearance-section'?: string;
}

export function SettingsBlock({
  blockId,
  title,
  children,
  className,
  contentClassName = 'space-y-3',
  'data-appearance-section': section,
}: SettingsBlockProps) {
  const state = useSettingsPanelState();
  const [localOpen, setLocalOpen] = useState(true);
  const open = state ? !state.collapsedBlocks.includes(blockId) : localOpen;

  return (
    <Disclosure
      title={title}
      variant="plain"
      className={className}
      data-appearance-section={section}
      open={open}
      onOpenChange={(next) => {
        if (state) state.setBlocksOpen([blockId], next);
        else setLocalOpen(next);
      }}
    >
      <div className={contentClassName}>{children}</div>
    </Disclosure>
  );
}
