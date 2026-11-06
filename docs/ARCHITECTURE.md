# Architecture

## System Flow

```mermaid
flowchart LR
  Chrome[Chrome new tab] --> WXT[WXT newtab entrypoint]
  WXT --> App[React App]
  App --> Hook[useDashboardConfig]
  Hook <--> Repo[dashboard-storage]
  Hook <--> WallpaperAssets[wallpaper-assets + transactions]
  Hook <--> ImageAssets[image-assets]
  Hook <--> Backup[dashboard-backup]
  Repo --> Validate[validation + migrations]
  Repo <--> Local[(chrome.storage.local)]
  WallpaperAssets <--> Local
  ImageAssets <--> Local
  Backup <--> Local
  App --> Dashboard
  App --> Wallpaper[WallpaperLayer]
  Dashboard --> Grid[WidgetCanvas]
  Grid --> Host[WidgetHost]
  Host --> Registry[Widget Registry]
  Registry --> Markdown[Markdown widget]
  Registry --> Search[Search widget]
  Registry --> Pomodoro[Pomodoro widget]
  Registry --> Image[Image widget]
  Registry --> Clock[Clock widget]
  Registry --> AnalogClock[Analog Clock widget]
  Registry --> Weather[Weather widget]
  Weather <--> WeatherCache[storage/weather-cache]
  Weather <--> OpenMeteo[Open-Meteo API]
  Pomodoro <--> Background[entrypoints/background + chrome.alarms]
```

`entrypoints/newtab/main.tsx` mounts `App` and loads global/Tailwind and grid
styles. `App` is the composition root: it resolves appearance, applies the theme
to the document, surfaces persistence errors, and connects state operations to
`Dashboard`.

## Запуск без расширения

Для запуска без установки расширения добавлена отдельная Vite-точка входа
`web/index.html`. Она монтирует тот же `entrypoints/newtab/main.tsx`.
Только веб-конфигурация заменяет `#imports` и `wxt/browser` /
`@wxt-dev/browser` адаптерами из `web/`. WXT-сборка и её manifest не меняются.
Сам WXT Storage переиспользуется; `web/storage.ts` реализует необходимые
операции `storage.local/session` через транзакции IndexedDB и onChanged через
BroadcastChannel. Ошибки записи не подменяются успешным сохранением в памяти.
Сессия удерживается общим Web Lock на время жизни окон; следующий запуск
очищает сессионное хранилище, сохраняя локальное.

Адаптер браузера предоставляет только используемые веб-возможности: пути
статических ресурсов и открытие HTTP/HTTPS-ссылок. Фоновые API не эмулируются.
Приватный Chrome favicon заменяется существующим fallback, а локальные ссылки
копируются. Репозитории, схема v10, миграции и обработка конфликтов общие.
Tailwind явно сканирует корень репозитория независимо от Vite root.

`scripts/dev-app.mjs` запускает Vite и отдельный Chrome/Chromium-профиль
в режиме `--app`. Docker собирает веб-target и раздаёт его nginx; пользовательские
данные остаются в IndexedDB браузера. Детали и ограничения — в DEVELOPMENT.md.

## Module Boundaries

| Layer                   | Responsibility                                                               |
| ----------------------- | ---------------------------------------------------------------------------- |
| `components/dashboard/` | Ephemeral edit/dialog state, grid interaction, widget hosting                |
| `components/ui/`        | Domain-free accessible primitives and shared favicon wrapper                 |
| `widgets/`              | Typed definitions, factories, renderer/editor behavior, domain helpers       |
| `storage/`              | Persistent schema boundary, defaults, validation, migrations, WXT repository |
| `hooks/`                | React state, debouncing, write ordering, lifecycle flushes                   |

UI does not access Chrome storage directly. Storage does not depend on React.
Renderer-derived state is not persisted.

## Версия и встроенная справка

`package.json` — единственный источник текущего номера приложения. WXT берёт его
для manifest автоматически; `app/version.ts` экспортирует тот же номер общему
React-интерфейсу расширения и веб-приложения. Номер приложения не связан
с версиями схемы дашборда и оболочки резервной копии.

`app/features.ts` содержит справочник текущих возможностей: группы, описание,
инструкцию и версию первого появления. При добавлении функции обновляются
справочник и `CHANGELOG.md`. `app/release-notes.ts` включает Markdown в сборку
и выделяет разделы формата `## VX.Y.Z — ГГГГ-ММ-ДД`. Раздел «Не выпущено»
в интерфейс не попадает. Даты отображаются по-русски, заголовок записи содержит
только номер версии. Содержимое истории отображается
через существующий безопасный `MarkdownRenderer` без сетевой загрузки.

`AboutSettings` загружается лениво из панели настроек; поиск, фильтр и раскрытые
записи — временное состояние просмотра. Они не меняют дашборд и не требуют
миграции. В истории публикуются описания изменений и согласованные даты выпусков.

## Configuration and Registry

`storage/schema.ts` defines `DashboardConfig` version 10 and maps widget type
literals to concrete configs through `WidgetConfigMap`. Each config contains an
ID, type, optional title, and `{x,y,w,h}` layout; Markdown adds `content`,
`template` (`'blank' | 'tasks' | 'daily-plan' | 'links' | 'draft'`),
`quickAddEnabled`, `hideCompletedTasks`, and optional `showWebsiteSetButton`, Search
adds `engine`, Pomodoro adds duration and sound settings, Image adds `source`,
`objectPosition`, and optional `altText`, Clock adds `timeFormat`, `showTime`,
`showSeconds`, `showDate`, `dateFormat`, `showDayOfWeek`, `timezone`,
`showTimezoneName`, and `showTimezoneAbbr`, Analog Clock adds `dialStyle`
(`'minimal' | 'numbers' | 'bauhaus'`), `showSeconds`, `showDate`, `showTimezone`,
and `timezone`, and Weather adds `mode`
(`'visual' | 'compact'`) and `location` (`'unset' | 'city'`). Weather
forecast data is cached in WXT Storage under `local:weather-cache:<id>` and not
persisted to dashboard config or backup. Events adds the raw `events` list;
recurrence rules and local date/time semantics are described below.

`widgets/registry.tsx` is the only widget integration point. It dynamically
loads each widget renderer when that widget is mounted and loads its editor only
when editing begins. A definition owns:

- metadata and factory;
- runtime type guard;
- renderer, optional editor and optional read-only reader;
- card/bare chrome and inline/dialog editor presentation;
- title behavior and dialog size;
- per-type layout constraints and resize handles.

`WidgetHost` asks the registry to render/edit a config and shows a safe fallback
for unknown types. Adding a widget type requires updating the config map,
storage validation, registry definition, factory, renderer/editor, and tests.
Increase the schema version only when persisted compatibility requires it.

Рендерер получает необязательный `headerActionsTarget` — DOM-контейнер действий
в заголовке карточки. Виджет может вывести кнопку через React portal, сохраняя
логику и состояние внутри себя; host не разбирает тип или содержимое виджета.
`WidgetPresentation.headerPosition: 'overlay'` переносит действия поверх
содержимого, оставляя заголовок доступным для скринридеров. Вместе с
`cardInset: 'none'` это позволяет карточке заполнить всю поверхность.

