import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';

import type { DashboardConfig } from '../../storage/schema';
import { Dialog } from '../ui';
import {
  buildCommandCatalog,
  filterCommands,
  type PaletteCommand,
} from './command-catalog';

interface CommandPaletteProps {
  config: DashboardConfig | null;
  isEditing: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (command: PaletteCommand) => void;
  isCommandDisabled?: (command: PaletteCommand) => boolean;
}

export function CommandPalette({
  config,
  isEditing,
  open,
  onOpenChange,
  onSelect,
  isCommandDisabled = () => false,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const catalog = useMemo(
    () => (config ? buildCommandCatalog(config, isEditing) : []),
    [config, isEditing],
  );
  const results = useMemo(
    () =>
      filterCommands(
        showThemes
          ? catalog.filter((command) => command.kind === 'theme')
          : catalog,
        query,
      ),
    [catalog, query, showThemes],
  );

  useEffect(() => {
    if (!open) return;
    const selected = results[selectedIndex];
    if (!selected) return;
    document
      .getElementById(`palette-${selected.id}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, results, selectedIndex]);

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('');
      setSelectedIndex(0);
      setShowThemes(false);
    }
    onOpenChange(nextOpen);
  };

  const select = (command: PaletteCommand) => {
    if (isCommandDisabled(command)) return;
    if (command.kind === 'action' && command.action === 'themes') {
      setShowThemes(true);
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    changeOpen(false);
    window.setTimeout(() => onSelect(command), 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[selectedIndex];
      if (selected) select(selected);
    } else if (event.key === 'Backspace' && !query && showThemes) {
      event.preventDefault();
      setShowThemes(false);
    }
  };

  return (
    <Dialog
      open={open}
      size="launcher"
      title="Поиск команд"
      onOpenChange={changeOpen}
    >
      <div className="flex max-h-[calc(100dvh-5rem)] min-h-0 flex-col min-[36rem]:max-h-[calc(100dvh-2rem)]">
        <input
          data-dialog-initial-focus
          className="h-[50px] w-full shrink-0 rounded-xl border border-theme-border bg-theme-surface px-3 text-sm text-theme-text-primary shadow-lg outline-none placeholder:text-theme-text-muted"
          aria-activedescendant={
            results[selectedIndex]
              ? `palette-${results[selectedIndex].id}`
              : undefined
          }
          aria-controls="palette-results"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Поиск команд"
          autoComplete="off"
          placeholder={
            showThemes ? 'Найти тему…' : 'Найти действие, виджет или ссылку…'
          }
          role="combobox"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="mt-2 flex min-h-0 flex-col overflow-hidden rounded-lg border border-theme-border bg-theme-surface shadow-2xl">
          {showThemes ? (
            <button
              className="shrink-0 px-3 py-2 text-left text-sm text-theme-accent"
              type="button"
              onClick={() => setShowThemes(false)}
            >
              ← Все команды
            </button>
          ) : null}
          <div
            id="palette-results"
            aria-label="Результаты"
            className="command-palette-results min-h-0 max-h-[min(24rem,50dvh)] space-y-1 overflow-y-auto p-2"
            role="listbox"
          >
            {results.length ? (
              results.map((command, index) => (
                <button
                  key={command.id}
                  id={`palette-${command.id}`}
                  aria-selected={index === selectedIndex}
                  disabled={isCommandDisabled(command)}
                  className={`flex w-full flex-col rounded-md border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme-ring disabled:cursor-not-allowed disabled:opacity-50 ${index === selectedIndex ? 'border-theme-accent/50 bg-theme-accent/10 text-theme-text-primary' : 'border-transparent text-theme-text-secondary hover:bg-theme-surface-muted'}`}
                  role="option"
                  type="button"
                  onClick={() => select(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-sm font-medium">{command.label}</span>
                  <span className="text-xs text-theme-text-muted">
                    {command.category}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-sm text-theme-text-muted">
                Ничего не найдено
              </p>
            )}
          </div>
          <p className="shrink-0 border-t border-theme-border-subtle px-3 py-2 text-xs text-theme-text-muted">
            ↑ ↓ — выбор · Enter — выполнить · Esc — закрыть
          </p>
        </div>
      </div>
    </Dialog>
  );
}
