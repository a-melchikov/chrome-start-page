# Project Context

## Purpose

Chrome Start Page is a private, local-first Chrome extension that replaces the
new tab page with a configurable dashboard. Its main flow is: open a new tab,
use saved widgets, enter global edit mode to add/move/resize/configure them, and
have the complete dashboard restored from local Chrome storage.

## Current Product

Version 0.1.0 implements six repeatable widget types:

- **Markdown** — a resizable `4×3` card by default with a separate title,
  sanitized CommonMark/GFM rendering, interactive task lists, safe links and
  HTTPS images. Editing uses a fullscreen 50/50 Markdown/live-preview dialog.
- **Search** — a bare `6×1` search row by default. Google, Yandex, Bing, and
  DuckDuckGo use fixed GET endpoints and bundled brand icons. One surface places
  the colored glass-framed engine mark on the left and the magnifier submit
  button on the right. Its height is fixed; only width and engine are
  configurable.
- **Image** — a bare resizable widget (default `4×4`, minimum `2×2`) with
  rounded corners, offline local file storage or HTTPS URL, display modes (fill/cover
  with interactive drag-and-pan and zoom vs contain), quick ratio presets (`1:1`, `4:3`,
  `16:9`, original), 3×3 object positioning, grid width/height adjustment in settings,
  high-contrast resize handle in edit mode, GIF pause/play toggle on click, and floating
  overlay controls in edit mode.
- **Clock** — a card widget (default `4×2`, minimum `2×2`) displaying digital
  time, date, and day of week with full customizability: 12h/24h formats, 4 date
  presets, optional seconds, system local or IANA timezones, centered display
  without card title, timezone abbreviation, and container-query responsive text scaling.
- **Pomodoro** — a configurable focus/break timer with cycle progression,
  persistent runtime state, background alarms, notifications, and audio.
- **Weather** — a card widget (default `5×5`, minimum `3×3`) supporting visual
  and compact modes, Open-Meteo forecasts and city geocoding,
  detailed meteorological metrics, 12-hour future hourly strip, and 5-day daily forecast.
  Visual mode uses a local layered scene for sun, moon, clouds, rain, snow, fog,
  and thunderstorms. Sunlight reacts to apparent heat and UV; precipitation
  reacts to intensity and wind. The larger forecasts appear only when the card
  has enough room, and motion follows `prefers-reduced-motion`.
  Визуальная сцена заполняет карточку до краёв: город и обновление находятся
  сверху, температура и четыре показателя — снизу. На узкой карточке показатели
  переходят в сетку 2×2; компактный режим сохраняет обычную подачу данных.

The dashboard has light/dark/system themes, including the warm light presets
«Бумага и шалфей» and «Абрикосовый полдень», an arbitrary background color,
validated local or HTTPS wallpaper with full-screen cover cropping, a 12-column
draggable/resizable grid, autosave, deletion confirmation, keyboard dialog
behavior, restoration after Chrome restarts, and full versioned JSON backup and
restore (format v2) with embedded local wallpaper and image assets.

Поиск команд появляется по центру сверху только после `Ctrl+K`, `/` вне полей
ввода или нажатия на лупу. Под полем сразу раскрывается список на слегка
затемнённом фоне; клик вне поиска или Escape его закрывает. Поиск охватывает
действия, все типы и существующие экземпляры виджетов,
13 тем, разделы оформления и безопасные HTTP/HTTPS ссылки из сохранённого
Markdown. Поле остаётся на одной линии с блоком кнопок и сужается при
увеличении масштаба; на совсем узком экране оно переносится ниже. Поле и
результаты образуют одну панель с короткой анимацией появления; на экране видны
примерно шесть действий. Полоса прокрутки скрыта, но прокрутка и навигация
стрелками доступны. Выбранное действие выделяется мягким фоном. Команды
запускаются локально; экспорт скачивает backup сразу.

При открытии вкладки рабочая область один раз плавно появляется после загрузки
конфигурации; сохранённые виджеты не анимируются по отдельности. Нативные
диалоги, controls режима редактирования, новые виджеты и уведомления используют
короткие переходы opacity/transform. Цвета поверхностей плавно меняются вместе
с темой. При `prefers-reduced-motion` движения отключаются; раскрытие
`<details>` и смена обоев остаются мгновенными ради производительности.
Уведомление о прямом экспорте исчезает через четыре секунды и располагается у
нижнего края окна.

Карточки Markdown, часов, Pomodoro, компактной погоды, пустого изображения,
поверхность Search и верхняя панель управления используют включённый по
умолчанию статический Liquid Glass:
ровную полупрозрачную подложку, размытие и насыщенность фона, тонкую световую
кромку и короткую мягкую тень. Погодная сцена и готовое изображение получают
только кромку и тень. Эффект учитывает тему, оставляет обои видимыми и может быть
выключен или настроен в закрытом разделе «Виджеты» окна оформления. Доступны
прозрачность `0–100%`, размытие `0–40 px` и тень `0–100%`; defaults —
`40% / 18 px / 50%`. Панель управления использует ту же плотность подложки,
что и карточки. Диалоги остаются непрозрачными.

