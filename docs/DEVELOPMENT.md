# Development

## Requirements

- Node.js 22 (`.nvmrc`)
- pnpm 10.34.5 (pinned in `package.json`)
- Google Chrome with Manifest V3 support for manual testing

With nvm/corepack:

```bash
nvm use
corepack enable
```

## Install

```bash
pnpm install
```

`postinstall` runs `wxt prepare`; `.wxt/` is generated and ignored.

## Run

### Приложение без установки расширения

После `pnpm install` можно запустить дашборд в отдельном окне Chrome/Chromium:

```bash
pnpm dev:app
```

Команда поднимает Vite на `http://127.0.0.1:5173`, открывает окно без панели
вкладок (`--app`) и использует отдельный профиль `.output/web-app-profile`.
Установка расширения не требуется. F12 открывает DevTools; изменения исходников
подхватываются Vite. Закрытие окна завершает запущенный сервер; Ctrl+C закрывает
окно и сервер. Не запускайте два экземпляра с одним профилем одновременно.

Если нужен только сервер для браузера или E2E-инструмента:

```bash
pnpm dev:web
```

Сборка веб-версии с source maps и её локальный просмотр:

```bash
pnpm build:web
pnpm preview:web
```

Параметры запуска:

| Переменная        | Назначение                                                                      |
| ----------------- | ------------------------------------------------------------------------------- |
| `BROWSER_BIN`     | Путь к Chrome/Chromium для `dev:app`; по умолчанию ищется установленный браузер |
| `WEB_PORT`        | Порт `dev:app` и Docker Compose, по умолчанию `5173`                            |
| `APP_PROFILE_DIR` | Каталог отдельного профиля `dev:app` с сохранёнными данными                     |
| `APP_DEVTOOLS=1`  | Автоматически открыть DevTools                                                  |
| `APP_URL`         | Открыть уже работающий сервер; `dev:app` не поднимает собственный Vite          |

```bash
APP_DEVTOOLS=1 WEB_PORT=5174 pnpm dev:app
BROWSER_BIN=/path/to/chromium pnpm dev:app
pnpm dev:web --host 127.0.0.1 --port 5174
```

### Запуск через Docker

Нужны Docker Engine и Docker Compose:

```bash
docker compose up --build
```

Приложение доступно на `http://127.0.0.1:5173`. Контейнер раздаёт готовую
веб-сборку через nginx; Node.js на хосте для этого не нужен. Source maps доступны
в DevTools. После изменения исходников повторите сборку; для живой разработки
используйте `pnpm dev:app` или `pnpm dev:web`.

Чтобы открыть контейнерную сборку отдельным окном, при наличии Node.js на хосте:

```bash
APP_URL=http://127.0.0.1:5173 pnpm dev:app
```

Можно также запустить Chrome напрямую:

```bash
google-chrome --app=http://127.0.0.1:5173
```

Смена порта и остановка:

```bash
WEB_PORT=5174 docker compose up --build
docker compose down
```

Docker публикует порт только на `127.0.0.1`. Данные хранятся в браузере,
а не в контейнере: Docker volume не нужен, пересоздание контейнера их не удаляет.

### Данные и границы веб-режима

- Используется настоящий `App` с теми же виджетами, сеткой, редакторами,
  миграциями, Undo/Redo и JSON-резервными копиями.
- WXT Storage работает поверх веб-адаптера IndexedDB (`chrome-start-page-web`).
  Изменения рассылаются другим окнам через BroadcastChannel; записи конфигурации
  используют прежний Web Lock. Сессионные ссылки изображений разделяются
  между окнами и очищаются после завершения всех документов приложения,
  включая перезагрузку единственного окна. Undo также живёт только в документе.
- Данные привязаны к origin и профилю: `localhost`, `127.0.0.1` и разные порты
  имеют разные хранилища. Для переноса данных используйте штатный JSON-экспорт
  и импорт. Хранилище установленного расширения не затрагивается. Действуют
  обычные лимиты IndexedDB; разрешение расширения `unlimitedStorage` здесь
  недоступно.
- Нужен localhost или HTTPS: Web Locks и буфер обмена требуют защищённого
  контекста. В DevTools → Application → IndexedDB видны конфигурация и ресурсы.
- Нативное контекстное меню Chrome, замена новой вкладки и разрешения расширения
  проверяются только в установленном расширении.
- Pomodoro работает, пока приложение открыто; фоновые Chrome Alarms,
  offscreen audio и системные уведомления расширения в веб-режиме отсутствуют.
  Браузер может ограничивать таймеры и звук в неактивном окне.
- Наборы сайтов открываются через `window.open`. Браузер управляет фокусом
  и может блокировать несколько окон: разрешите всплывающие окна для локального
  адреса. Повторное открытие неудавшихся сайтов остаётся доступным.
- Вместо приватных Chrome favicon используются обычные иконки ссылок.
  `file://`-ссылки копируются для ручного открытия. Погода и удалённые изображения
  подчиняются обычным сетевым ограничениям браузера, включая CORS.

### Проверка расширения

```bash
pnpm dev
```

Load `.output/chrome-mv3-dev` through `chrome://extensions` → Developer mode →
Load unpacked. After changes, wait for WXT to rebuild and reopen the new tab;
reload the extension if Chrome has not picked up the build.

### Браузерная проверка для агента

После изменения форм, виджетов, оформления или пользовательских сценариев
проверяйте результат непосредственно в браузере до сдачи задачи. Запуск локального
приложения и обычные тестовые действия разрешены в рамках разработки; дополнительный
вопрос «запустить ли MCP-проверку» не нужен. Явные ограничения пользователя
имеют приоритет. Для изменений только документации запуск UI не требуется.