`Reader` и предикат `canRead` задаются типизированным определением
виджета; `renderReader` проверяет конфигурацию перед созданием компонента.
`WidgetHost` показывает независимую от режима редактирования кнопку
разворачивания. Просмотр использует общий нативный `Dialog` на весь viewport
с фиксированной шапкой и закрытием по Escape/кнопке. Закрытие возвращает фокус
на кнопку карточки; содержимое освобождается после перехода закрытия.
Состояние просмотра существует только в памяти и не меняет компоновку.
`data-no-drag` и роль диалога исключают действия внутри просмотра из
обработчиков перемещения и выделения нижележащей сетки.

Режим подключён для Markdown и изображений. Markdown использует тот же
санитайзер и renderer без обработчика изменения содержимого, поэтому задачи
недоступны для изменения, а ссылки и копирование кода сохраняются.
Изображение использует общий renderer с временным `reading`-режимом:
`contain`, центрирование и отсутствие zoom не изменяют исходную конфигурацию.
У пустого изображения кнопка скрыта. Таймеры и погодные эффекты в просмотре
не дублируются.

## Command Palette

`components/dashboard/command-catalog.ts` derives typed commands from the
current in-memory config, widget registry, and theme registry. Search performs
case-insensitive substring matching; neither the catalog nor query is stored.
Markdown notes from every workspace are indexed as plain text by
`widgets/markdown/search-text.ts`; matching results include a bounded excerpt.
Note results appear only for a nonempty query. Selecting one switches the
workspace through the existing state hook, then scrolls to and focuses the
mounted card after the workspace render.
`CommandPalette` owns only dialog, query, selection, and theme-list state. It
uses the shared `Dialog` launcher variant: top-centered 480 px search field,
results below it, subtle backdrop, screen-reader-only title, and a narrow-
viewport offset below the toolbar. Closed search remains visually absent.
`DashboardControls` executes commands through existing Dashboard callbacks.
Widget focus uses the rendered card's `data-widget-id` and temporary focus.
`widgets/markdown/extract-links.ts` parses saved Markdown with `remark-parse`
and `remark-gfm`, then validates candidate URLs with the same `normalizeLinkUrl`
rule as the renderer (supporting HTTP/HTTPS and local `file://` URIs). No Chrome bookmarks access or permission is used.
`download-backup.ts` shares the Blob download between the backup dialog and
direct export command; both call the same queued backup export hook.

## State and Persistence

`storage/dashboard-storage.ts` owns the WXT item `local:dashboard-config`.
Loading reads `unknown`, calls `migrateDashboardConfig`, and writes back any
migrated/normalized object. Saving validates through the same boundary.

Current migration behavior:

- v1 `links` becomes `markdown`, preserving ID, title, content, and layout;
- v1 and v2 appearance data gains `{type: 'none'}` wallpaper state;
- v1, v2, and v3 gain the default `liquidGlass` group when migrated to v5+;
- v4 keeps `liquidGlassEnabled` while migrating it into the v5 group and gains
  standard transparency, blur, and shadow values;
- v5 appearance `theme: ThemeId` migrates to `theme: { type: 'builtin', id: ThemeId }`,
  `backgroundColor` string migrates to `{ type: 'custom', color }` (or `{ type: 'theme' }`
  if matching theme default), and config gains `customThemes: []`;
- retired WIP `google-calendar` widgets are removed from v2 while all supported
  widgets and appearance data are preserved;
- v6 configs migrate to v7 by assigning default `template: 'blank'`,
  `quickAddEnabled: false`, and `hideCompletedTasks: false` to all markdown widgets;
- v7 получает рабочие пространства в v8; v8 → v9 сохраняет все пространства,
  активный ID, темы и ресурсы и добавляет `toolbar: { mode: 'top-right' }`;
- v9 → v10 сохраняет эти данные и добавляет пустую корзину пространств;
- current and legacy SearchWidget layouts are normalized to `h: 1`;
- malformed and unsupported/future versions throw explicit errors.

`useDashboardConfig` keeps state plus a synchronous ref so rapid updates compose
against the latest config. Add/remove, ordinary appearance, and completed layout
changes save immediately.

Поле `appearance.widgetBorderRadius` необязательно: отсутствие означает `12 px`,
допустимы целые значения `0–40`. Это совместимое дополнение схемы v9;
старые конфигурации и резервные копии сохраняют прежний вид без миграции.
CSS-переменная `--widget-border-radius` применяется к поверхностям виджетов,
поиску и вложенным оболочкам изображений и погоды.

Ползунки Liquid Glass и скругления обновляют React state для предпросмотра и
сохраняют изменения после завершения ввода мышью или клавиатурой, потери фокуса,
закрытия диалога, `pagehide` или unmount.

Widget/editor changes use a 300 ms debounce. Saves are
queued to prevent an older slow write from overwriting newer state; pending
widget changes flush on editor finish, Escape, `pagehide`, and unmount.

Структурные действия с виджетами записываются в память вкладки как история из
50 шагов. Для drag/resize хранятся только координаты, поэтому Undo не откатывает
позднейшие правки содержимого. Для добавления и удаления сохраняются
конфигурации и порядок виджетов; новый шаг очищает Redo. Импорт и принятие
внешнего состояния очищают историю.

Геометрия `Shift+стрелка` вычисляется в `dashboard-layout.ts`: группа движется
до ближайшего препятствия или края сетки. Для движения вниз `Dashboard`
передаёт нижний ряд, полностью видимый в текущем окне; обычные стрелки
по-прежнему сдвигают группу на одну клетку.

Записи конфигурации проходят через общий Web Lock и перед записью сверяют
`local:dashboard-config` с последней принятой версией. WXT watcher обновляет
вкладки без локальных правок. При конфликте локальная запись приостанавливается
до выбора версии в диалоге. Временные ссылки на изображения для Undo и локальных
несохранённых изменений хранятся
через WXT `storage.session` по ID вкладки; очистка учитывает ссылки всех
открытых вкладок, а background удаляет ссылку при закрытии вкладки.

Backup export and import use the same serialized operation queue. Export first
flushes pending widget and appearance changes, then snapshots the current
validated config and referenced local wallpaper. Import validates and prepares
the complete backup before it joins the queue, so older queued saves always
finish before the replacement commit.

Корзина пространств хранится в необязательном `trashedWorkspaces` схемы v10.
Запись содержит исходный `WorkspaceConfig`, `deletedAt` и `originalIndex`.
Отсутствие поля означает пустую корзину. Миграция проверяет метаданные и
запрещает совпадение ID корзины с действующими пространствами и друг с другом.
`storage/workspace-trash.ts` задаёт перенос, восстановление и окончательное
удаление; `getStoredWorkspaces` возвращает действующие пространства и корзину
для очистки ресурсов и backup. Список видимых пространств, команды, контекстное
меню и фоновые таймеры используют только действующие пространства.

