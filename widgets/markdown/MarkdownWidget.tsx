import { MarkdownRenderer } from './MarkdownRenderer';
import type { MarkdownWidgetConfig } from './types';

interface MarkdownWidgetProps {
  config: MarkdownWidgetConfig;
  onChange?: (config: MarkdownWidgetConfig) => void;
}

export function MarkdownWidget({ config, onChange }: MarkdownWidgetProps) {
  return (
    <MarkdownRenderer
      content={config.content}
      onContentChange={
        onChange
          ? (content) => {
              onChange({ ...config, content });
            }
          : undefined
      }
    />
  );
}
