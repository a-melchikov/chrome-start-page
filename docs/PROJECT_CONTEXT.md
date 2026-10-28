# Project Context

## Purpose

Chrome Start Page is a private, local-first Chrome extension that replaces the
new tab page with a configurable dashboard. Its main flow is: open a new tab,
use saved widgets, enter global edit mode to add/move/resize/configure them, and
have the complete dashboard restored from local Chrome storage.

## Current Product

Version 0.1.1 implements seven repeatable widget types:

- **Markdown** — a resizable `4×3` card by default with a separate title,
  5 note templates (`blank`, `tasks`, `daily-plan`, `links`, `draft`), quick add input bar
  with template-specific formatting, single-line text sizing directives (`:large[текст]` / `:xlarge[текст]`),
  task filtering (`hideCompletedTasks`) with parent preservation for open subtasks and
  all-completed empty state, sanitized CommonMark/GFM rendering, interactive task lists, safe links (HTTP/HTTPS and local file://) and
  HTTPS images. Editing uses a fullscreen 50/50 Markdown/live-preview dialog with behavior settings.
  Кнопка «Начать работу» открывает набор HTTP/HTTPS-ссылок заметки в фоновых
  вкладках без повторов. Неудавшиеся открытия можно повторить отдельно.
  Кнопка разворачивания открывает полноэкранный режим чтения с прокруткой,
  безопасными ссылками и копированием кода; задачи в нём доступны только для чтения.
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
- **Analog Clock** — a card widget (default `2×4`, minimum `2×2`) displaying an
  analog dial with 3 dial styles (`minimal`, `numbers`, `bauhaus`), optional seconds,
  date window at 3 o'clock, timezone label, and local or IANA timezones.
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
«Бумага и шалфей» and «Абрикосовый полдень», and the dark preset «Графит и мята»
(background `#151D1F`, text `#E1EAE8`, accent `#42C7B4`), an arbitrary background color,
validated local or HTTPS wallpaper with full-screen cover cropping, a 12-column
draggable/resizable grid, autosave, deletion confirmation, keyboard dialog
behavior, restoration after Chrome restarts, and full versioned JSON backup and
restore (format v3) with embedded local wallpaper and image assets.

Поиск команд появляется по центру сверху только после `Ctrl+K`, `/` вне полей
ввода или нажатия на лупу. Под полем сразу раскрывается список на слегка
затемнённом фоне; клик вне поиска или Escape его закрывает. Поиск охватывает
действия, все типы и существующие экземпляры виджетов,
14 тем, разделы оформления и безопасные HTTP/HTTPS ссылки из сохранённого
Markdown. Поиск также находит текст заметок во всех пространствах, показывает
фрагмент совпадения и переключает пространство с фокусом на найденной карточке.
Поле остаётся на одной линии с блоком кнопок и сужается при
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

- Markdown-заметки и изображения можно развернуть отдельной кнопкой карточки
  в режиме просмотра и редактирования. Escape закрывает просмотр и возвращает
  фокус, сохраняя режим редактирования и компоновку. Изображение показывается
  целиком без сохранённого кадрирования; просмотр не сохраняет настройки.

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
  preserves its enabled state and gains numeric defaults. V5 migrates to v6 with
  customThemes support. V6 migrates to v7 with markdown template defaults. Legacy appearance
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
  `notifications`, `offscreen`, and `contextMenus`; host permissions are limited
  to Open-Meteo Forecast/Geocoding and local `file:///*` links.
- Контекстное меню Chrome сохраняет страницу, ссылку или выделенный текст в
  выбранную Markdown-заметку любого пространства либо в новую карточку.
  Выделение сохраняется цитатой с источником; чтение произвольных страниц,
  истории и закладок для этого не требуется. Запись остаётся локальной.
- Links allow HTTP/HTTPS. Images require absolute HTTPS and use `no-referrer`.
- Search endpoints are fixed in code; custom templates, suggestions, and search
  history are outside current scope.
- Search brand icons are local. Link favicons come from Chrome's internal cache;
  arbitrary linked pages are not fetched by extension code.
- All controls must remain legible in both themes over any chosen background.

## Known Limitations

Для локальной разработки доступен запуск без расширения: отдельное окно
`pnpm dev:app`, HTTP-сервер `pnpm dev:web` и контейнер Docker. Это тот же
дашборд с изолированным IndexedDB-хранилищем и общим форматом backup.
Нативное меню Chrome и фоновые API проверяются отдельно в расширении;
веб-версия не обещает их эмуляцию. Подробности — в DEVELOPMENT.md.

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

## Положение панели управления

В закрытом по умолчанию разделе «Панель управления» окна «Оформление» доступен
общий для всех пространств выбор: справа сверху (по умолчанию), слева постоянно
или слева со скрытием. Раздел доступен также через палитру команд.

Левая панель состоит из иконок, находится по центру viewport и использует
Liquid Glass активного пространства. Открытая панель занимает отдельную полосу
слева: отступ области виджетов равен 88 px при раскрытии и 16 px при скрытой
панели. Между раскрытой панелью и карточками остаётся 48 px, между скрытой
стрелкой и карточками — 16 px. Панель и область виджетов синхронно перемещаются
за 260 мс с мягким замедлением; при уменьшенном движении сдвиг мгновенный.
Сетка сохраняет 12 колонок и минимальную ширину 960 px; на тесном экране доступна
горизонтальная прокрутка. Верхний отступ — 24 px вместо 80 px.
Сохранённые координаты виджетов не меняются.

В скрываемом режиме наведение на полосу шириной 24 px вдоль левого края
показывает компактную стрелку 24 × 64 px по центру. Зона охватывает высоту окна
с отступами по 16 px сверху и снизу; клавиатурный фокус также показывает стрелку.
Клик раскрывает панель, кнопка сворачивания, внешний клик или M закрывают
её; уход мыши не закрывает. При внешнем клике панель закрывается после активации
выбранного элемента, чтобы сетка не смещалась под нажатой мышью.
Вход в редактирование раскрывает панель, но позволяет
свернуть её и продолжить работу. M не действует при вводе текста и в диалогах.
Диалоги сохраняют раскрытие и возвращают фокус. Escape сохраняет прежнее поведение.

Схема v9 хранит только `toolbar.mode` в корне конфигурации; v1–v8 мигрируют
автоматически с `top-right`. Раскрытие не записывается в storage: новая вкладка,
перезагрузка, импорт или принятие внешней конфигурации начинают со скрытой панели.
Переключение пространства сохраняет раскрытие. Резервные копии v3 переносят настройку.

## Обратная связь и доступность интерфейса

Первый экран открывается без стартовой анимации. Мягкие переходы сопровождают
действия: раскрытие разделов настроек, меню, диалоги, переключение пространства
и добавление виджета. Системное уменьшение движения отключает анимацию высоты
и перемещения, оставляя короткую смену прозрачности. Сетка и Liquid Glass
сохраняют прежнее поведение.

Редакторы виджетов явно сообщают об автоматическом сохранении. Собственные темы
сохраняются отдельной кнопкой; форма следует активной теме интерфейса, а черновик
отображается только в предпросмотре и сохраняется при возвращении из него.
Пустое изображение, списки выбора, действия пространств и задачи Markdown
доступны с клавиатуры и имеют осмысленные доступные названия. Списки внутри
диалогов прокручиваются вместе с содержимым и закрываются первым Escape.
