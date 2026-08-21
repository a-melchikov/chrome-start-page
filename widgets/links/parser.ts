import type {
  LinkValidationIssue,
  LinksInvalidLinkSegment,
  LinksParseResult,
  LinksRenderLine,
  LinksRenderSegment,
} from './parser-types';
import { normalizeLinkUrl } from './validation';

interface MarkdownLinkToken {
  start: number;
  end: number;
  label: string;
  source: string;
  sourceUrl: string;
}

function findUnescapedCharacter(
  source: string,
  character: string,
  start: number,
): number {
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }

    if (source[index] === character) {
      return index;
    }
  }

  return -1;
}

function findClosingParenthesis(source: string, start: number): number {
  let nestedDepth = 0;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];

    if (character === '\\') {
      index += 1;
      continue;
    }

    if (character === '(') {
      nestedDepth += 1;
      continue;
    }

    if (character === ')') {
      if (nestedDepth === 0) {
        return index;
      }

      nestedDepth -= 1;
    }
  }

  return -1;
}

function decodeMarkdownEscapes(value: string): string {
  return value.replace(/\\([\\[\]()])/g, '$1');
}

function findNextMarkdownLink(
  line: string,
  searchStart: number,
): MarkdownLinkToken | null {
  let linkStart = findUnescapedCharacter(line, '[', searchStart);

  while (linkStart !== -1) {
    const labelEnd = findUnescapedCharacter(line, ']', linkStart + 1);
    const destinationStart = labelEnd + 2;

    if (labelEnd !== -1 && line[labelEnd + 1] === '(') {
      const linkEnd = findClosingParenthesis(line, destinationStart);

      if (linkEnd !== -1) {
        return {
          start: linkStart,
          end: linkEnd + 1,
          label: decodeMarkdownEscapes(line.slice(linkStart + 1, labelEnd)),
          source: line.slice(linkStart, linkEnd + 1),
          sourceUrl: decodeMarkdownEscapes(
            line.slice(destinationStart, linkEnd),
          ).trim(),
        };
      }
    }

    linkStart = findUnescapedCharacter(line, '[', linkStart + 1);
  }

  return null;
}

function createInvalidLinkSegment(
  token: MarkdownLinkToken,
): LinksInvalidLinkSegment {
  return {
    type: 'invalid-link',
    label: token.label,
    source: token.source,
    sourceUrl: token.sourceUrl,
  };
}

function parseLine(
  source: string,
  lineNumber: number,
  issues: LinkValidationIssue[],
): LinksRenderLine {
  const segments: LinksRenderSegment[] = [];
  let textStart = 0;
  let searchStart = 0;
  let token = findNextMarkdownLink(source, searchStart);

  while (token) {
    if (token.start > textStart) {
      segments.push({
        type: 'text',
        text: source.slice(textStart, token.start),
      });
    }

    const normalizedUrl = normalizeLinkUrl(token.sourceUrl);

    if (normalizedUrl.valid) {
      segments.push({
        type: 'link',
        label: token.label,
        href: normalizedUrl.href,
        sourceUrl: token.sourceUrl,
      });
    } else {
      segments.push(createInvalidLinkSegment(token));
      issues.push({
        code: 'invalid-link-url',
        reason: normalizedUrl.reason,
        line: lineNumber,
        column: token.start + 1,
        label: token.label,
        sourceUrl: token.sourceUrl,
        message: normalizedUrl.message,
      });
    }

    textStart = token.end;
    searchStart = token.end;
    token = findNextMarkdownLink(source, searchStart);
  }

  if (textStart < source.length) {
    segments.push({ type: 'text', text: source.slice(textStart) });
  }

  return { lineNumber, segments };
}

export function parseLinksContent(content: string): LinksParseResult {
  const issues: LinkValidationIssue[] = [];
  const sourceLines = content ? content.split(/\r\n|\n|\r/) : [];
  const lines = sourceLines.map((line, index) =>
    parseLine(line, index + 1, issues),
  );

  return {
    model: { lines },
    validation: {
      isValid: issues.length === 0,
      issues,
    },
  };
}
