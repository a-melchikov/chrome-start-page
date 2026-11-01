import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Dialog } from '../ui';
import { classNames } from '../ui/class-names';

const SETTINGS_SECTIONS = [
  { value: 'appearance', label: 'Оформление' },
  { value: 'interface', label: 'Интерфейс' },
  { value: 'workspaces', label: 'Пространства' },
  { value: 'backup', label: 'Резервные копии' },
  { value: 'shortcuts', label: 'Горячие клавиши' },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['value'];

interface SettingsPanelProps {
  open: boolean;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onOpenChange: (open: boolean) => void;
  returnFocusFallback?: () => HTMLElement | null;
  children: ReactNode;
  disabledSections?: readonly SettingsSection[];
}

export function SettingsPanel({
  open,
  section,
  onSectionChange,
  onOpenChange,
  returnFocusFallback,
  children,
  disabledSections = [],
}: SettingsPanelProps) {
  const tabsId = useId();
  const contentRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const scrollContainer = contentRef.current?.parentElement;
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [section, open]);

  return (
    <Dialog
      open={open}
      size="drawer"
      title="Настройки"
      onOpenChange={onOpenChange}
      returnFocusFallback={returnFocusFallback}
      navigation={
        <div
          role="tablist"
          aria-label="Разделы настроек"
          className="flex flex-wrap gap-x-2 gap-y-1 border-b border-theme-border pb-3"
        >
          {SETTINGS_SECTIONS.map((item, index) => {
            const selected = item.value === section;
            return (
              <button
                key={item.value}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-${item.value}-tab`}
                aria-controls={`${tabsId}-${item.value}-panel`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                data-dialog-initial-focus={selected || undefined}
                disabled={disabledSections.includes(item.value)}
                className={classNames(
                  'rounded-md px-2.5 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-theme-ring disabled:cursor-not-allowed disabled:opacity-40',
                  selected
                    ? 'bg-theme-surface-elevated text-theme-accent'
                    : 'text-theme-text-secondary hover:bg-theme-surface-muted hover:text-theme-text-primary',
                )}
                onClick={() => onSectionChange(item.value)}
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const enabled = SETTINGS_SECTIONS.map(
                    (entry, entryIndex) => ({ ...entry, index: entryIndex }),
                  ).filter((entry) => !disabledSections.includes(entry.value));
                  const current = enabled.findIndex(
                    (entry) => entry.index === index,
                  );
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? enabled.length - 1
                        : (current +
                            (event.key === 'ArrowRight' ? 1 : -1) +
                            enabled.length) %
                          enabled.length;
                  const next = enabled[nextIndex];
                  if (next) {
                    onSectionChange(next.value);
                    tabRefs.current[next.index]?.focus();
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      }
    >
      {SETTINGS_SECTIONS.map((item) => (
        <section
          key={item.value}
          ref={section === item.value ? contentRef : undefined}
          role="tabpanel"
          tabIndex={0}
          id={`${tabsId}-${item.value}-panel`}
          aria-labelledby={`${tabsId}-${item.value}-tab`}
          hidden={section !== item.value}
        >
          {section === item.value ? children : null}
        </section>
      ))}
    </Dialog>
  );
}
