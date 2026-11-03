import { Button } from '../../components/ui';
import { EventsWidget } from './EventsWidget';
import type { EventsWidgetConfig } from './types';

export function EventsWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: {
  config: EventsWidgetConfig;
  onChange: (config: EventsWidgetConfig) => void;
  onRequestFinish: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="h-96 max-h-[60dvh]">
        <EventsWidget config={config} onChange={onChange} showPast />
      </div>
      <div className="flex justify-end">
        <Button size="small" onClick={onRequestFinish}>
          Готово
        </Button>
      </div>
    </div>
  );
}
