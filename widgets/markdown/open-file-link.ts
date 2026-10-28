import { browser } from 'wxt/browser';

export interface OpenFileLinkOptions {
  inNewTab?: boolean;
}

export interface OpenFileLinkResult {
  opened: boolean;
  copied: boolean;
  message?: string;
}

export async function openLocalFileLink(
  href: string,
  options: OpenFileLinkOptions = {},
): Promise<OpenFileLinkResult> {
  const inNewTab = Boolean(options.inNewTab);

  let isAllowed = false;
  if (
    typeof browser !== 'undefined' &&
    typeof browser.extension?.isAllowedFileSchemeAccess === 'function'
  ) {
    try {
      isAllowed = await browser.extension.isAllowedFileSchemeAccess();
    } catch {
      isAllowed = false;
    }
  }

  if (isAllowed) {
    try {
      if (inNewTab) {
        await browser.tabs.create({ url: href });
      } else {
        await browser.tabs.update({ url: href });
      }
      return { opened: true, copied: false };
    } catch {
      // Fall through to clipboard copy if tabs navigation fails
    }
  }

  let copied = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href);
      copied = true;
    }
  } catch {
    copied = false;
  }

  const message = !browser.runtime.id
    ? copied
      ? 'Ссылка скопирована. Откройте её в адресной строке браузера: веб-приложение не может открывать локальные файлы'
      : 'Веб-приложение не может открывать локальные файлы. Скопируйте ссылку и откройте её в адресной строке браузера'
    : copied
      ? 'Ссылка скопирована в буфер обмена. Для прямого открытия включите доступ к файлам в chrome://extensions'
      : 'Для прямого открытия включите «Разрешить открывать файлы по ссылкам» в chrome://extensions';

  return { opened: false, copied, message };
}
