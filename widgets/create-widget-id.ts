export function createWidgetId(): string {
  return globalThis.crypto.randomUUID();
}
