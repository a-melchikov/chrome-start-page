import { Dialog } from '../../components/ui';
import { MARKDOWN_TEMPLATES } from './templates';
import type { MarkdownTemplateId } from './types';

interface SelectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: MarkdownTemplateId) => void;
}

export function SelectTemplateDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: SelectTemplateDialogProps) {
  const handleSelect = (templateId: MarkdownTemplateId) => {
    onSelectTemplate(templateId);
    onOpenChange(false);
  };

  return (
    <Dialog
      description="Шаблон задаст начальную структуру и поведение строки быстрого ввода."
      open={open}
      title="Выберите шаблон заметки"
      onOpenChange={onOpenChange}
    >
      <div className="space-y-2 pb-2">
        {MARKDOWN_TEMPLATES.map((template, index) => (
          <button
            key={template.id}
            className="w-full rounded-lg border border-theme-border/60 bg-theme-surface p-3 text-left transition-colors hover:border-theme-accent hover:bg-theme-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            data-dialog-initial-focus={index === 0 ? true : undefined}
            title={template.description}
            type="button"
            onClick={() => handleSelect(template.id)}
          >
            <div className="text-sm font-semibold text-theme-text-primary">
              {template.name}
            </div>
            <div className="mt-1 text-xs text-theme-text-secondary">
              {template.description}
            </div>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