Все три операции проходят общую очередь и Web Lock, учитывают отложенное
редактирование и публикуют новое React-состояние после успешной записи.
При ошибке записи исходная конфигурация и ресурсы остаются доступны.
Изображения и обои корзины удерживаются при очистке, включая закрытие вкладки;
окончательное удаление освобождает только ресурсы без других ссылок.
Автоматического срока хранения и очистки корзины нет. Восстановление сохраняет
ID, вставляет пространство на прежнюю позицию (либо в конец списка) и делает
его активным. Переключение активного пространства очищает историю виджетов.
`ConfirmWorkspaceDeleteDialog` используется обоими входами удаления; ошибки
записи отображаются в диалоге, фокус по умолчанию остаётся на отмене.

## Backup Format and Restore

`storage/dashboard-backup.ts` owns the JSON wire format independently of the
persisted dashboard schema. Текущий формат v3 содержит маркер
`chrome-start-page-backup`, `formatVersion: 3`, время экспорта, `DashboardConfig`,
массивы `localWallpapers` и `localImages` для действующих пространств и корзины.
При импорте новые ID ресурсов назначаются также содержимому корзины. Форматы v1/v2
с единственными `localWallpaper` остаются совместимыми. Вложенная конфигурация
всегда проходит обычную миграцию; глобальный `toolbar` переносится внутри неё
без повышения версии оболочки backup.

Local wallpaper and image data are decoded, checked against config asset IDs, and
browser-validated before any write. Import assigns fresh UUIDs to all local
assets, saves the new assets before the replacement config, rolls them back if
the config write fails, and removes previous assets only after commit. Non-local
imports save the replacement config before removing any previous local assets.
A cleanup failure is reported as a warning without rolling back an already valid
import. HTTPS wallpaper and remote images remain URLs and are revalidated before
commit.

The dashboard backup dialog performs file selection and Blob download but never
accesses extension storage directly. Browser-native Blob/object URLs avoid a
`downloads` permission. Closing the dialog aborts validation; once the queued
storage transaction begins it is allowed to finish atomically.

## Wallpaper Pipeline

`AppearanceConfig.wallpaper` is a discriminated union: no wallpaper, an HTTPS
URL, or a local asset UUID, each optionally supporting an `enabled` flag.
Disabled wallpapers retain their configuration and local assets without
rendering the background layer, allowing seamless toggling via the appearance
dialog or command palette. Remote URLs are validated by browser image loading
without broad host permissions or an extension `fetch`. Local files support
PNG, JPEG, WebP, GIF, AVIF, and SVG; signatures/content and browser decoding are
checked before the persisted config changes.

Local bytes are stored separately through `storage/wallpaper-assets.ts` under
`local:dashboard-wallpaper:<uuid>`. Files at or below 6 MiB remain byte-for-byte
unchanged. Larger files are gzip-compressed only when the lossless result fits
within 6 MiB; otherwise the original is retained under `unlimitedStorage`.
`storage/wallpaper-transactions.ts` saves the new asset and config before
removing the old asset, rolls a new asset back on config failure, and cleans up
orphaned wallpaper keys on startup.

`useWallpaperImage` decodes and revalidates local assets before creating a Blob
URL, revoking it on replacement/unmount. `WallpaperLayer` is a decorative fixed
layer behind the dashboard and uses centered `object-cover`, so it fills the
viewport and crops overflow. Failed validation leaves the previous wallpaper
intact and is surfaced in the appearance dialog.

## Dashboard Layout

`dashboard-layout.ts` converts domain layouts to/from `react-grid-layout` and
applies registry constraints. The grid has 12 columns, 48 px rows, and configurable gaps (16 px by default). Markdown defaults to `4×3` with minimum `3×3`; Search defaults to `6×1`,
minimum width 3, fixed height 1, and horizontal resize from either side.

В режиме редактирования размер виджетов можно менять за любую сторону или угол.
Боковые зоны захвата проходят вдоль краёв; у поиска доступны только левый и правый
края, а высота остаётся равной одной строке.

Dragging/resizing is edit-mode-only. The no-compaction strategy blocks
collisions but preserves explicit coordinates. Dragging is intentionally
unbounded vertically so empty rows below the current content remain reachable
and the canvas can grow. Interactive controls are excluded from the drag
gesture. At viewport widths below 960 px, the canvas scrolls horizontally
instead of transforming persisted layouts.

В режиме редактирования виджеты выделяются по одному или группой. Для
группового drag `WidgetCanvas` вычисляет единый сдвиг и показывает его локально,
проверяя всю группу на выход за 12 колонок и пересечения; запись происходит
после отпускания. Одиночный drag/resize остаётся в `react-grid-layout`.
Клавиатурный сдвиг использует ту же проверку геометрии.

Буфер виджетов — отдельный версионированный JSON с конфигурациями и локальными
изображениями, без состояния таймеров и кэшей. Входные данные проверяются через
текущую схему и декодирование изображений. Вставка назначает новые UUID и
сохраняет относительное расположение; локальные ресурсы записываются до
конфигурации и удаляются при ошибке транзакции.

## Markdown Widget

`MarkdownWidget.content` is the sole source of truth. `MarkdownRenderer` uses:

```text
Markdown -> remark-gfm -> remark-directive -> remarkTextSizeDirectivePlugin -> remarkTaskFilterPlugin -> rehype-raw -> rehype-sanitize -> React components
```

The pipeline supports:

- **5 note templates** (`blank`, `tasks`, `daily-plan`, `links`, `draft`) selected via a unified modal dialog (`SelectTemplateDialog`) during widget creation from both `AddWidgetDialog` and `CommandPalette`;
- **Quick Add input** positioned at the bottom of the card with template-specific formatting (checkboxes for `tasks`/`daily-plan`, link normalization for `links`, escaped text for `blank`/`draft`);
- **Task filtering** (`hideCompletedTasks`), which hides completed items while preserving parent items if they contain incomplete subtasks, and shows an empty state («Все задачи выполнены») when all tasks are complete;
- **Single-line text size directives** (`:large[текст]` for 18px and `:xlarge[текст]` for 22px), validated to exclude multiline text, code blocks, and links, sanitized via allowed `data-size` on `span`.

The sanitizer admits the required structural/formatting subset (including
tables, `details`, `summary`, `mark`, `kbd`, `sub`, `sup`, `ins`, and directive `span` with `data-size`) and removes
executable/embedded/form content, event attributes, arbitrary class/style data,
and unsafe URLs. React rendering does not use `dangerouslySetInnerHTML`.

Component overrides enforce HTTP/HTTPS links and absolute HTTPS images again.
Links stay in the current tab and use Chrome's local `_favicon` via
`SiteFavicon`; images are lazy, async-decoded, bounded, and `no-referrer`.
Fenced code is unhighlighted, horizontally scrollable, and copyable.

Обычные URL и ссылки вида `[URL](URL)` отображаются короткой подписью:
`https://mail.google.com/mail/u/0/#inbox` → `mail.google`. Общий модуль
`link-label.ts` сохраняет поддомены и убирает последнюю доменную зону;
используется также при сохранении из браузера, быстром добавлении ссылок
и извлечении подписей для поиска команд. Полный адрес остаётся в `href`,
а при сокращении виден в подсказке. Пользовательские подписи, форматирование,
ссылки на файлы и содержимое блоков кода сохраняются. Отображение не изменяет
исходный Markdown и не требует миграции сохранённых заметок.

