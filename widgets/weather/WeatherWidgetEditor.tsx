import { useEffect, useId, useRef, useState } from 'react';

import { Button, Input } from '../../components/ui';
import { searchCities } from './api';
import { WeatherWidget } from './WeatherWidget';
import type { WeatherLocation, WeatherWidgetConfig } from './types';

export interface WeatherWidgetEditorProps {
  config: WeatherWidgetConfig;
  onChange: (config: WeatherWidgetConfig) => void;
  onRequestFinish: () => void;
}

export function WeatherWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: WeatherWidgetEditorProps) {
  const searchInputId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Extract<WeatherLocation, { type: 'city' }>[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced city search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchCities(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(results);
          setSelectedIndex(results.length > 0 ? 0 : -1);
          setIsSearching(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setIsSearching(false);
          setSearchError(
            error instanceof Error
              ? error.message
              : 'Не удалось выполнить поиск городов',
          );
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setSelectedIndex(-1);
    }
  };

  const handleSelectCity = (
    city: Extract<WeatherLocation, { type: 'city' }>,
  ) => {
    onChange({
      ...config,
      location: city,
    });
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const city = searchResults[selectedIndex];
      if (city) {
        handleSelectCity(city);
      }
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="space-y-4 text-theme-text-primary">
      {/* Live Preview */}
      <div className="rounded-xl border border-theme-border/60 bg-theme-surface/50 p-3 shadow-xs">
        <div className="mb-2 text-xs font-medium text-theme-text-muted">
          Предпросмотр
        </div>
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-theme-border bg-theme-surface-elevated/40">
          <WeatherWidget config={config} />
        </div>
      </div>

      {/* Mode selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-theme-text-primary">
          Вид оформления
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              config.mode === 'visual'
                ? 'border-theme-accent bg-theme-accent/10 text-theme-accent'
                : 'border-theme-border bg-theme-surface text-theme-text-secondary hover:bg-theme-surface-elevated'
            }`}
            type="button"
            onClick={() => onChange({ ...config, mode: 'visual' })}
          >
            Визуальный
          </button>
          <button
            className={`flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              config.mode === 'compact'
                ? 'border-theme-accent bg-theme-accent/10 text-theme-accent'
                : 'border-theme-border bg-theme-surface text-theme-text-secondary hover:bg-theme-surface-elevated'
            }`}
            type="button"
            onClick={() => onChange({ ...config, mode: 'compact' })}
          >
            Компактный
          </button>
        </div>
      </div>

      {/* Current location status */}
      <div className="rounded-lg border border-theme-border/50 bg-theme-surface/30 p-2.5 text-xs">
        <div className="text-theme-text-muted">Текущее место:</div>
        <div className="mt-0.5 font-medium text-theme-text-primary">
          {config.location.type === 'unset'
            ? 'Не настроено'
            : `${config.location.name}${
                config.location.region ? `, ${config.location.region}` : ''
              }, ${config.location.country}`}
        </div>
      </div>

      {/* City Search */}
      <div className="space-y-1.5">
        <label
          className="block text-xs font-medium text-theme-text-primary"
          htmlFor={searchInputId}
        >
          Поиск города
        </label>

        <div className="relative">
          <Input
            id={searchInputId}
            placeholder="Введите название (от 3 букв)…"
            value={searchQuery}
            onChange={handleSearchQueryChange}
            onKeyDown={handleKeyDown}
          />

          {isSearching && (
            <div className="absolute right-3 top-2.5 size-4 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
          )}

          {searchError && (
            <p className="mt-1 text-[11px] text-theme-danger">{searchError}</p>
          )}

          {/* Suggestions list */}
          {searchResults.length > 0 && (
            <ul
              aria-label="Подсказки городов"
              className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-theme-border bg-theme-surface-elevated p-1 shadow-lg"
              role="listbox"
            >
              {searchResults.map((city, idx) => (
                <li
                  key={city.id}
                  aria-selected={idx === selectedIndex}
                  className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    idx === selectedIndex
                      ? 'bg-theme-accent text-white'
                      : 'text-theme-text-primary hover:bg-theme-surface'
                  }`}
                  role="option"
                  onClick={() => handleSelectCity(city)}
                >
                  <span className="font-medium">{city.name}</span>
                  <span
                    className={`ml-1 text-[11px] ${
                      idx === selectedIndex
                        ? 'text-white/80'
                        : 'text-theme-text-muted'
                    }`}
                  >
                    {[city.region, city.country].filter(Boolean).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {searchQuery.trim().length >= 3 &&
            !isSearching &&
            searchResults.length === 0 &&
            !searchError && (
              <p className="mt-1 text-[11px] text-theme-text-muted">
                Города не найдены
              </p>
            )}
        </div>
      </div>

      {/* Dialog footer */}
      <div className="flex justify-end pt-2">
        <Button size="small" variant="primary" onClick={onRequestFinish}>
          Готово
        </Button>
      </div>
    </div>
  );
}