1. Выберите доступный Chrome DevTools MCP, Playwright MCP, Browser Use или
   Computer Use с управлением браузером. Проверьте его реальные возможности
   и прочитайте инструкции инструмента. Если один способ недоступен, используйте
   другой доступный; при отсутствии управления браузером сообщите `NOT_RUN`
   с конкретной причиной.
2. Проверьте, не запущен ли уже сервер текущего checkout. Если нет, запустите
   `pnpm dev:web` как длительный процесс и дождитесь HTTP-ответа, загрузки
   дашборда и активных кнопок. Если порт занят другим сервисом, выберите свободный:
   `pnpm dev:web --port 5174`. Не завершайте чужой процесс ради освобождения порта.
   Принимайте URL из вывода сервера.
3. Откройте этот URL браузерным инструментом. Для автоматизации отдельное окно
   `dev:app` не обязательно: инструмент может открыть свою управляемую вкладку
   с тем же веб-приложением. Проверка не требует установки расширения. Готовую
   сборку можно проверять через `pnpm build:web` + `pnpm preview:web` или Docker.
4. Используйте отдельный тестовый профиль/контекст и синтетические данные.
   Хранилище зависит от origin и профиля; не очищайте пользовательский IndexedDB
   или профиль расширения. Если нужен перенос исходного состояния, используйте
   штатный JSON-импорт в тестовом контексте.
5. Пройдите изменённый сценарий через реальные кнопки и поля, по текущему
   DOM-снимку или скриншоту: открыть форму → ввести значения → сохранить
   либо дождаться автосохранения → закрыть → открыть снова или перезагрузить.
   Проверьте сохранённый результат. Прямой вызов обработчика, запись в IndexedDB
   или программный `element.click()` не заменяют пользовательское взаимодействие.
   Такие операции допустимы для подготовки данных и отдельной диагностики.
6. Проверьте относящиеся к изменению границы: невалидный/пустой ввод, отмену,
   Escape, клавиатурный фокус; для сетки — перемещение и размер, для внешнего
   вида — светлую/тёмную тему и тесный viewport. Не запускайте несвязанные
   сценарии. Дождитесь конца перехода закрытия перед проверкой возврата фокуса.
7. Проверьте доступные console/runtime errors и визуальный результат, сохраните
   снимок затронутой формы или экрана. Ошибки в рамках задачи исправьте и
   повторите проверку. Не считайте успешно проверенным сценарий, который был
   только открыт без взаимодействия.
8. После проверки остановите только запущенные вами тестовые серверы/контейнеры
   и закройте тестовые окна, если пользователь не просил оставить приложение.
   В отчёте укажите инструмент, проверенные сценарии и результат
   `PASS / FAIL / NOT_RUN`, а также оставшиеся ограничения. Не выдавайте
   успешную веб-проверку за проверку нативных API расширения.

Браузерная проверка дополняет `pnpm check`. Рекомендации для измерения
производительности и проверки нативного расширения находятся в
[mcp-verify](../.agents/skills/mcp-verify/SKILL.md).

## Quality Checks

`pnpm check` выполняет все проверки, включая production-сборки расширения
и веб-приложения.

```bash
pnpm exec prettier --check .
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:web
```

`pnpm format` writes Prettier changes. Prefer a focused Vitest invocation while
iterating, then run the complete suite before handoff.

## Build and Package

```bash
pnpm build
pnpm package
```

- Unpacked production extension: `.output/chrome-mv3`
- ZIP package: `.output/chrome-start-page-0.1.1-chrome.zip`

Both paths are generated and ignored by Git.

## Project-specific Notes

- Tests use jsdom, React Testing Library, WXT's Vitest plugin, and fake browser
  storage. Native `<dialog>` behavior is shimmed in `tests/setup.ts`.
- Vitest may print a non-fatal WXT debug message about the optional `web-ext`
  runner. The project does not use that runner; rely on the test exit status.
- Unit/integration tests cannot fully verify Chrome new-tab replacement or
  extension asset loading. Check ordinary UI/layout flows in standalone web
  mode; verify native extension behavior in the loaded extension separately.
- The manifest is generated from `wxt.config.ts`; do not add a standalone
  `manifest.json`.
- The new-tab JavaScript chunk size warning is capped at 500 kB. Widget
  renderers load when their widget is mounted, and their editors load only when
  opened; keep production builds below this initial-chunk budget.
- Static runtime assets belong in `public/`; extension source icons live in
  `assets/`. Do not edit generated `.wxt/` or `.output/` files.
- `PLAN.md` is an obsolete, untracked bootstrap plan and is intentionally
  excluded from Prettier. Current requirements live in code, README, and the
  context documents.

## Проверка переходов интерфейса

`motion` используется точечно для раскрывающихся разделов и всплывающих
поверхностей. Импортировать `m` из `motion/react-m`; `MotionProvider` загружает
`domAnimation` асинхронно. Не использовать полный `motion` или `domMax` на
стартовом экране и не оборачивать элементы сетки в layout-анимации.

После UI-изменений выполнять `pnpm check` и Chrome smoke check. Проверять
Tab/стрелки/Escape, быстрые повторные раскрытия, возврат фокуса, системное
уменьшение движения и окно высотой 400 px. При недоступной странице расширения
веб-режим подходит для визуальной проверки и IndexedDB, но не подтверждает работу
реальных Chrome permissions, background worker и chrome.storage.