## Core Requirements

- Multiple independent widget instances with UUIDs and persisted layouts.
- Global edit mode controls add, delete, drag, resize, widget settings, and
  appearance. Escape exits edit mode when no dialog is active.
- В режиме редактирования доступны выделение нескольких виджетов, групповое
  перемещение и удаление, Undo/Redo для состава и компоновки, копирование и
  вставка через системный буфер, дублирование и клавиатурный сдвиг.
- User edits appear immediately in React state; editor writes are debounced but
  flushed when editing ends or the page is hidden.
- Search opens results in the current tab only after Enter/button submission;
  blank queries are blocked and query text is never stored.
- Markdown source is the only content source of truth. Task checkbox clicks
  update the exact source marker rather than a derived model.
- Existing v1 `links` data migrates to `markdown` without data or layout loss.
  V1/v2/v3 configurations migrate to schema v5 with Liquid Glass defaults; v4
  preserves its enabled state and gains numeric defaults. Legacy appearance
  without wallpaper gains `{type: 'none'}`. Existing search height is
  normalized to one row.
- Wallpaper accepts PNG, JPEG, WebP, GIF, AVIF, and SVG files or a direct HTTPS
  URL. Every source is decoded before save; failure preserves the old value and
  shows a message.
- Backup export flushes queued edits and includes widgets, appearance, and local
  wallpaper bytes. Import validates the complete file, requires explicit
  confirmation, and atomically replaces the current dashboard.
- Command palette searches only in-memory dashboard data and does not persist
  queries or require browser bookmark permissions.

## Durable Decisions

- The old specialized LinksWidget has been fully replaced by the universal
  MarkdownWidget; do not expose `links` as a current registry type.
- Widget types are a typed discriminated union registered through one registry.
- Persistence is WXT Storage over `chrome.storage.local`; no sync storage,
  localStorage, backend, account, analytics, or telemetry.
- User Markdown may contain a limited safe HTML subset only after sanitization.
- User links use Chrome's local `_favicon`; search-engine icons are bundled SVGs
  and work offline. External favicon APIs are forbidden.
- Narrow screens keep a 960 px desktop canvas and horizontal scrolling so saved
  coordinates are never silently rearranged.
- Local wallpaper and image bytes live under UUID asset keys. Files above 6 MiB
  are losslessly compressed only when that reaches the 6 MiB target; otherwise
  the original remains available through `unlimitedStorage`.
- История виджетов ограничена 50 действиями и живёт только до закрытия вкладки.
  Стрелки двигают выделение на клетку; `Shift+стрелка` перемещает его до
  ближайшей границы или препятствия. Для `Shift+↓` нижняя граница — край
  видимой области, поскольку сетка не ограничена по высоте.
  Данные изображений для Undo удерживаются временными ссылками в WXT
  `storage.session`; входящий JSON буфера проходит проверку, а вставка получает
  новые ID. При конкурирующих правках вкладок пользователь выбирает версию.
- Backup files use their own versioned envelope. Restored local assets receive a
  fresh UUID, while widget IDs are preserved; HTTPS wallpaper remains a URL and
  is revalidated before import commits.
- Карточки и компактная поверхность Search используют общий
  theme-aware Liquid Glass с общими пользовательскими значениями прозрачности,
  blur и тени. Ползунки дают live preview и сохраняются после завершения ввода;
  reset восстанавливает только числа. Реализация имеет CSS-fallback без
  `backdrop-filter` и не требует новых зависимостей или разрешений.

Rationale and rejected alternatives are in `docs/DECISIONS.md`.

## Platform and Privacy Constraints

- Manifest V3 permissions are `storage`, `unlimitedStorage`, `favicon`, `alarms`,
  `notifications`, and `offscreen`; there are no `host_permissions`.
- Links allow HTTP/HTTPS. Images require absolute HTTPS and use `no-referrer`.
- Search endpoints are fixed in code; custom templates, suggestions, and search
  history are outside current scope.
- Search brand icons are local. Link favicons come from Chrome's internal cache;
  arbitrary linked pages are not fetched by extension code.
- All controls must remain legible in both themes over any chosen background.

## Known Limitations

- No sync, full-dashboard reset/recovery UI, accounts, sharing, or Chrome Web
  Store publishing workflow.
- Markdown has no Math, Mermaid, YAML frontmatter, embedded file upload, syntax
  highlighting, or offline image cache.
- Search has no history, online suggestions, or custom engines.
- Invalid/future storage schemas surface an error; there is no user-facing
  recovery/reset flow.

## Current Priorities

No unfinished product requirement is recorded. README lists Google Calendar as
a roadmap idea; confirm scope with the user before starting it. See
`docs/CURRENT_STATE.md` for the latest handoff status.
