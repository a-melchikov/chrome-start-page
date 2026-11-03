import { useEffect, useRef, useState } from 'react';

import { FEATURE_GROUPS } from '../../app/features';
import { RELEASE_NOTES } from '../../app/release-notes';
import { APP_VERSION } from '../../app/version';
import { MarkdownRenderer } from '../../widgets/markdown/MarkdownRenderer';
import { Button, Input, Select } from '../ui';
import { classNames } from '../ui/class-names';
import { Disclosure } from '../ui/Disclosure';

export function AboutSettings() {
  const [view, setView] = useState<'features' | 'history'>('features');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState('all');
  const [expandedVersions, setExpandedVersions] = useState([APP_VERSION]);
  const [requestedRelease, setRequestedRelease] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const normalize = (text: string) =>
    text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const needle = normalize(query);
  const groups = FEATURE_GROUPS.map((group) => ({
    ...group,
    features: group.features.filter(
      (feature) =>
        (version === 'all' || feature.introducedIn === version) &&
        normalize(
          [group.title, feature.title, feature.description, feature.usage].join(
            ' ',
          ),
        ).includes(needle),
    ),
  })).filter((group) => group.features.length > 0);
  const count = groups.reduce(
    (total, group) => total + group.features.length,
    0,
  );

  useEffect(() => {
    if (view !== 'history' || !requestedRelease) return;
    historyRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-release-version="${requestedRelease}"] button`,
      )
      ?.focus();
  }, [view, requestedRelease]);

  const resetFilters = () => {
    setQuery('');
    setVersion('all');
  };

  return (
    <div className="space-y-6 pb-3">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-theme-text-primary">
          Chrome Start Page
        </h2>
        <p className="text-sm leading-relaxed text-theme-text-secondary">
          Локальная стартовая страница с виджетами и рабочими пространствами.
        </p>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-theme-text-secondary">
          <span className="font-semibold tabular-nums text-theme-text-primary">
            Версия {APP_VERSION}
          </span>
          <span>
            {
              RELEASE_NOTES.find((release) => release.version === APP_VERSION)
                ?.status
            }
          </span>
        </p>
      </header>

      <div
        role="group"
        aria-label="Сведения о приложении"
        className="flex flex-wrap gap-2 border-b border-theme-border pb-3"
      >
        {(
          [
            ['features', 'Возможности'],
            ['history', 'История изменений'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            aria-controls={`about-${value}`}
            className={classNames(
              'rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-theme-ring',
              view === value
                ? 'bg-theme-surface-elevated text-theme-accent'
                : 'text-theme-text-secondary hover:bg-theme-surface-muted hover:text-theme-text-primary',
            )}
            onClick={() => {
              setRequestedRelease(null);
              setView(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <section
        id="about-features"
        aria-label="Возможности приложения"
        hidden={view !== 'features'}
        className="space-y-5"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-theme-text-secondary">
            Все возможности текущей версии и как ими пользоваться. Версия рядом
            с функцией указывает её первое появление; последующие улучшения
            описаны в истории.
          </p>
          <label className="block space-y-1.5 text-sm text-theme-text-primary">
            <span>Поиск по возможностям</span>
            <Input
              type="search"
              value={query}
              placeholder="Например, задачи или обои"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm text-theme-text-primary">
            <span id="about-version-label">Версия появления</span>
            <Select
              aria-labelledby="about-version-label"
              value={version}
              onValueChange={setVersion}
              options={[
                { value: 'all', label: 'Все версии' },
                ...RELEASE_NOTES.map((release) => ({
                  value: release.version,
                  label: release.version,
                })),
              ]}
            />
          </label>
          <p role="status" className="text-sm text-theme-text-secondary">
            Найдено возможностей: {count}
          </p>
        </div>

        {count === 0 ? (
          <div className="space-y-3 py-3">
            <p className="text-sm text-theme-text-primary">
              По этим условиям ничего не найдено. Измените запрос или выберите
              другую версию.
            </p>
            <Button variant="secondary" size="small" onClick={resetFilters}>
              Сбросить поиск и фильтр
            </Button>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.title}
              aria-label={group.title}
              className="space-y-4"
            >
              <h3 className="border-b border-theme-border pb-2 text-base font-semibold text-theme-text-primary">
                {group.title}
              </h3>
              <div className="space-y-5">
                {group.features.map((feature) => (
                  <article key={feature.id} className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className="text-sm font-semibold text-theme-text-primary">
                        {feature.title}
                      </h4>
                      <button
                        type="button"
                        aria-label={`${feature.title}: история версии ${feature.introducedIn}`}
                        className="rounded-sm text-xs tabular-nums text-theme-accent underline decoration-theme-accent/40 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-theme-ring"
                        onClick={() => {
                          setExpandedVersions([feature.introducedIn]);
                          setRequestedRelease(feature.introducedIn);
                          setView('history');
                        }}
                      >
                        С версии {feature.introducedIn}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-theme-text-secondary">
                      {feature.description}
                    </p>
                    <p className="text-sm leading-relaxed text-theme-text-secondary">
                      <span className="font-medium text-theme-text-primary">
                        Как использовать:{' '}
                      </span>
                      {feature.usage}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </section>

      <section
        id="about-history"
        aria-label="История версий"
        hidden={view !== 'history'}
        className="space-y-4"
      >
        <p className="text-sm leading-relaxed text-theme-text-secondary">
          История 0.1.0 и 0.1.1 восстановлена по Git. Указанные в записях даты
          относятся к разработке; даты публикации этих выпусков не подтверждены.
        </p>
        <div ref={historyRef} className="space-y-3">
          {RELEASE_NOTES.map((release) => (
            <div key={release.version} data-release-version={release.version}>
              <Disclosure
                title={`${release.version} — ${release.status}`}
                open={expandedVersions.includes(release.version)}
                onOpenChange={(open) =>
                  setExpandedVersions((previous) =>
                    open
                      ? [...previous, release.version]
                      : previous.filter((item) => item !== release.version),
                  )
                }
              >
                <div className="px-4 pb-4">
                  <MarkdownRenderer content={release.content} />
                </div>
              </Disclosure>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