Task-list interaction uses the list item's AST source offset to toggle the exact
`[ ]`/`[x]` marker in source text. The fullscreen editor owns ephemeral
split state (50/50 on each open, keyboard/pointer range 30–70), provides behavior
settings (template picker, quick add switch, hide completed switch, text size dropdown),
and sends title and content changes through the normal debounced persistence path.

Редактор использует одну общую панель инструментов: «Размер текста» слева,
«Настройки» и «Готово» справа. Заголовок редактируется отдельным полем без
постоянной рамки и фона над Markdown-текстом, на одном уровне с названием в
предпросмотре. У обеих колонок одинаковые отступы; служебной полосы «Предпросмотр»
нет. Заголовок не входит в Markdown-текст.
Пустой или пробельный заголовок остаётся пустым в карточке, предпросмотре и режиме
чтения; название типа используется только для доступных имён элементов управления.

Шаблон и переключатели поведения скрыты под кнопкой «Настройки». Выпадающие
блоки настроек и размера текста закрываются по Escape, внешнему клику или выходу
фокуса; Escape возвращает фокус к кнопке и оставляет редактор открытым.
Шаблон выбирается общим компонентом `Select`; список раскрывается внутри блока
настроек, поддерживает клавиатуру и закрывается первым нажатием Escape.
Переключатели поведения — кнопки с `role="switch"`: вся строка обрабатывает клик,
а доступное состояние и положение бегунка напрямую зависят от конфигурации виджета.

Рабочий набор сайтов формируется из HTTP/HTTPS-ссылок одной Markdown-заметки
без отдельной сохраняемой модели. Общий разборщик `extract-links.ts`
учитывает обычные, автоматические, HTML- и ссылочные Markdown-ссылки.
`website-set.ts` нормализует и удаляет повторяющиеся адреса, а платформенная
функция открывает их последовательно через `tabs.create({ active: false })`.
Текущая вкладка остаётся активной; новые разрешения Chrome не нужны.
Компактная кнопка запуска в заголовке карточки показывает иконку и число сайтов;
полное действие «Начать работу» доступно в подсказке и accessible name.
Кнопка по умолчанию скрыта; редактор заметки сохраняет её видимость в
необязательном boolean-поле `showWebsiteSetButton`. Отсутствие поля означает
`false`, поэтому существующие конфигурации и резервные копии совместимы без
изменения версии схемы. При включённой настройке кнопка видна только при наличии сайтов.
Кнопка блокируется до завершения запуска, результат остаётся под содержимым.
При частичной ошибке повтор открывает только
неудавшиеся адреса. Состояние запуска и повторов существует только в памяти
виджета и сбрасывается при изменении Markdown.

## Ближайшие события

`events` хранит только исходный список `events`: ID, название, необязательное описание, дату `YYYY-MM-DD`,
необязательное время `HH:mm` (пустая строка означает весь день) и правило
`none | daily | weekly | monthly | yearly`. Это совместимое расширение схемы v10;
существующие конфигурации не требуют миграции. Валидация выполняется на границе
хранилища и при импорте, включая реальные календарные даты и уникальность ID событий.

Ближайшие даты и обратный отсчёт вычисляются в местном часовом поясе устройства,
не записываются в конфигурацию и обновляются каждую минуту, при фокусе и возврате
к вкладке. Дни для событий без времени считаются по календарю, независимо от DST.
Повторы привязаны к исходной дате: в коротком месяце используется его последний
день, затем исходное число восстанавливается; 29 февраля в невисокосном году
становится 28 февраля. Повтор с временем переключается после его наступления,
без времени — после окончания дня. Разовые события остаются на карточке до конца
дня, затем скрываются; исходные записи доступны в управлении событиями.

Рендерер выводит добавление в `headerActionsTarget` и использует общий `Dialog`
для создания и изменения. Черновик хранится в памяти до кнопки «Сохранить»;
Escape и «Отмена» его отбрасывают. Поля даты и времени сохраняют нативный ввод
по частям, но кнопки справа открывают собственные панели с цветами активной темы.
Панели используют HTML Popover API внутри диалога: верхний слой не обрезается
прокруткой и не меняет геометрию формы. Положение рассчитывается относительно
поля и пересчитывается при прокрутке и изменении размеров. Календарь всегда
открывается снизу; время выбирает свободное место сверху или снизу. При нехватке
места высота панели ограничивается. Полосы прокрутки скрыты, но прокрутка
колёсиком, жестами и клавиатурой сохраняется. Одновременно открыта одна панель;
первый Escape закрывает только её, сохраняя выбор в черновике, следующий — отменяет форму. Дата выбирается
кликом по дню или «Сегодня»; время — отдельными колонками часов и минут с кнопками
«Готово» и «Без времени». Открытие пустого времени только предлагает текущее
местное время и не заполняет поле до явного выбора. Подтверждённые изменения
идут через `onChange`
и общую очередь записи, включая flush при `pagehide`. Удаление повторяющейся
записи удаляет всю серию и требует подтверждения. Внешние календари не подключаются.

`widgets/events/background-reminders.ts` регистрирует фоновую проверку в общем
service worker. Один Chrome Alarm `events:reminders` проверяет начало каждой
минуты для всех активных пространств (включая невыбранные); корзина исключена.
Будильник существует только при наличии будущих событий с временем, проверяется
и восстанавливается при запуске worker, Chrome, установке/обновлении и изменении
конфигурации. Изменение даты, повторов, удаление или восстановление событий
учитывается из актуальной конфигурации без записи в неё фоновых изменений.

Для событий с временем `getEventReminderPlan` рассчитывает уведомления за 5 минут
и в минуту начала. Повторы вычисляются от начала проверяемой минуты, чтобы
не потерять уведомление о начале при срабатывании worker позже нулевой секунды.
События без времени не уведомляют. Поздние проверки после сна и закрытия Chrome
не воспроизводят пропущенные минуты; текущая минута проверяется при возвращении.
Chrome и ОС не гарантируют точность срабатывания и показа до секунды.

Проверки сериализованы в worker. ID уведомления содержит пространство, виджет,
событие, timestamp вхождения и этап напоминания. Успешные отправки текущей минуты
хранятся отдельно в `local:event-reminder-deliveries`: это предотвращает повторы
при изменениях конфигурации и перезапуске worker. Журнал не входит в backup,
не содержит названий событий и не изменяет схему дашборда. Ошибка одного показа
не мешает остальным; неуспешный показ допускает повторную попытку в ту же минуту.
Новых зависимостей, разрешений и отдельного звукового сигнала не добавлено.

## Search Widget

Search is intentionally a bare form with no visible card or title. Engine
definitions in `widgets/search/engines.ts` contain fixed HTTPS action, query
parameter (`q`, or Yandex `text`), label, and bundled icon path. The native GET
form has no target, so explicit submission replaces the current new tab. Empty
queries are prevented; trimmed query text remains form-only and is never stored.

