# Chrome Start Page

Chrome Start Page — расширение Manifest V3 для Google Chrome, которое заменяет
стандартную новую вкладку на настраиваемую локальную панель с виджетами.
Текущая версия MVP: **0.1.0**.

## Возможности MVP

- включение режима редактирования кнопкой с карандашом;
- добавление нескольких универсальных Markdown-виджетов;
- добавление нескольких компактных поисковых строк с выбором Google, Яндекса,
  Bing или DuckDuckGo и встроенной фирменной иконкой выбранного сервиса;
- полноэкранный split-editor с исходным Markdown и живым preview;
- CommonMark, GFM-таблицы, task lists, зачёркивание, ссылки, HTTPS-изображения,
  цитаты, footnotes, безопасный HTML и блоки кода с копированием;
- интерактивные task-list checkbox, которые обновляют исходный Markdown;
- локальные favicon сайтов без внешнего favicon API;
- перемещение и изменение размера виджетов в 12-колоночной сетке;
- темы `system`, `light` и `dark`, а также произвольный цвет фона;
- автоматическое сохранение содержимого, оформления и layout;
- восстановление конфигурации после перезапуска Chrome.

Например:

```md
# Рабочее

- [ ] Проверить [почту](https://mail.example.com/)
- [x] Открыть [документацию](docs.example.com)
```

URL без протокола нормализуется в `https://`, если адрес однозначен. Разрешены
только протоколы HTTP и HTTPS.

## Стек

- WXT 0.21 и Manifest V3;
- React 19 и TypeScript в strict mode;
- Vite через WXT;
- Tailwind CSS 4;
- `react-grid-layout`;
- `react-markdown`, `remark-gfm`, `rehype-raw` и `rehype-sanitize`;
- WXT Storage поверх `chrome.storage.local`;
- Vitest и React Testing Library;
- ESLint и Prettier;
- pnpm.

## Требования

- Node.js 22 LTS — точная версия указана в [.nvmrc](.nvmrc);
- pnpm 10 — версия зафиксирована в поле `packageManager` файла `package.json`;
- Google Chrome с поддержкой Manifest V3.

При использовании nvm:

```bash
nvm use
corepack enable
```

## Установка зависимостей

```bash
pnpm install
```

Команда `postinstall` запускает `wxt prepare` и создаёт служебные типы WXT в
каталоге `.wxt/`.

## Режим разработки

```bash
pnpm dev
```

WXT собирает development-версию в `.output/chrome-mv3-dev` и следит за
изменениями исходных файлов. Для первой установки этой версии откройте
`chrome://extensions`, включите режим разработчика, нажмите «Загрузить
распакованное расширение» и выберите каталог:

```text
<корень-репозитория>/.output/chrome-mv3-dev
```

После изменения файлов дождитесь успешной пересборки WXT и откройте новую
вкладку заново. Если Chrome не применил обновление автоматически, нажмите
«Обновить» на карточке расширения в `chrome://extensions`.

Рекомендуемый цикл перед завершением работы:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Production build и ZIP

Готовая распакованная production-сборка:

```bash
pnpm build
```

Результат находится точно в:

```text
<корень-репозитория>/.output/chrome-mv3
```

ZIP с готовым Chrome extension:

```bash
pnpm package
```

`wxt zip` самостоятельно выполняет production build и создаёт:

```text
<корень-репозитория>/.output/chrome-start-page-0.1.0-chrome.zip
```

Каталоги `.output/` и `.wxt/` являются генерируемыми и не коммитятся.

## Локальная установка production-сборки

1. Выполните `pnpm build`.
2. Откройте `chrome://extensions`.
3. Включите «Режим разработчика».
4. Нажмите «Загрузить распакованное расширение».
5. Выберите **точно** каталог `.output/chrome-mv3` в корне репозитория.
6. Откройте `chrome://newtab` или создайте новую вкладку.

