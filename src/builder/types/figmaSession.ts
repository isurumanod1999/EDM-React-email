import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';

export interface FigmaSession {
  desktopUrl: string;
  mobileUrl?: string;
  designContext: string;
  desktopNode: ParsedFigmaNode;
  mobileNode?: ParsedFigmaNode;
  fileName: string;
  nodeName: string;
  fileKey: string;
  hint?: string;
  /** Chosen at fetch time: 'design' = structured, 'image' = flatten to one PNG. */
  buildAs?: 'design' | 'image';
  fetchedAt: number;
}

export interface FigmaImportApiResult {
  desktopUrl: string;
  mobileUrl?: string;
  designContext: string;
  desktopNode: ParsedFigmaNode;
  mobileNode?: ParsedFigmaNode;
  fileName: string;
  nodeName: string;
  fileKey: string;
}

export function toFigmaSession(
  data: FigmaImportApiResult,
  hint?: string
): FigmaSession {
  return {
    desktopUrl: data.desktopUrl,
    mobileUrl: data.mobileUrl,
    designContext: data.designContext,
    desktopNode: data.desktopNode,
    mobileNode: data.mobileNode,
    fileName: data.fileName,
    nodeName: data.nodeName,
    fileKey: data.fileKey,
    hint: hint?.trim() || undefined,
    fetchedAt: Date.now(),
  };
}