The icon URL is resolved with `browser.runtime.getURL`. Local vector marks from
CoreUI Brands and DuckDuckGo's press kit render at optically balanced 24–28 px
sizes in decorative, theme-independent glass badges on the left. A theme-colored
outline magnifier replaces a missing asset. The submit button on the right uses
the shared outline magnifier. A matching outline close button clears typed text
and restores focus; Chrome's native search cancel control is hidden. One search
surface contains both controls and shows focus on the whole row; its glass effect
follows the existing appearance settings with a minimum tint for text contrast
over arbitrary wallpapers. Chrome `_favicon` is not used for search brands and
remains enabled only for user Markdown links.

## Liquid Glass

Liquid Glass применяется к карточкам Markdown, часов, Pomodoro,
компактной погоды и пустого изображения, поверхности Search и верхней панели
управления в обоих состояниях.
Погодная сцена и загруженное изображение получают только стеклянную кромку и
тень: их содержимое не перекрывает дополнительная подложка.
Состояние и параметры хранятся в `appearance.liquidGlass`: переключатель,
прозрачность `0–100%`, размытие `0–40 px` и тень `0–100%`. Стандартные значения
`40% / 18 px / 50%` можно восстановить отдельной кнопкой без изменения
переключателя. Настройки находятся в блоке «Карточки» раздела «Оформление»
боковой панели «Настройки». Ползунки доступны через «Настроить эффект» при
включённом стекле; скругление доступно всегда.

Совместимое необязательное поле `appearance.liquidGlass.pointerLight` включает
блик отдельным переключателем «Блик за курсором» в том же блоке. Отсутствие поля
означает `false`: существующие конфигурации и новые пространства получают
выключенный блик без смены версии схемы. Значение проверяется как boolean и
сохраняется сразу, независимо для каждого пространства, в том числе в резервной
копии. Сброс числовых параметров стекла сохраняет оба переключателя.

`App` добавляет корневой класс `liquid-glass-enabled` и преобразует числа в CSS
custom properties. Theme-aware формулы используют их для ровной полупрозрачной
подложки, blur и короткой внешней тени. Статическое отражение ограничено
внутренней кромкой. `WidgetHost` через `useWidgetPointerLight` обновляет координаты
мягкого радиального блика в CSS не чаще одного animation frame, без React state
и сохранения координат. Псевдоэлемент не перехватывает ввод; при уходе мыши блик
затухает. Признаки `data-widget-glass` и `data-widget-pointer-light` на карточке
включают эффект с учётом наследования и индивидуальных настроек.
Он доступен только при включённом стекле для мыши, вне режима
редактирования и открытого редактора/просмотра. Системное уменьшение движения и
режимы анимации `reduced`/`off` отключают эффект. Погодные сцены, изображения и
панель управления не получают блик. Виджеты используют
семантические классы поверхностей без передачи визуальных параметров через
всё дерево Dashboard. Селекторы `:has(.weather-visual)` и
`:has(.widget-image-media)` исключают подложку поверх визуальных сцен.

При выключении карточки и панель управления возвращаются к обычному виду,
а Search — к прежнему bare-виду без внешней капсулы. Панель и карточки
используют одинаковую плотность стеклянной подложки. Стили учитывают все темы;
при отсутствии `backdrop-filter` полупрозрачный фон, рамка и тень остаются
доступным fallback. Диалоги эффект не используют. Новые
зависимости и разрешения расширения не требуются.

## Pomodoro Widget

Pomodoro is a card widget (`3×5`, min `3×4`) supporting customizable focus and
break intervals (work, short break, long break) and cycle-based progression.
While configuration (durations, long break interval, sound toggle) is part of
`DashboardConfig`, dynamic timer runtime state (`status`, `phase`,
`targetEndTime`, `remainingSeconds`, `cycleCount`, `completedToday`,
`lastResetDate`) is isolated in WXT Storage under `local:pomodoro-state:<id>`.

This runtime separation ensures tabs synchronize in real-time via storage
events without triggering dashboard saves or conflicting with the serialized
save queue. A background service worker (`entrypoints/background.ts`) listens
for `chrome.alarms`, fires system notifications (`chrome.notifications`) upon
interval completion even when start page tabs are closed, advances the
timer phase, and plays audio via an offscreen document (`entrypoints/offscreen.html`).
Active tabs additionally play a local Web Audio chime if open.

## Theme System and Design Tokens

The theme architecture lives in `themes/` and decouples color palettes and
visual tokens from widget logic and components:

- `themes/types.ts` defines `BuiltinThemeId` (14 themes: `system`, `light`, `dark`,
  `graphite-mint`,
  `tokyo-night`, `rainy-tokyo`, `cozy-lofi-night`, `catppuccin-mocha`,
  `catppuccin-latte`, `paper-sage`, `apricot-noon`, `nord`, `synthwave-84`,
  `solarized-dark`), `ThemeRef` (`builtin` or `custom`), `CustomTheme` with 28
  semantic color keys, `ThemeTokens`, `ThemeDefinition`, and `ThemePreviewColors`.
- `themes/palettes.ts` provides semantic token definitions for all 13 concrete
  builtin palettes; `system` resolves to the existing light or dark preset.
- `themes/color-utils.ts` contains color helpers: hex validation/normalization,
  relative luminance, WCAG contrast calculation, and linear RGB blending.
- `themes/color-derivation.ts` deterministically derives 22 secondary colors from
  6 primary colors (`canvasBg`, `surfaceBg`, `textPrimary`, `textSecondary`, `accent`,
  `accentText`) and performs WCAG contrast checks.
- `themes/registry.ts` exposes `THEMES: readonly ThemeDefinition[]`,
  `getThemeDefinition(id)`, `resolveTheme(themeRef, systemDarkMode, customThemes)`,
  and `applyThemeVariables` for injecting custom theme CSS variables into the DOM.
- `entrypoints/newtab/themes.css` declares scoped CSS variables
  (`--theme-canvas-bg`, `--theme-surface-bg`, `--theme-accent`, etc.) via
  `:root, [data-theme="..."]` selectors for built-in themes.
- Custom themes apply their full token set via inline style `--theme-*` variables
  in `App.tsx` and in `ThemePreview.tsx`.
- `entrypoints/newtab/style.css` defines the Tailwind CSS 4 `@theme` block
  mapping semantic utility classes (`bg-theme-surface`, `text-theme-text-primary`,
  `border-theme-border`, `bg-theme-accent`) to these custom properties.
- `AppearanceSettings.tsx` displays built-in themes alongside custom user themes with
  cards for creating, editing, duplicating, and deleting custom themes.
- `CustomThemeEditorDialog.tsx` provides full-screen editing with live auto-derivation,
  manual overrides, WCAG contrast alerts, a passive `ThemePreview` thumbnail, and
  full-screen preview of the entire dashboard.

## Weather Widget and Open-Meteo Integration