После новой production-сборки нажмите «Обновить» на карточке расширения и
переоткройте новую вкладку.

## Команды

| Команда          | Назначение                                      |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Development-сборка WXT с наблюдением за файлами |
| `pnpm build`     | Production-сборка в `.output/chrome-mv3`        |
| `pnpm package`   | Production-сборка и ZIP-архив расширения        |
| `pnpm lint`      | Проверка ESLint                                 |
| `pnpm typecheck` | Проверка TypeScript без генерации файлов        |
| `pnpm test`      | Однократный запуск тестов Vitest                |
| `pnpm format`    | Форматирование файлов через Prettier            |

## Структура проекта

```text
entrypoints/newtab/    WXT entrypoint новой вкладки и корневой React App
components/dashboard/ Dashboard, управление виджетами и grid layout
components/ui/        Небольшие переиспользуемые UI-примитивы
hooks/                Загрузка, изменение и сохранение конфигурации
widgets/              Widget Registry, общие типы и реализации виджетов
widgets/markdown/     MarkdownWidget, renderer, editor и URL validation
widgets/search/       SearchWidget, editor и фиксированные поисковые endpoints
storage/              Схема, defaults, migrations и WXT Storage abstraction
public/icons/         PNG-иконки, попадающие в extension build
public/search-engines/ Локальные SVG-иконки поисковиков и сведения об источнике
assets/icons/         Исходный SVG иконки
tests/                Тесты storage, domain logic и React-сценариев
docs/                 Техническая документация
```

Подробное описание потока данных и расширения registry находится в
[docs/architecture.md](docs/architecture.md).

## Хранение данных и privacy

Вся пользовательская конфигурация хранится под ключом
`local:dashboard-config` в `chrome.storage.local`. Она включает версию схемы,
оформление, layout, исходный текст MarkdownWidget и выбранный поисковик
SearchWidget. `MarkdownWidget.content` является единственным источником данных:
отрендеренная разметка и отдельный список URL не сохраняются. Текст поискового запроса
не сохраняется и отправляется выбранному поисковику только после Enter или
нажатия кнопки поиска.

SearchWidget отображается без карточки и заголовка, занимает `6×1` ячеек по
умолчанию и изменяется только по ширине. Поисковик выбирается в отдельном
диалоге настроек; его можно закрыть кнопкой «Готово» или клавишей Escape.

У расширения нет backend, авторизации, аналитики и телеметрии. Пользовательские
настройки и URL не отправляются разработчику или сторонним сервисам. Иконки
поисковиков встроены в расширение и не загружаются из сети. Только favicon
ссылок внутри Markdown запрашиваются через внутренний endpoint Chrome
`_favicon` из локального хранилища браузера.

Разрешения Manifest V3:

- `storage` — чтение и запись конфигурации в `chrome.storage.local`;
- `favicon` — доступ к локальному endpoint Chrome `_favicon`.

`host_permissions` не используются.

## Ограничения MVP

- доступны виджеты `MarkdownWidget` и `SearchWidget`;
- Math, Mermaid, YAML frontmatter, загрузка файлов и offline-кэш изображений не
  поддерживаются;
- HTML проходит через sanitizer: скрипты, формы, iframe, event-атрибуты,
  произвольные стили и опасные URL удаляются;
- изображения разрешены только по HTTPS;
- SearchWidget не поддерживает историю, онлайн-подсказки и пользовательские
  URL-шаблоны;
- ссылки ограничены протоколами HTTP и HTTPS;
- конфигурация не синхронизируется между профилями и устройствами;
- нет импорта, экспорта и сброса настроек;
- нет backend, аккаунтов и совместного доступа;
- публикация в Chrome Web Store не настроена.

На узких экранах сохраняется desktop-layout шириной не менее 960 px и
появляется горизонтальная прокрутка: координаты виджетов не перестраиваются и
не теряются.

## Roadmap

- Clock widget;
- Google Calendar widget.
