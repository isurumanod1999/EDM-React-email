import { render } from '@/lib/email/react-email';
import { figmaToReactEmailTree } from '@/lib/figma/figmaToReactEmail';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { generateId } from '@/lib/utils/id';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';

function countNodes(node: ReactEmailNode): number {
  let count = 1;
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

export interface BuildReactEmailWithAiInput {
  desktopUrl: string;
  mobileUrl?: string;
  desktopNode: ParsedFigmaNode;
  mobileNode?: ParsedFigmaNode;
  nodeName: string;
  fileName?: string;
  figmaContext?: string;
  hint?: string;
}

export interface BuildReactEmailWithAiOutput {
  confidence: number;
  blocks: {
    componentId: string;
    props: Record<string, unknown>;
    label?: string;
  }[];
  reasoning: string;
  previewHtml?: string;
  warnings?: string[];
  nodeCount?: number;
  buildMethod: 'primitives';
}

export async function buildReactEmailWithAi(
  input: BuildReactEmailWithAiInput
): Promise<BuildReactEmailWithAiOutput> {
  const { tree, warnings, nodeCount } = figmaToReactEmailTree(
    input.desktopNode,
    input.mobileNode,
    {
      desktopUrl: input.desktopUrl,
      mobileUrl: input.mobileUrl,
      mode: 'primitives',
    }
  );

  const block = {
    componentId: 'figma-react-email',
    props: {
      tree,
      sourceFrame: input.nodeName,
      mobileFrame: input.mobileNode?.name ?? '',
    },
    label: input.nodeName,
  };

  const templateBlock = {
    id: generateId(),
    componentId: block.componentId,
    componentVersion: 1,
    props: block.props,
    label: block.label,
  };

  const previewHtml = await render(
    DynamicEmailTemplate({
      meta: DEFAULT_TEMPLATE_META,
      blocks: [templateBlock],
    })
  );

  return {
    confidence: 1,
    blocks: [block],
    reasoning: `Built React Email components from Figma "${input.nodeName}" — Heading, Text, and Button with design styles (${nodeCount} nodes).`,
    warnings,
    nodeCount,
    buildMethod: 'primitives',
    previewHtml,
  };
}
