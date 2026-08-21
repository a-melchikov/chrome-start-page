export interface LinksRenderModel {
  lines: LinksRenderLine[];
}

export interface LinksRenderLine {
  lineNumber: number;
  segments: LinksRenderSegment[];
}

export type LinksRenderSegment =
  LinksTextSegment | LinksLinkSegment | LinksInvalidLinkSegment;

export interface LinksTextSegment {
  type: 'text';
  text: string;
}

export interface LinksLinkSegment {
  type: 'link';
  label: string;
  href: string;
  sourceUrl: string;
}

export interface LinksInvalidLinkSegment {
  type: 'invalid-link';
  label: string;
  source: string;
  sourceUrl: string;
}

export type LinkUrlValidationReason =
  'empty-url' | 'ambiguous-url' | 'invalid-url' | 'unsupported-protocol';

export interface LinkValidationIssue {
  code: 'invalid-link-url';
  reason: LinkUrlValidationReason;
  line: number;
  column: number;
  label: string;
  sourceUrl: string;
  message: string;
}

export interface LinksValidationResult {
  isValid: boolean;
  issues: LinkValidationIssue[];
}

export interface LinksParseResult {
  model: LinksRenderModel;
  validation: LinksValidationResult;
}
