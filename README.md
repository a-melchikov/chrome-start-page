# Chrome Start Page

Chrome Start Page — расширение для Google Chrome, которое заменяет стандартную страницу новой вкладки на собственную стартовую страницу.

## Требования

- Node.js 22 LTS;
- pnpm 10.

Версию Node.js можно выбрать через `nvm use`.

## Разработка

1. Склонировать репозиторий:

```bash
git clone https://github.com/a-melchikov/chrome-start-page.git
```

2. Установить зависимости и запустить WXT в режиме разработки:

```bash
pnpm install
pnpm dev
```

## Сборка и установка в Chrome

1. Собрать расширение:

```bash
pnpm build
```

2. Открыть в Chrome:

```text
chrome://extensions
```

3. Включить **Режим разработчика**.

4. Нажать **Загрузить распакованное расширение**.

5. Выбрать каталог `.output/chrome-mv3` внутри проекта.

6. Открыть новую вкладку:

```text
chrome://newtab
```

или нажать:

```text
Ctrl + T
```

Если расширение установлено корректно, вместо стандартной страницы Chrome будет отображаться пользовательская страница Chrome Start Page.

## Проверка типов

```bash
pnpm typecheck
```
