import { useEffect } from 'react';
import type { AnimationMode, ToolbarConfig } from '../../storage/schema';
import { isToolbarConfig } from '../../storage/migrations';
import { Select } from '../ui';
import { SettingsBlock } from './SettingsBlock';
import { useSettingsPanelState } from './settings-panel-state';
import type { AppearanceSection } from './command-catalog';

interface InterfaceSettingsProps {
  toolbar: ToolbarConfig;
  animationMode?: AnimationMode;
  onAnimationModeChange: (mode: AnimationMode) => void;
  onToolbarChange: (toolbar: ToolbarConfig) => void;
  requestedSection?: { section: AppearanceSection; token: number } | null;
}

export function InterfaceSettings({
  toolbar,
  animationMode = 'system',
  onAnimationModeChange,
  onToolbarChange,
  requestedSection,
}: InterfaceSettingsProps) {
  const setBlocksOpen = useSettingsPanelState()?.setBlocksOpen;
  useEffect(() => {
    if (requestedSection?.section === 'toolbar')
      setBlocksOpen?.(['interface.toolbar'], true);
  }, [requestedSection, setBlocksOpen]);

  return (
    <div className="space-y-5">
      <SettingsBlock
        blockId="interface.toolbar"
        title="Панель управления"
        data-appearance-section="toolbar"
      >
        <div className="space-y-3 ">
          <label className="block space-y-2 text-sm">
            <span>Расположение и видимость</span>
            <Select
              dropdownPosition="static"
              aria-label="Расположение и видимость"
              value={toolbar.mode}
              options={[
                { value: 'top-right', label: 'Справа сверху' },
                { value: 'left-fixed', label: 'Слева — всегда видна' },
                {
                  value: 'left-collapsible',
                  label: 'Слева — скрываемая',
                },
              ]}
              onValueChange={(mode) => {
                const next = { mode };
                if (isToolbarConfig(next)) onToolbarChange(next);
              }}
            />
          </label>
        </div>
      </SettingsBlock>
      <SettingsBlock blockId="interface.animations" title="Анимации">
        <label className="block space-y-2 text-sm">
          <span>Движение интерфейса и погоды</span>
          <Select
            aria-label="Режим анимации"
            dropdownPosition="static"
            value={animationMode}
            options={[
              { value: 'system', label: 'По системе' },
              { value: 'reduced', label: 'Сокращённые' },
              { value: 'off', label: 'Выключены' },
            ]}
            onValueChange={(mode) => {
              if (mode === 'system' || mode === 'reduced' || mode === 'off')
                onAnimationModeChange(mode);
            }}
          />
        </label>
        <p className="text-xs text-theme-text-secondary">
          Сокращённые анимации оставляют короткие переходы прозрачности. GIF
          управляются отдельно.
        </p>
      </SettingsBlock>
    </div>
  );
}
