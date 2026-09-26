import { useMemo, type CSSProperties } from 'react';
import type { CustomTheme } from '../../themes/types';
import { customThemeToTokens } from '../../themes/color-derivation';
import { CSS_THEME_VARIABLES_MAP } from '../../themes/registry';
import type { WidgetConfig } from '../../storage/schema';
import { MarkdownRenderer } from '../../widgets/markdown/MarkdownRenderer';
import { classNames } from '../ui/class-names';

interface ThemePreviewProps {
  customTheme: CustomTheme;
  widgets: readonly WidgetConfig[];
  className?: string;
}

export function ThemePreview({
  customTheme,
  widgets,
  className,
}: ThemePreviewProps) {
  const tokens = useMemo(() => customThemeToTokens(customTheme), [customTheme]);

  const containerStyle = useMemo(() => {
    const style: Record<string, string> = {};
    for (const [varName, tokenKey] of Object.entries(CSS_THEME_VARIABLES_MAP)) {
      if (tokens[tokenKey]) {
        style[varName] = tokens[tokenKey] as string;
      }
    }
    style['backgroundColor'] = customTheme.colors.canvasBg;
    style['color'] = customTheme.colors.textPrimary;
    return style as CSSProperties;
  }, [tokens, customTheme.colors.canvasBg, customTheme.colors.textPrimary]);

  return (
    <div
      className={classNames(
        'relative flex h-full flex-col overflow-hidden rounded-xl border border-theme-border shadow-inner',
        className,
      )}
      style={containerStyle}
      data-theme-preview
      data-theme-glow={customTheme.glow ? 'true' : 'false'}
    >
      <div className="flex items-center justify-between border-b border-theme-border bg-theme-surface/80 px-3 py-2 text-xs font-medium text-theme-text-secondary backdrop-blur-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: customTheme.colors.accent }}
          />
          Предпросмотр: {customTheme.name || 'Без названия'}
        </span>
        <span className="rounded-full border border-theme-border px-1.5 py-0.5 text-[10px]">
          {customTheme.mode === 'light' ? 'Светлая' : 'Тёмная'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {widgets.length === 0 ? (
          <SamplePreviewContent customTheme={customTheme} />
        ) : (
          <DashboardWidgetsPreview
            widgets={widgets}
            customTheme={customTheme}
          />
        )}
      </div>
    </div>
  );
}

function SamplePreviewContent({ customTheme }: { customTheme: CustomTheme }) {
  const c = customTheme.colors;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Sample Card 1: Markdown / Note */}
      <div
        className="flex flex-col gap-2 rounded-lg border p-3 shadow-xs"
        style={{
          backgroundColor: c.surfaceBg,
          borderColor: c.border,
          color: c.textPrimary,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{ color: c.textPrimary }}
          >
            Заметки
          </span>
          <span
            className="rounded px-1 text-[10px]"
            style={{ backgroundColor: c.surfaceMuted, color: c.textMuted }}
          >
            Markdown
          </span>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: c.textSecondary }}
        >
          Так выглядит основной и дополнительный текст на карточке.
        </p>
        <div
          className="rounded border p-1.5 font-mono text-[11px]"
          style={{
            backgroundColor: c.codeBg,
            borderColor: c.codeBorder,
            color: c.textPrimary,
          }}
        >
          const mode = '{customTheme.mode}';
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span style={{ color: c.textPrimary }}>Ссылка на ресурс ›</span>
          <span style={{ color: c.textMuted }}>2 мин назад</span>
        </div>
      </div>

      {/* Sample Card 2: Interactive elements / Pomodoro */}
      <div
        className="flex flex-col justify-between gap-3 rounded-lg border p-3 shadow-xs"
        style={{
          backgroundColor: c.surfaceBg,
          borderColor: c.border,
          color: c.textPrimary,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{ color: c.textPrimary }}
          >
            Фокус и таймер
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: c.dangerBg,
              color: c.dangerText,
              border: `1px solid ${c.dangerBorder}`,
            }}
          >
            Pomodoro
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
            style={{
              borderColor: c.pomodoroProgress,
              backgroundColor: c.surfaceElevated,
              color: c.textPrimary,
            }}
          >
            25:00
          </div>
          <div className="flex-1 space-y-1">
            <div
              className="h-1.5 w-full rounded-full"
              style={{ backgroundColor: c.pomodoroTrack }}
            >
              <div
                className="h-1.5 rounded-full"
                style={{ width: '65%', backgroundColor: c.pomodoroProgress }}
              />
            </div>
            <span className="text-[10px]" style={{ color: c.textSecondary }}>
              Рабочий интервал 1 из 4
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md px-2 py-1 text-center text-xs font-medium shadow-xs"
            style={{
              backgroundColor: c.accent,
              color: c.accentText,
            }}
          >
            Старт
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            style={{
              backgroundColor: c.surfaceElevated,
              borderColor: c.borderSubtle,
              color: c.textSecondary,
            }}
          >
            Пауза
          </button>
        </div>
      </div>

      {/* Sample Card 3: Search Bar */}
      <div className="sm:col-span-2">
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 shadow-xs"
          style={{
            backgroundColor: c.surfaceBg,
            borderColor: c.border,
            color: c.textSecondary,
          }}
        >
          <span style={{ color: c.textMuted }}>🔍</span>
          <span className="text-xs" style={{ color: c.textMuted }}>
            Поиск в интернете или закладках...
          </span>
        </div>
      </div>
    </div>
  );
}

