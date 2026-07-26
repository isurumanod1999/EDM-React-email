import * as React from 'react';
import { Html, Body, Container, Preview } from '@react-email/components';
import { EmailResponsiveHead } from '@/components/email/EmailResponsiveHead';
import { buildFigmaResponsiveCss } from '@/components/email/FigmaReactEmailBlock';
import { EDM_CLASS } from '@/lib/email/responsive';
import type { EmailTemplateMeta, TemplateBlock } from '@/lib/schema/template';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { getComponentDefinition } from '@/lib/registry';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

export interface DynamicEmailTemplateProps {
  meta?: Partial<EmailTemplateMeta>;
  blocks: TemplateBlock[];
  /**
   * Editor-only: when true, Figma blocks render with per-node selection
   * attributes so the live preview is clickable. Never set for export.
   */
  editable?: boolean;
}

/** Import-only block whose AST supports in-preview node selection. */
const FIGMA_BLOCK_ID = 'figma-react-email';

export function DynamicEmailTemplate({
  meta,
  blocks,
  editable,
}: DynamicEmailTemplateProps): React.ReactElement {
  const resolvedMeta: EmailTemplateMeta = {
    ...DEFAULT_TEMPLATE_META,
    ...meta,
  };

  // Collect every Figma block's responsive CSS up front and hoist it into the
  // single document <head>. Emitting a <style> per block inside <body> is
  // unreliable — many email clients drop it — which broke mobile font scaling
  // AND column stacking. Namespacing by block.id keeps the rules collision-free.
  const figmaResponsiveCss = blocks
    .filter((b) => b.componentId === FIGMA_BLOCK_ID)
    .map((b) => buildFigmaResponsiveCss((b.props as { tree?: ReactEmailNode }).tree ?? ({} as ReactEmailNode), b.id))
    .filter((css) => css.trim().length > 0)
    .join('\n');

  return (
    <Html>
      <EmailResponsiveHead extraCss={figmaResponsiveCss || undefined} />
      <Preview>{resolvedMeta.previewText}</Preview>
      <Body
        style={{
          backgroundColor: resolvedMeta.backgroundColor,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: `${resolvedMeta.containerWidth}px`,
            margin: '0 auto',
          }}
        >
          {blocks.map((block) => {
            const definition = getComponentDefinition(block.componentId);

            if (!definition) {
              return (
                <table
                  key={block.id}
                  width={600}
                  cellPadding={0}
                  cellSpacing={0}
                  className={EDM_CLASS.wrapper}
                  style={{ width: '600px', backgroundColor: '#fee2e2' }}
                  role="presentation"
                >
                  <tr>
                    <td style={{ padding: '20px', color: '#991b1b', fontFamily: 'sans-serif' }}>
                      Unknown component: {block.componentId}
                    </td>
                  </tr>
                </table>
              );
            }

            const Component = definition.component;

            // Figma blocks always receive their blockId so responsive class
            // names are namespaced per block (preventing cross-block media-rule
            // collisions). The `editable` flag additionally turns on per-node
            // selection attributes for the live preview.
            if (block.componentId === FIGMA_BLOCK_ID) {
              return (
                <Component
                  key={block.id}
                  {...(block.props as object)}
                  editable={Boolean(editable)}
                  blockId={block.id}
                  emitResponsiveStyles={false}
                />
              );
            }

            const rendered = <Component {...(block.props as object)} />;

            // Built-in blocks aren't AST trees, so they're selectable at the
            // block level: a wrapper carries data-block-id so a click in the
            // preview opens this block's properties. Wrapper only in editor
            // preview — export markup is never wrapped.
            if (editable) {
              return (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  data-block-root="1"
                  className="__fc-block"
                >
                  {rendered}
                </div>
              );
            }

            return <React.Fragment key={block.id}>{rendered}</React.Fragment>;
          })}
        </Container>
      </Body>
    </Html>
  );
}

export default DynamicEmailTemplate;
