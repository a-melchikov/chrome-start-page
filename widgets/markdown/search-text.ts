import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface SearchNode {
  type: string;
  value?: string;
  alt?: string;
  children?: SearchNode[];
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective);
const inlineContainers = new Set([
  'paragraph',
  'heading',
  'strong',
  'emphasis',
  'delete',
  'link',
  'linkReference',
  'textDirective',
]);

export function extractMarkdownSearchText(content: string): string {
  const textOf = (node: SearchNode): string => {
    if (node.type === 'break') return ' ';
    if (node.type === 'html') return (node.value ?? '').replace(/<[^>]*>/g, '');
    if (node.children) {
      return node.children
        .map(textOf)
        .join(inlineContainers.has(node.type) ? '' : ' ');
    }
    return node.value ?? node.alt ?? '';
  };
  return textOf(processor.parse(content) as SearchNode)
    .replace(/\s+/g, ' ')
    .trim();
}

export function createSearchSnippet(text: string, query: string): string {
  const matchIndex = text.toLocaleLowerCase('ru').indexOf(query);
  const start = Math.max(0, matchIndex - 45);
  const end = Math.min(
    text.length,
    Math.max(start + 140, matchIndex + query.length),
  );
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end) +
    (end < text.length ? '…' : '')
  );
}