Weather is a card widget (`5×5`, min `3×3`) supporting visual and compact
modes. It integrates with [Open-Meteo](https://open-meteo.com/) for forecast and
geocoding without API keys:

- Location is configured by searching for a city (`type: 'city'`).
- Forecast requests use `host_permissions` for `https://api.open-meteo.com/*`,
  while city searches use `https://geocoding-api.open-meteo.com/*`.
  Endpoints are declared statically in the manifest.
- Forecast data is cached in WXT Storage under `local:weather-cache:<id>` with a
  freshness window of 30 minutes and a failure retry cooldown of 5 minutes.
  Cached entries are isolated per widget instance, excluded from backups, and
  automatically purged when widgets are removed or backups are restored.
- In visual mode, `weather-scene.ts` derives scene intensity, light, clouds, and
  wind drift from the existing forecast; `WeatherVisualEffects` renders local
  SVG/CSS layers behind readable text zones. Rain combines WMO codes with
  measured rain and showers, and motion respects `prefers-reduced-motion`.
  Compact mode keeps the structured metrics without the scene.
- `WidgetPresentation.cardInset` задаёт общий отступ карточки. Для погоды
  используется `none`: визуальная сцена занимает всю поверхность до скруглённого
  края, а компактный режим и служебные состояния задают собственные отступы.
  `WidgetHost` применяет настройку реестра без отдельной ветки для погоды.
- Визуальный режим располагает город и обновление сверху, температуру и четыре
  показателя снизу. Показатели занимают одну строку на широкой карточке и сетку
  2×2 на узкой. Прогнозы появляются поверх той же сцены при достаточной высоте.
- Строка почасового прогноза измеряется собственным `ResizeObserver`.
  Число карточек рассчитывается по её фактической ширине: карточка 44 px,
  минимальный промежуток 6 px. `justify-between` распределяет оставшееся место
  между карточками; при изменении размера показываются только целые часы
  из загруженного прогноза, без горизонтальной прокрутки.

## Extension Boundary

### Управление Яндекс.Музыкой

Виджет `yandex-music` — карточка размером `4 × 4` с минимумом `3 × 4`.
В конфигурацию и backup входят стандартные поля и необязательное
`surfaceWaves: boolean` (отсутствие означает `false`). Это совместимое
дополнение v10 без миграции. Настройка сохраняется сразу через repository
и независима для каждого экземпляра. Позиция,
громкость и метаданные треков существуют в памяти; выбор общего для всех
экземпляров источника хранится отдельно в `session:yandex-music-selection`.
После перезапуска браузера выбор возвращается в «Авто».

`ResizeObserver` измеряет карточку в пикселях: при отношении ширины к высоте
0,8–1,25 обложка заполняет её целиком, с затемнением под информацией и
управлением. В широком режиме обложка слева, в высоком — сверху. Заголовок
карточки скрыт визуально; служебные кнопки находятся поверх содержимого.
Название ограничено двумя строками, полный текст доступен в подсказке;
отсутствующий исполнитель не отображается. При нехватке места тело прокручивается.

В вытянутых режимах обложка имеет внутренний отступ, а фон карточки,
типографика и служебные кнопки используют общую тему и Liquid Glass.
Контрастные подложки служебных кнопок применяются только поверх обложки
квадратного режима. Перетаскивание доступно за обложку и неинтерактивное
содержимое; общий drag cancel исключает кнопки, ползунки и диалоги.
Перемотка сохраняет нативную клавиатурную семантику: прозрачный range
занимает всю скруглённую шкалу, а поверх заполнения отображается время
`мм:сс / мм:сс`, включая ещё не отправленное положение. Вертикальная громкость
раскрывается над иконкой динамика по наведению или фокусу. При уходе
указателя панель закрывается даже после изменения сфокусированного ползунка;
фокус возвращается на иконку. Панель также закрывается вне элемента и по
Escape, который не завершает общее редактирование.
Нажатие иконки отправляет громкость `0`; повторное нажатие восстанавливает
последнее ненулевое значение текущего источника. Это значение живёт в памяти
виджета, сохраняется при смене трека и сбрасывается при смене источника;
если ненулевая громкость ещё не наблюдалась, восстановление использует 50%.
Значение доступно скринридеру и в подсказке иконки. Команды ползунков
отправляются после завершения ввода.
Верхний ряд управления содержит громкость, дизлайк, шкалу времени и лайк;
под ним находятся предыдущий трек, крупная кнопка воспроизведения в цветах
темы и следующий трек.

Реакции читаются из `aria-pressed` (либо `aria-checked`) кнопок сервиса.
Команды `like` и `dislike` передают желаемое boolean-значение, поэтому повтор
уже применённого состояния не инвертирует реакцию. Подтверждение проверяет
состояние, а дизлайк также допускает переключение трека самим сервисом.
Опциональные поля `liked`/`disliked` и возможности реакций позволяют распознать
ответы старого скрипта. Каждый новый ответ также содержит `protocolVersion`.
Координатор сверяет его с `MUSIC_PROTOCOL_VERSION`: устаревший или отсутствующий
приёмник заменяется актуальным скриптом в той же вкладке, затем состояние
читается повторно. Сам скрипт при установке удаляет старый обработчик,
наблюдатель и таймеры; повторная установка текущей версии ничего не меняет.
Это предотвращает ситуацию, когда обновлённый UI получает старые ответы
без возможностей реакций и оставляет лайк и дизлайк неактивными.
Если обновление приёмника не подтвердилось, источник считается недоступным.
Без достоверного состояния реакции её кнопка остаётся недоступной.
Реакции не сохраняются в конфигурации и не переключаются оптимистически.

Опциональные световые переливы состоят из трёх независимых слоёв поверх
обложки и под управлением. Web Animations API соединяет случайные траектории
без повторяющегося цикла; меняются направление, растяжение, прозрачность и
длительность движения. Анимируются только `transform` и `opacity`, без
React-рендеров на каждом кадре, анализа аудио и синхронизации с битом.
На паузе общий слой затихает за секунду, затем движение приостанавливается;
возобновление сохраняет фазу. При быстрой смене паузы и воспроизведения
отложенная остановка отменяется. Без обложки, за пределами экрана, на скрытой
странице и при reduced motion анимации освобождаются. Дополнительные
разрешения Chrome не требуются.

Renderer обращается к общему клиенту, клиент — к фоновому координатору,
координатор — к изолированному скрипту на `https://music.yandex.ru/*`.
Адаптер читает подписанные элементы обычного плеера и «Моей волны» и передаёт
команды через DOM. На паузе «Моя волна» переносит исполнителей во вложенный
span перед названием: адаптер выделяет этот префикс отдельно, исключая
скрытые дубликаты и таймкод. Чтение не зависит от предыдущего состояния трека.
Внутренние React-объекты и закрытые API сервиса не используются.
После команды проверяется изменение состояния; потерянный ответ не вызывает
повторную отправку команды. Сообщения проверяются на каждой границе,
команды UI принимаются только от страницы новой вкладки расширения.

`scripting` и доступ к точному домену Музыки объявлены необязательными и
запрашиваются кнопкой подключения. `entrypoints/yandex-music.ts` собирается
как unlisted script: обязательные `host_permissions` и `content_scripts`
в manifest не добавляются. После разрешения фоновый процесс регистрирует
скрипт для будущих загрузок и подключает уже открытые вкладки.
При отключении наблюдение останавливается, регистрация и доступ отзываются.

«Авто» выбирает играющую вкладку, затем последнюю активную; при равенстве —
меньший ID. Ручной выбор удерживается до закрытия вкладки или возврата в «Авто».
Закрытие источника возвращает автоматический выбор с сообщением в карточке.
Открытие и фокусировка Музыки выполняются только явной кнопкой; удаление
виджета, смена пространства и закрытие дашборда не останавливают музыку.

Клиент разделяет подписку между экземплярами на одной странице. Состояние
сверяется раз в секунду, пока виджет видим; фоновые страницы дашборда не
опрашивают плеер. DOM-наблюдение в Музыке отключается через 2,5 секунды после
последнего чтения. Изменения страницы дают дополнительный сигнал обновления.

Метаданные реестра `platform: 'extension'` ограничивают добавление без ветвлений
по типу в dashboard. В веб-каталоге такая карточка недоступна, в поиске команд
добавление исключено; импортированный виджет показывает ограничение и ссылку.
Веб-адаптер не эмулирует управление вкладками или разрешения Chrome.

`wxt.config.ts` is the manifest source. Permissions are `storage`,
`unlimitedStorage`, `favicon`, `alarms`, `notifications`, `offscreen`, and `contextMenus`.
Host permissions include `https://api.open-meteo.com/*`,
`https://geocoding-api.open-meteo.com/*`, and `file:///*`. Static assets in `public/` are
bundled, and generated `.wxt/` and `.output/` directories are never source files.

## Сохранение материалов из браузера

`capture/context-menus.ts` регистрирует меню страниц, ссылок и выделенного
текста в service worker. Подменю отражает пространства и Markdown-заметки,
содержит создание новой заметки и обновляется после изменения названий или
состава. Записи одного текста не пересоздают меню. После перезапуска worker
меню строится заново; операции обновления выполняются последовательно.

`widgets/markdown/browser-capture.ts` преобразует выделение в Markdown-цитату
с источником, а страницу или ссылку — в пункт списка. Разметка выделенного
текста экранируется, адреса проверяются существующим валидатором.
Подпись страницы или ссылки содержит домен и поддомены без последней зоны
(`docs.example.ru` → `docs.example`), протокола, порта и пути. Полный адрес
перехода сохраняется; IP-адреса и локальные имена не сокращаются.
`storage/markdown-capture.ts` читает последнюю конфигурацию внутри общего
Web Lock и сохраняет дополненную заметку через репозиторий. Новая карточка
размещается ниже существующих; активное пространство не переключается.
Удалённая цель и ошибки записи показываются уведомлением, успешное сохранение
подтверждается только после завершения записи. Открытые вкладки получают
обновление через существующий WXT watcher и сохраняют обычную обработку конфликтов.

Разрешение `contextMenus` нужно только для явного действия пользователя.
Расширение не сканирует страницы и не получает новых разрешений на сайты,
историю, закладки или чтение всех вкладок.

## Панель управления

Схема v9 хранит глобальный `toolbar: ToolbarConfig` в корне `DashboardConfig`:
`top-right`, `left-fixed` или `left-collapsible`. Настройка не принадлежит
оформлению пространства. `updateToolbar` использует общую очередь немедленных
записей и объединяет изменения с ожидающими правками виджетов и стекла.

`DashboardControls` владеет действиями и диалогами. `DashboardToolbar` отвечает
за оболочку, геометрию и анимацию; `useDashboardToolbar` — за временное раскрытие,
фокус и клик снаружи. Одна копия кнопок используется во всех режимах.
`configEpoch` сбрасывает раскрытие при импорте или принятии внешней конфигурации;
он отделён от `historyEpoch`, который меняется также при переключении пространства.

Левая панель имеет ширину 56 px и отступ 8 px. Высота ограничена viewport;
список действий прокручивается отдельно от кнопки сворачивания. CSS `:has()`
связывает видимость панели с `--toolbar-canvas-shift`: 88 px для открытой или
постоянно видимой панели, иначе 0. Боковые padding полотна одинаковы — по 24 px.
При скрытой панели дополнительных отступов нет; при открытой зазор до карточек — 48 px.
Ширина `.dashboard-canvas-grid` сразу уменьшается на сдвиг; `useContainerWidth`
измеряет итоговую ширину обычным способом, без покадрового пересчёта React-сетки.
Полотно и панель перемещаются через transform за 260 мс с одной кривой
`cubic-bezier(0.22, 1, 0.36, 1)`; `prefers-reduced-motion` отключает сдвиг.
Хранилище и координаты layout не меняются. Минимальная ширина полотна 960 px и горизонтальная
прокрутка сохраняются. Верхний отступ сетки — 24 px вместо 80 px.
`WidgetCanvas` передаёт временное состояние drag/resize для отключения зоны раскрытия.

Обёртка `.dashboard-canvas-viewport` ограничивает горизонтальное переполнение через `overflow-x: clip`
с `overflow-clip-margin: 1.5rem`, соответствующим боковым отступам области.
Это оставляет место теням, но не даёт анимируемым карточкам расширять scroll area
при пересчёте ширины. Минимальная ширина обёртки учитывает 960 px полотна и сдвиг;
на узком экране она по-прежнему прокручивается снаружи;
вертикальное размещение и перемещение не ограничены.

Ручка раскрытия появляется при hover левой полосы или фокусе через Tab.
Полоса шириной 24 px занимает высоту viewport за вычетом 16 px с каждой стороны.
Внешний `click`
закрывает панель после активации цели; закрытие по `pointerdown` сдвинуло бы
виджеты до отпускания мыши и могло бы отменить или перенаправить клик.

Компактный `WorkspaceSelector` открывает popup справа через portal внутри
`.dashboard-root`, сохраняя переменные темы и стекло. Позиция учитывает viewport,
resize и прокрутку. Обработчики внешнего клика учитывают popup как часть панели.
Скрытая панель использует `inert` и `aria-hidden`; ручка доступна через Tab.
`Dialog.returnFocusFallback` — необязательная функция получения доступной цели,
если прежний элемент удалён или оказался внутри `inert` после смены режима.

## Доступность и переходы интерфейса

Полноэкранные редакторы Markdown и собственных тем используют общий нативный
`Dialog`. Редактор темы загружается через `React.lazy` только по запросу вместе
с тяжёлым предпросмотром Markdown. При полноэкранном просмотре редактор закрыт,
но остаётся смонтированным: черновик сохраняется до возвращения. При окончательном
закрытии `onExited` освобождает редактор, возвращает окно оформления и фокус
к кнопке, открывшей редактор. Оболочка использует активные semantic tokens;
редактируемая палитра ограничена предпросмотром.

`Disclosure` хранит поля смонтированными при сворачивании, исключает их из
доступного дерева и Tab-порядка через `aria-hidden` / `inert` и возвращает фокус
к заголовку при программном закрытии. Вариант `plain` добавляет стрелку
к обычному заголовку без дополнительной карточки. `SettingsBlock` связывает
раскрытие блоков с общими настройками панели; отсутствие сохранённого значения
означает раскрытый блок. `Popover` удерживает
уходящую поверхность только для короткой анимации, сразу делая её недоступной.
Списки внутри диалогов расположены в потоке прокручиваемого содержимого.
Оболочка диалога и анимируемые разделы используют `overflow: clip`, чтобы
`scrollIntoView` прокручивал тело диалога, сохраняя заголовок на месте.
Закрытый `Dialog` становится `inert` сразу, включая время CSS-перехода выхода.
`Select`, выбор часового пояса и поиск города используют `aria-activedescendant`;
Escape сначала закрывает список, затем диалог.

Motion используется только в этих интерактивных поверхностях через `m`,
`LazyMotion` и асинхронный `domAnimation`. Параметр `reducedMotion` в `MotionConfig` связан с общим предпочтением анимации
и отключает пространственное движение; общий `useAnimationPreferences` отдельно
управляет высотой и длительностью переходов. Фичи Motion не запрашиваются до открытия интерактивной
поверхности. CSS обслуживает обычные состояния, нативные диалоги, левую панель
и появление содержимого после смены пространства. Первый показ дашборда не
анимируется; смена пространства не дублирует деревья виджетов. Появление нового
виджета меняет только прозрачность и имеет резервную очистку временного флага;
координатами и transform сетки по-прежнему управляет `react-grid-layout`.

`DashboardControls` хранит один `settingsSection`; `SettingsPanel` владеет единственным
`Dialog` размера `drawer` и видимыми вкладками в фиксированной области навигации.
Вкладки используют `tablist`/`tab`/`tabpanel`, перемещаемый Tab-фокус и активацию
стрелками и Home/End с пропуском недоступных разделов. Доступное имя содержимого
связано с вкладкой через `aria-labelledby`; отдельного повторного заголовка нет.
`AppearanceSettings`, `InterfaceSettings`, `WorkspaceSettings`, `BackupSettings` и
`ShortcutsHelp` содержат только интерфейс своих разделов. Оформление и резервные
копии загружаются лениво. Переход между разделами сохраняет экземпляр диалога и
исходную точку возврата фокуса, сбрасывает прокрутку и освобождает содержимое
предыдущего раздела. Переход или закрытие сохраняет ожидающий предпросмотр
оформления; unmount отменяет проверку обоев или незавершённый импорт. При возврате
из редактора темы фокус восстанавливается по идентификатору действия, поскольку
содержимое оформления создаётся заново. Ограничения доступа к изменению данных и
резервным копиям действуют также для вкладок панели.

Необязательное поле `settingsPanel` в общих `InterfacePreferences` схемы v10
хранит ширину в CSS px и список `collapsedBlocks` со стабильными типизированными
ID. Это совместимое дополнение: старые конфигурации получают стандартную ширину
448 px и раскрытые блоки без миграции. Данные проверяются на границе хранения
и входят в обычный JSON-backup. Изменения проходят через
`updateInterfacePreferences` и общую очередь записи, включая ожидающий
предпросмотр оформления. Ошибки записи отображаются существующим механизмом.

`useSettingsPanelResize` управляет перетаскиванием левого разделителя с Pointer
Capture и клавиатурой. Предпросмотр ширины локален, запись происходит после
завершения жеста; закрытие, потеря фокуса окна, `pagehide` и unmount сохраняют
последнее значение. Escape и `pointercancel` отменяют жест. Минимум — 320 px,
максимум ограничен viewport; временное сужение окна не перезаписывает
предпочтительную ширину. Стрелки меняют её на 16 px (с Shift — на 64 px),
Home/End выбирают границы, двойной щелчок сбрасывает ширину. Панель остаётся
поверх сетки. Переход из палитры команд раскрывает нужный блок вместе с его
свёрнутыми родителями; остальные блоки сохраняют состояние.

При
активных обоях управляющие кнопки и всплывающие меню получают непрозрачную
подложку темы; подписи карточек усиливаются без изменения палитры и параметров
Liquid Glass. Изображения и погодные сцены остаются без дополнительного слоя.

## Настройки отображения и клавиатуры

`interfaceTextScale` — совместимое необязательное глобальное поле схемы v10:
целое число 80–150, отсутствие означает 100%. Оно проходит
`updateInterfacePreferences` и обычное немедленное сохранение. Корневая
CSS-переменная `--interface-text-scale` масштабирует типографические utilities,
не меняя `rem`, размеры сетки и координаты. `DashboardToolbar` наблюдает высоту
верхней панели через `ResizeObserver`: `--toolbar-top-clearance` резервирует
место над сеткой, если увеличенные подписи или действия переносятся на новые строки.
Оболочки содержимого виджетов и
Markdown изолируют масштаб; элементы управления сохраняют масштаб интерфейса.

Необязательное `BaseWidgetConfig.appearance` хранит только переопределения:
`borderRadius` и частичный `liquidGlass` (`enabled`, `pointerLight`,
`transparency`, `blur`, `shadow`). Валидатор проверяет типы и те же диапазоны,
что у общих настроек; отсутствие каждого поля означает наследование.
`WidgetAppearanceContext` передаёт оформление пространства к `WidgetHost`,
который объединяет его с переопределениями и задаёт локальные CSS-переменные
и признаки стекла/блика на `article`. Поэтому отдельная карточка может включать
стекло при выключенном общем эффекте и наоборот. Интенсивность тени вычисляется
на поверхности с локальным значением, цвет остаётся токеном темы.
`WidgetAppearanceSettings` добавляет общий блок в редакторы реестра без
ветвления по типу виджета. Изменения используют существующий debounce виджета
300 мс и flush при закрытии, Escape, `pagehide` и unmount. Сброс удаляет
переопределения; копирование и backup v3 сохраняют их как часть конфигурации.
Версии схемы и резервной копии не меняются.

Совместимые необязательные поля схемы v9 сохраняют прежнее поведение при
отсутствии: `appearance.gridGap` (16 px), `appearance.gridPadding` (24 px),
`markdown.typography`, `animationMode` (`system`) и `shortcuts` (стандартные
назначения). Валидатор проверяет диапазоны, перечисления и конфликты клавиш;
неверные данные отклоняются при загрузке и импорте. Оболочка backup v3 не меняется.

`MarkdownTypographySettings` отправляет типизированную конфигурацию через
обычный debounce редактора. Renderer применяет оформление к собственной оболочке
после санитайзера; пользовательские style-атрибуты остаются запрещены. Стиль
заголовка передаётся host через `getTitleStyle` определения реестра, без проверки
типа Markdown в dashboard. Ширина чтения применяется только в reader.

Ползунки сетки переиспользуют существующий appearance preview/flush. Значения
применяются к RGL, расчёту группового drag и видимой нижней границе клавиатурного
перемещения. Внешний отступ меняет оболочку сетки; фиксированный резерв верхней
панели и сдвиг левой панели сохраняются.

`AnimationPreferences` предоставляет React context и эффективный
`data-motion="full|reduced|off"` на корневом HTML. Системное предпочтение наблюдается
через `matchMedia` и `useSyncExternalStore`. Motion-поверхности используют общий
hook; CSS диалогов, сетки и погоды использует тот же атрибут. GIF не затрагиваются.

`keyboard/shortcuts.ts` — общий типизированный каталог команд, стандартных
назначений, сопоставления, подписей и проверки конфликтов. Сохраняются только
переопределения, пустой массив отключает команду. Запись сочетания остаётся
временным состоянием формы и отменяется при Escape, потере фокуса или закрытии.
Изменения глобальных параметров проходят `updateInterfacePreferences` и обычную
очередь repository. Справка, подсказки и обработчики используют актуальные
назначения; текстовые поля, открытые диалоги и стандартные операции сохраняют
свои ограничения.
