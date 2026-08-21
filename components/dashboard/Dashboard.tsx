import { useState } from 'react';

import type {
  AppearanceConfig,
  DashboardConfig,
  WidgetConfig,
  WidgetType,
} from '../../storage/schema';
import { createWidgetConfig } from '../../widgets/registry';
import { DashboardControls } from './DashboardControls';
import { WidgetCanvas } from './WidgetCanvas';

interface DashboardProps {
  appearance: AppearanceConfig;
  config: DashboardConfig | null;
  isLoading: boolean;
  onAddWidget: (widget: WidgetConfig) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onRemoveWidget: (widgetId: string) => void;
}

export function Dashboard({
  appearance,
  config,
  isLoading,
  onAddWidget,
  onAppearanceChange,
  onRemoveWidget,
}: DashboardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const addWidget = (type: WidgetType) => {
    const widget = createWidgetConfig(type, config?.widgets.length ?? 0);

    if (widget) {
      onAddWidget(widget);
    }
  };

  return (
    <>
      {config ? (
        <WidgetCanvas
          isEditing={isEditing}
          widgets={config.widgets}
          onRemoveWidget={onRemoveWidget}
        />
      ) : null}

      <DashboardControls
        appearance={appearance}
        canManageWidgets={!isLoading && config !== null}
        isEditing={isEditing}
        onAddWidget={addWidget}
        onAppearanceChange={onAppearanceChange}
        onEditingChange={setIsEditing}
      />
    </>
  );
}
