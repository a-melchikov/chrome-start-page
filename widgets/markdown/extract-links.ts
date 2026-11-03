import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { normalizeLinkUrl } from './validation';
import { getLinkDisplayLabel } from './link-label';

export interface MarkdownLink {
  href: string;
  label: string;
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  identifier?: string;
  children?: MarkdownNode[];
}

const processor = unified().use(remarkParse).use(remarkGfm);

function textOf(node: MarkdownNode): string {
  return node.value ?? node.children?.map(textOf).join('') ?? '';
}

export function extractMarkdownLinks(content: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const root = processor.parse(content) as MarkdownNode;
  const definitions = new Map<string, string>();
  const collectDefinitions = (node: MarkdownNode) => {
    if (
      node.type === 'definition' &&
      node.identifier &&
      node.url &&
      !definitions.has(node.identifier)
    ) {
      definitions.set(node.identifier, node.url);
    }
    node.children?.forEach(collectDefinitions);
  };
  collectDefinitions(root);

  const add = (url: string, label: string) => {
    if (url.startsWith('#')) return;
    const normalized = normalizeLinkUrl(url);
    if (normalized.valid) {
      links.push({
        href: normalized.href,
        label: getLinkDisplayLabel(normalized.href, label.trim()),
      });
    }
  };

  const addHtml = (html: string) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('a[href]').forEach((anchor) => {
      add(anchor.getAttribute('href') ?? '', anchor.textContent ?? '');
    });
  };

  const visit = (node: MarkdownNode) => {
    if (node.type === 'linkReference' && node.identifier) {
      const url = definitions.get(node.identifier);
      if (url) add(url, textOf(node));
      return;
    }
    if (node.type === 'link' && node.url) {
      add(node.url, textOf(node));
      return;
    }

    if (node.type === 'html' && node.value?.includes('</a>')) {
      addHtml(node.value);
    }

    node.children?.forEach((child, index, siblings) => {
      if (
        child.type === 'html' &&
        /^<a\b/i.test(child.value ?? '') &&
        !child.value?.includes('</a>')
      ) {
        let html = child.value ?? '';
        for (let next = index + 1; next < siblings.length; next += 1) {
          const sibling = siblings[next];
          if (!sibling) break;
          html += textOf(sibling);
          if (sibling.type === 'html' && sibling.value?.includes('</a>')) break;
        }
        if (html.includes('</a>')) addHtml(html);
      }
      visit(child);
    });
  };

  visit(root);
  return links;
}
