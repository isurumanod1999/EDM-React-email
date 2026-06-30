'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import {
  getNodeAtPath,
  parsePath,
  pathToString,
  walkTree,
  nodeSummary,
  type NodePath,
} from '@/builder/lib/treeEdit';
import {
  TextControl,
  TextAreaControl,
  ColorControl,
  NumberControl,
  SelectControl,
  SpacingControl,
  readSpacing,
  spacingPatch,
  pxToNumber,
  toPx,
  type BoxSides,
} from './customizer/controls';

const FIGMA_BLOCK_ID = 'figma-react-email';

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
const WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
];
const TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
];
const HEADING_OPTIONS = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
];

export function ComponentCustomizer() {
  const template = useBuilderStore((s) => s.template);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectedNodePath = useBuilderStore((s) => s.selectedNodePath);
  const selectNode = useBuilderStore((s) => s.selectNode);
  const selectBlock = useBuilderStore((s) => s.selectBlock);
  const updateNodeStyle = useBuilderStore((s) => s.updateNodeStyle);
  const updateNodeContent = useBuilderStore((s) => s.updateNodeContent);

  const block = template?.blocks.find((b) => b.id === selectedBlockId);
  const isFigma = block?.componentId === FIGMA_BLOCK_ID;
  const tree = isFigma ? (block?.props?.tree as ReactEmailNode | undefined) : undefined;

  const layers = useMemo(() => {
    if (!tree) return [] as { node: ReactEmailNode; path: NodePath }[];
    const out: { node: ReactEmailNode; path: NodePath }[] = [];
    walkTree(tree, (node, path) => out.push({ node, path }));
    return out;
  }, [tree]);

  if (!isFigma || !tree || !block) return null;

  const selectedNode =
    selectedNodePath != null ? getNodeAtPath(tree, parsePath(selectedNodePath)) : undefined;

  return (
    <aside className="fc-drawer">
      <div className="fc-drawer-header">
        <div>
          <div className="fc-drawer-title">Customize component</div>
          <div className="fc-drawer-sub">{block.label ?? 'Figma import'}</div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => selectBlock(null)}
          aria-label="Close customizer"
        >
          ✕
        </button>
      </div>

      <div className="fc-drawer-body">
        <div className="fc-section">
          <div className="fc-section-title">Layers</div>
          <div className="fc-layers">
            {layers.map(({ node, path }) => {
              const key = pathToString(path);
              const active = key === selectedNodePath;
              const summary = nodeSummary(node);
              return (
                <button
                  key={key || 'root'}
                  type="button"
                  className={`fc-layer ${active ? 'active' : ''}`}
                  style={{ paddingLeft: 8 + path.length * 14 }}
                  onClick={() => selectNode(block.id, key)}
                  title={summary}
                >
                  <span className="fc-layer-type">{node.type}</span>
                  {summary && <span className="fc-layer-summary">{summary}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fc-section fc-inspector">
          <div className="fc-section-title">
            {selectedNode ? `Edit ${selectedNode.type}` : 'Inspector'}
          </div>
          {selectedNode && selectedNodePath != null ? (
            <NodeInspector
              node={selectedNode}
              onStyle={(patch, target) =>
                updateNodeStyle(block.id, selectedNodePath, patch, target)
              }
              onContent={(patch) => updateNodeContent(block.id, selectedNodePath, patch)}
            />
          ) : (
            <p className="fc-hint">
              Select an element in the preview or the layers list to edit its text, colors,
              spacing and more.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

interface InspectorProps {
  node: ReactEmailNode;
  onStyle: (patch: CSSProperties, target?: 'style' | 'containerStyle') => void;
  onContent: (patch: Record<string, unknown>) => void;
}

function NodeInspector({ node, onStyle, onContent }: InspectorProps) {
  const style: CSSProperties = ('style' in node ? node.style : undefined) ?? {};

  const TypographyControls = (
    <div className="field-group">
      <div className="field-group-title">Typography</div>
      <NumberControl
        label="Font size"
        value={pxToNumber(style.fontSize)}
        onChange={(n) => onStyle({ fontSize: toPx(n) })}
      />
      <SelectControl
        label="Font weight"
        value={style.fontWeight !== undefined ? String(style.fontWeight) : undefined}
        options={WEIGHT_OPTIONS}
        onChange={(v) => onStyle({ fontWeight: v ? Number(v) : undefined })}
      />
      <NumberControl
        label="Line height"
        value={pxToNumber(style.lineHeight)}
        onChange={(n) => onStyle({ lineHeight: toPx(n) })}
      />
      <TextControl
        label="Letter spacing"
        value={style.letterSpacing != null ? String(style.letterSpacing) : ''}
        placeholder="e.g. 0.5px"
        onChange={(v) => onStyle({ letterSpacing: v || undefined })}
      />
      <SelectControl
        label="Text align"
        value={style.textAlign as string | undefined}
        options={ALIGN_OPTIONS}
        onChange={(v) => onStyle({ textAlign: v as CSSProperties['textAlign'] })}
      />
      <SelectControl
        label="Text transform"
        value={style.textTransform as string | undefined}
        options={TRANSFORM_OPTIONS}
        onChange={(v) => onStyle({ textTransform: v as CSSProperties['textTransform'] })}
      />
    </div>
  );

  const ColorControls = (showBg = true) => (
    <div className="field-group">
      <div className="field-group-title">Colors</div>
      <ColorControl
        label="Text color"
        value={style.color as string | undefined}
        onChange={(v) => onStyle({ color: v })}
      />
      {showBg && (
        <ColorControl
          label="Background"
          value={style.backgroundColor as string | undefined}
          onChange={(v) => onStyle({ backgroundColor: v })}
        />
      )}
    </div>
  );

  const PaddingControl = (
    <div className="field-group">
      <div className="field-group-title">Spacing</div>
      <SpacingControl
        label="Padding"
        sides={readSpacing(style, 'padding')}
        onChange={(sides: BoxSides) => onStyle(spacingPatch('padding', sides) as CSSProperties)}
      />
    </div>
  );

  switch (node.type) {
    case 'Text':
    case 'Heading':
    case 'Link': {
      return (
        <>
          <div className="field-group">
            <div className="field-group-title">Content</div>
            <TextAreaControl
              label={node.type === 'Link' ? 'Link text' : 'Text'}
              value={node.content}
              onChange={(v) => onContent({ content: v })}
            />
            {node.type === 'Heading' && (
              <SelectControl
                label="Heading level"
                value={node.as ?? 'h2'}
                options={HEADING_OPTIONS}
                onChange={(v) => onContent({ as: v ?? 'h2' })}
              />
            )}
            {node.type === 'Link' && (
              <TextControl
                label="URL"
                value={node.href}
                placeholder="https://"
                onChange={(v) => onContent({ href: v })}
              />
            )}
            {(node.type === 'Text' || node.type === 'Heading') && (
              <TextControl
                label="Link URL (optional)"
                value={node.href ?? ''}
                placeholder="https:// — makes the text clickable"
                onChange={(v) => onContent({ href: v || undefined })}
              />
            )}
          </div>
          {TypographyControls}
          {ColorControls(true)}
          {PaddingControl}
        </>
      );
    }

    case 'Button': {
      const containerStyle: CSSProperties = node.containerStyle ?? {};
      return (
        <>
          <div className="field-group">
            <div className="field-group-title">Content</div>
            <TextControl label="Label" value={node.label} onChange={(v) => onContent({ label: v })} />
            <TextControl
              label="URL"
              value={node.href}
              placeholder="https://"
              onChange={(v) => onContent({ href: v })}
            />
          </div>
          <div className="field-group">
            <div className="field-group-title">Colors</div>
            <ColorControl
              label="Background"
              value={style.backgroundColor as string | undefined}
              onChange={(v) => onStyle({ backgroundColor: v })}
            />
            <ColorControl
              label="Text color"
              value={style.color as string | undefined}
              onChange={(v) => onStyle({ color: v })}
            />
          </div>
          {TypographyControls}
          <div className="field-group">
            <div className="field-group-title">Box</div>
            <TextControl
              label="Width"
              value={style.width != null ? String(style.width) : ''}
              placeholder="e.g. 290px / 100% / auto"
              onChange={(v) => onStyle({ width: v || undefined })}
            />
            <NumberControl
              label="Corner radius"
              value={pxToNumber(style.borderRadius)}
              onChange={(n) => onStyle({ borderRadius: n })}
            />
            <SelectControl
              label="Align (in row)"
              value={containerStyle.textAlign as string | undefined}
              options={ALIGN_OPTIONS}
              onChange={(v) =>
                onStyle({ textAlign: v as CSSProperties['textAlign'] }, 'containerStyle')
              }
            />
          </div>
          {PaddingControl}
        </>
      );
    }

    case 'Img': {
      return (
        <div className="field-group">
          <div className="field-group-title">Image</div>
          <TextControl label="Source URL" value={node.src} onChange={(v) => onContent({ src: v })} />
          <TextControl
            label="Alt text"
            value={node.alt ?? ''}
            onChange={(v) => onContent({ alt: v })}
          />
          <TextControl
            label="Link URL (optional)"
            value={node.href ?? ''}
            placeholder="https:// — makes the image clickable"
            onChange={(v) => onContent({ href: v || undefined })}
          />
          <NumberControl
            label="Width"
            value={node.width}
            onChange={(n) => onContent({ width: n })}
          />
          <SelectControl
            label="Align"
            value={node.align}
            options={ALIGN_OPTIONS}
            onChange={(v) => onContent({ align: v })}
          />
        </div>
      );
    }

    case 'Spacer': {
      return (
        <div className="field-group">
          <div className="field-group-title">Spacer</div>
          <NumberControl
            label="Height"
            value={node.height}
            min={0}
            onChange={(n) => onContent({ height: n ?? 0 })}
          />
        </div>
      );
    }

    case 'Hr': {
      return (
        <div className="field-group">
          <div className="field-group-title">Divider</div>
          <ColorControl
            label="Color"
            value={style.borderColor as string | undefined}
            onChange={(v) => onStyle({ borderColor: v })}
          />
          <NumberControl
            label="Thickness"
            value={pxToNumber(style.borderTopWidth ?? style.borderWidth)}
            min={0}
            onChange={(n) => onStyle({ borderTopWidth: toPx(n), borderWidth: undefined })}
          />
        </div>
      );
    }

    case 'Section':
    case 'Container':
    case 'Row':
    case 'Column':
    default: {
      return (
        <>
          <div className="field-group">
            <div className="field-group-title">Colors</div>
            <ColorControl
              label="Background"
              value={style.backgroundColor as string | undefined}
              onChange={(v) => onStyle({ backgroundColor: v })}
            />
          </div>
          <div className="field-group">
            <div className="field-group-title">Box</div>
            <NumberControl
              label="Corner radius"
              value={pxToNumber(style.borderRadius)}
              onChange={(n) => onStyle({ borderRadius: n })}
            />
            <SelectControl
              label="Align content"
              value={style.textAlign as string | undefined}
              options={ALIGN_OPTIONS}
              onChange={(v) => onStyle({ textAlign: v as CSSProperties['textAlign'] })}
            />
          </div>
          {PaddingControl}
        </>
      );
    }
  }
}
