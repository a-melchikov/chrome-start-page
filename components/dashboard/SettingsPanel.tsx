import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSettingsPanelResize } from '../../hooks/use-settings-panel-resize';
import type {
  SettingsBlockId,
  SettingsPanelPreferences,
} from '../../storage/settings-panel';
import { Dialog } from '../ui';
import { classNames } from '../ui/class-names';
import { SettingsPanelStateContext } from './settings-panel-state';

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
  preferences?: SettingsPanelPreferences;
  onPreferencesChange?: (preferences: SettingsPanelPreferences) => void;
}

export function SettingsPanel({
  open,
  section,
  onSectionChange,
  onOpenChange,
  returnFocusFallback,
  children,
  disabledSections = [],
  preferences,
  onPreferencesChange,
}: SettingsPanelProps) {
  const tabsId = useId();
  const [localPreferences, setLocalPreferences] =
    useState<SettingsPanelPreferences>({});
  const currentPreferences = preferences ?? localPreferences;
  const preferencesRef = useRef(currentPreferences);
  const onChangeRef = useRef(onPreferencesChange);
  useLayoutEffect(() => {
    preferencesRef.current = currentPreferences;
    onChangeRef.current = onPreferencesChange;
  }, [currentPreferences, onPreferencesChange]);
  const commitPreferences = useCallback((next: SettingsPanelPreferences) => {
    preferencesRef.current = next;
    if (onChangeRef.current) onChangeRef.current(next);
    else setLocalPreferences(next);
  }, []);
  const setWidth = useCallback(
    (width: number) => {
      if (preferencesRef.current.width === width) return;
      commitPreferences({ ...preferencesRef.current, width });
    },
    [commitPreferences],
  );
  const setBlocksOpen = useCallback(
    (ids: readonly SettingsBlockId[], nextOpen: boolean) => {
      const previous = preferencesRef.current.collapsedBlocks ?? [];
      const collapsed = new Set(previous);
      for (const id of ids) {
        if (nextOpen) collapsed.delete(id);
        else collapsed.add(id);
      }
      if (
        collapsed.size === previous.length &&
        previous.every((id) => collapsed.has(id))
      )
        return;
      commitPreferences({
        ...preferencesRef.current,
        collapsedBlocks: [...collapsed],
      });
    },
    [commitPreferences],
  );
  const resize = useSettingsPanelResize({
    open,
    preferredWidth: currentPreferences.width,
    onCommit: setWidth,
  });
  const contentRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const scrollContainer = contentRef.current?.parentElement;
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [section, open]);

  return (
    <SettingsPanelStateContext.Provider
      value={{
        collapsedBlocks: currentPreferences.collapsedBlocks ?? [],
        setBlocksOpen,
      }}
    >
      <Dialog
        id={tabsId}
        open={open}
        size="drawer"
        style={{ width: resize.width }}
        title="Настройки"
        onOpenChange={onOpenChange}
        returnFocusFallback={returnFocusFallback}
        navigation={
          <>
            <div
              {...resize.handleProps}
              role="separator"
              aria-label="Ширина панели настроек"
              aria-orientation="vertical"
              aria-controls={tabsId}
              aria-valuemin={resize.minWidth}
              aria-valuemax={resize.maxWidth}
              aria-valuenow={resize.width}
              aria-valuetext={`${resize.width} пикселей`}
              tabIndex={0}
              title="Потяните для изменения ширины. Двойной щелчок — стандартная ширина"
              className="absolute inset-y-0 left-0 z-20 flex w-3 cursor-ew-resize touch-none select-none items-center justify-center outline-none hover:bg-theme-surface-elevated focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring"
            >
              <span className="h-10 w-0.5 rounded-full bg-theme-text-secondary/50" />
            </div>
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
                        (entry, entryIndex) => ({
                          ...entry,
                          index: entryIndex,
                        }),
                      ).filter(
                        (entry) => !disabledSections.includes(entry.value),
                      );
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
          </>
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
    </SettingsPanelStateContext.Provider>
  );
}
