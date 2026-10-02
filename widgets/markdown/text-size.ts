import type { Plugin } from 'unified';

// Type definition for text directive nodes created by remark-directive
interface DirectiveNode {
  type: string;
  name: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
  children?: unknown[];
}

export const remarkTextSizeDirectivePlugin: Plugin<[]> = () => {
  return (tree: unknown) => {
    function visit(node: unknown) {
      if (!node || typeof node !== 'object') return;
      const n = node as DirectiveNode;

      if (
        n.type === 'textDirective' &&
        (n.name === 'large' || n.name === 'xlarge')
      ) {
        const data = n.data || (n.data = {});
        data.hName = 'span';
        data.hProperties = {
          ...(data.hProperties || {}),
          'data-size': n.name,
        };
      }

      if (Array.isArray(n.children)) {
        for (const child of n.children) {
          visit(child);
        }
      }
    }

    visit(tree);
  };
};

export type TextSizeOption = 'normal' | 'large' | 'xlarge';

export interface TextSizeCheckResult {
  allowed: boolean;
  reason?: string;
}

export function canApplyTextSize(
  text: string,
  start: number,
  end: number,
): TextSizeCheckResult {
  if (start >= end) {
    return {
      allowed: false,
      reason: 'Сначала выделите слово или фразу в редакторе',
    };
  }

  const selectedText = text.slice(start, end);

  if (selectedText.includes('\n')) {
    return {
      allowed: false,
      reason: 'Действие доступно только для однострочного фрагмента',
    };
  }

  // Check if inside a code block (``` ... ```)
  const textBefore = text.slice(0, start);
  const textAfter = text.slice(end);
  const tripleTicksBefore = (textBefore.match(/```/g) || []).length;
  if (tripleTicksBefore % 2 !== 0) {
    return {
      allowed: false,
      reason: 'Недоступно внутри блока кода',
    };
  }

  // Check if selection contains inline code backtick or is inside backticks in the same line
  const lineStart = textBefore.lastIndexOf('\n') + 1;
  const lineEndRel = textAfter.indexOf('\n');
  const lineEnd = lineEndRel === -1 ? text.length : end + lineEndRel;
  const currentLine = text.slice(lineStart, lineEnd);
  const relStart = start - lineStart;

  const lineBeforeSel = currentLine.slice(0, relStart);
  const backticksInLineBefore = (lineBeforeSel.match(/`/g) || []).length;
  if (backticksInLineBefore % 2 !== 0 || selectedText.includes('`')) {
    return {
      allowed: false,
      reason: 'Недоступно для фрагментов с кодом',
    };
  }

  // Check if inside markdown link: [text](url)
  // Check if there is an unclosed `[` before and `](url)` after
  const lastOpenBracket = lineBeforeSel.lastIndexOf('[');
  const lastCloseBracket = lineBeforeSel.lastIndexOf(']');
  if (lastOpenBracket > lastCloseBracket) {
    // Inside link text
    return {
      allowed: false,
      reason: 'Недоступно внутри ссылок',
    };
  }

  return { allowed: true };
}

export function applyTextSize(
  text: string,
  start: number,
  end: number,
  size: TextSizeOption,
): { newText: string; newStart: number; newEnd: number } {
  let selected = text.slice(start, end);
  let effectiveStart = start;
  let effectiveEnd = end;

  // Check if the selection itself is wrapped in :large[...] or :xlarge[...]
  const innerDirectiveMatch = /^:(large|xlarge)\[([\s\S]*)\]$/.exec(selected);
  if (innerDirectiveMatch) {
    selected = innerDirectiveMatch[2] ?? '';
  } else {
    // Check if selection is immediately preceded by :large[ or :xlarge[ and followed by ]
    const prefixMatch = text.slice(0, start).match(/:(large|xlarge)\[$/);
    if (prefixMatch && text.slice(end, end + 1) === ']') {
      effectiveStart = start - prefixMatch[0].length;
      effectiveEnd = end + 1;
    }
  }

  if (size === 'normal') {
    const newText =
      text.slice(0, effectiveStart) + selected + text.slice(effectiveEnd);
    return {
      newText,
      newStart: effectiveStart,
      newEnd: effectiveStart + selected.length,
    };
  }

  const wrapped = `:${size}[${selected}]`;
  const newText =
    text.slice(0, effectiveStart) + wrapped + text.slice(effectiveEnd);
  return {
    newText,
    newStart: effectiveStart,
    newEnd: effectiveStart + wrapped.length,
  };
}