function DashboardWidgetsPreview({
  widgets,
  customTheme,
}: {
  widgets: readonly WidgetConfig[];
  customTheme: CustomTheme;
}) {
  const c = customTheme.colors;

  return (
    <div
      className="grid grid-cols-12 gap-2"
      style={{
        gridAutoRows: '26px',
      }}
    >
      {widgets.map((widget) => {
        const colStart = Math.min(12, Math.max(0, widget.layout.x)) + 1;
        const colSpan = Math.min(13 - colStart, Math.max(1, widget.layout.w));
        const rowStart = Math.max(0, widget.layout.y) + 1;
        const rowSpan = Math.max(1, widget.layout.h);
        const isSearch = widget.type === 'search';

        return (
          <div
            key={widget.id}
            className={classNames(
              'flex flex-col overflow-hidden rounded-lg border shadow-xs',
              isSearch ? 'border-transparent' : 'p-2',
            )}
            style={{
              gridColumn: `${colStart} / span ${colSpan}`,
              gridRow: `${rowStart} / span ${rowSpan}`,
              backgroundColor: isSearch ? 'transparent' : c.surfaceBg,
              borderColor: isSearch ? 'transparent' : c.border,
              color: c.textPrimary,
            }}
          >
            {!isSearch && (
              <div
                className="mb-1 flex shrink-0 items-center justify-between border-b pb-1 text-[11px] font-semibold"
                style={{ borderColor: c.borderSubtle, color: c.textPrimary }}
              >
                <span className="theme-glow theme-preview-title truncate">
                  {widget.title || getWidgetFallbackTitle(widget.type)}
                </span>
                <span
                  className="rounded px-1 text-[9px]"
                  style={{
                    backgroundColor: c.surfaceMuted,
                    color: c.textMuted,
                  }}
                >
                  {widget.type}
                </span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden pointer-events-none select-none text-xs">
              <PassiveWidgetContent
                widget={widget}
                customTheme={customTheme}
                rowSpan={rowSpan}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getWidgetFallbackTitle(type: string): string {
  switch (type) {
    case 'markdown':
      return 'Заметки';
    case 'clock':
      return 'Часы';
    case 'pomodoro':
      return 'Pomodoro';
    case 'weather':
      return 'Погода';
    case 'image':
      return 'Изображение';
    default:
      return type;
  }
}

function PassiveWidgetContent({
  widget,
  customTheme,
  rowSpan,
}: {
  widget: WidgetConfig;
  customTheme: CustomTheme;
  rowSpan?: number;
}) {
  const c = customTheme.colors;

  switch (widget.type) {
    case 'search':
      return (
        <div
          className="flex h-full items-center gap-2 rounded-lg border px-3 text-xs shadow-xs"
          style={{
            backgroundColor: c.surfaceBg,
            borderColor: c.border,
            color: c.textMuted,
          }}
        >
          <span>🔍</span>
          <span className="truncate">Поиск {widget.engine || 'Google'}...</span>
        </div>
      );

    case 'clock': {
      const isCompact = (rowSpan ?? 1) <= 2;
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span
            className={classNames(
              'theme-glow font-semibold tracking-tight tabular-nums leading-none',
              isCompact ? 'text-xs' : 'text-sm',
            )}
            style={{ color: c.textPrimary }}
          >
            12:00
          </span>
          {!isCompact && (
            <span
              className="mt-1 truncate text-[9px] leading-none"
              style={{ color: c.textSecondary }}
            >
              26 сентября
            </span>
          )}
        </div>
      );
    }

    case 'pomodoro':
      return (
        <div className="flex items-center gap-2 py-1">
          <span
            className="theme-glow flex size-7 items-center justify-center rounded-full border text-[10px] font-bold"
            style={{
              borderColor: c.pomodoroProgress,
              backgroundColor: c.surfaceElevated,
              color: c.pomodoroProgress,
            }}
          >
            25:00
          </span>
          <div className="flex-1">
            <div
              className="h-1 w-full rounded-full"
              style={{ backgroundColor: c.pomodoroTrack }}
            >
              <div
                className="h-1 rounded-full"
                style={{ width: '40%', backgroundColor: c.pomodoroProgress }}
              />
            </div>
            <span className="text-[9px]" style={{ color: c.textMuted }}>
              Фокус
            </span>
          </div>
        </div>
      );

    case 'weather':
      return (
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">☀️</span>
            <span
              className="text-xs font-semibold"
              style={{ color: c.textPrimary }}
            >
              +20°C
            </span>
          </div>
          <span
            className="truncate text-[10px]"
            style={{ color: c.textSecondary }}
          >
            {widget.location?.type === 'city' ? widget.location.name : 'Город'}
          </span>
        </div>
      );

    case 'markdown':
      return (
        <div className="h-full overflow-hidden text-[10px] leading-snug">
          <MarkdownRenderer content={widget.content?.trim() || ''} compact />
        </div>
      );

    case 'image':
      return (
        <div
          className="flex h-full items-center justify-center rounded text-[10px]"
          style={{ backgroundColor: c.surfaceElevated, color: c.textMuted }}
        >
          {widget.source?.type === 'local'
            ? '🖼️ Фото'
            : widget.source?.type === 'url'
              ? '🖼️ Фото по ссылке'
              : 'Изображение'}
        </div>
      );

    default:
      return null;
  }
}
