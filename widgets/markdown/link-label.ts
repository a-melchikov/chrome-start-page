import { normalizeLinkUrl } from './validation';

export function getShortLinkLabel(href: string): string {
  const { hostname, protocol } = new URL(href);
  if (protocol === 'file:' || !hostname) return href;
  if (hostname.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }
  return hostname.replace(/\.$/, '').replace(/\.[^.]+$/, '');
}

export function getLinkDisplayLabel(href: string, label: string): string {
  if (href.startsWith('file:')) return label || href;
  if (!label.trim()) return getShortLinkLabel(href);
  const normalizedLabel = normalizeLinkUrl(label);
  return normalizedLabel.valid && normalizedLabel.href === href
    ? getShortLinkLabel(href)
    : label;
}
