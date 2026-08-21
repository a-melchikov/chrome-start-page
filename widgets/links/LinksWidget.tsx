import type { LinksWidgetConfig } from './types';

interface LinksWidgetProps {
  config: LinksWidgetConfig;
}

export function LinksWidget({ config }: LinksWidgetProps) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {config.content.trim()
        ? 'Предпросмотр ссылок появится на следующем этапе.'
        : 'Список ссылок пока пуст.'}
    </p>
  );
}
