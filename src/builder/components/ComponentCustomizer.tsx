'use client';

import { useMemo, useEffect } from 'react';
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
import { RichTextEditor } from './customizer/RichTextEditor';
import { hasRichFormatting } from '@/builder/lib/sanitizeHtml';
import { autoMobileStyle } from '@/components/email/mobileTypography';
import type { StyleTarget } from '@/builder/store/builderStore';

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
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const viewMode = useBuilderStore((s) => s.viewMode);
  const setViewMode = useBuilderStore((s) => s.setViewMode);

  const block = template?.blocks.find((b) => b.id === selectedBlockId);
  const isFigma = block?.componentId === FIGMA_BLOCK_ID;
  const tree = isFigma ? (block?.props?.tree as ReactEmailNode | undefined) : undefined;

  const layers = useMemo(() => {
    if (!tree) return [] as { node: ReactEmailNode; path: NodePath }[];
    const out: { node: ReactEmailNode; path: NodePath }[] = [];
    walkTree(tree, (node, path) => out.push({ node, path }));
    return out;
  }, [tree]);

  useEffect(() => {
    if (!isFigma || !block) return;
    document.querySelector('.fc-layer.active')?.scrollIntoView({ block: 'nearest' });
  }, [selectedNodePath, block?.id, isFigma]);

  if (!isFigma || !tree || !block) return null;

  const selectedNode =
    selectedNodePath != null ? getNodeAtPath(tree, parsePath(selectedNodePath)) : undefined;

  const isMobile = viewMode === 'mobile';
  // Style edits target the desktop `style` bag on Desktop, or the ≤600px
  // `mobileStyle` override on Mobile — so the two viewports are edited
  // independently. Button/container alignment stays shared (`containerStyle`).
  const styleTarget: StyleTarget = isMobile ? 'mobileStyle' : 'style';

  // The values shown in the controls: on Mobile we merge desktop → auto-scaled
  // typography → explicit mobile overrides, so the numbers match what actually
  // renders on a phone (and editing writes only the changed keys to mobileStyle).
  const styleView: CSSProperties = (() => {
    if (!selectedNode || !('style' in selectedNode)) return {};
    const base = (selectedNode.style as CSSProperties | undefined) ?? {};
    if (!isMobile) return base;
    const mob = (selectedNode as { mobileStyle?: CSSProperties }).mobileStyle ?? {};
    return { ...base, ...autoMobileStyle(base), ...mob };
  })();

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
              const isRoot = path.length === 0;
              return (
                <div key={key || 'root'} className={`fc-layer ${active ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="fc-layer-main"
                    style={{ paddingLeft: path.length * 14 }}
                    onClick={() => selectNode(block.id, key)}
                    title={summary}
                  >
                    <span className="fc-layer-type">{node.type}</span>
                    {summary && <span className="fc-layer-summary">{summary}</span>}
                  </button>
                  {!isRoot && (
                    <span className="fc-layer-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => duplicateNode(block.id, key)}
                        title="Duplicate element"
                        aria-label="Duplicate element"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => removeNode(block.id, key)}
                        title="Delete element"
                        aria-label="Delete element"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="fc-section fc-inspector">
          <div className="fc-section-title">
            {selectedNode ? `Edit ${selectedNode.type}` : 'Inspector'}
          </div>

          <div className="fc-viewport-toggle">
            <button
              type="button"
              className={`btn btn-secondary btn-sm btn-toggle ${!isMobile ? 'active' : ''}`}
              onClick={() => setViewMode('desktop')}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`btn btn-secondary btn-sm btn-toggle ${isMobile ? 'active' : ''}`}
              onClick={() => setViewMode('mobile')}
            >
              Mobile
            </button>
          </div>
          <p className="fc-hint" style={{ marginTop: 6 }}>
            {isMobile
              ? 'Editing the MOBILE view (≤600px). Styles here apply only on phones. You can also give text a separate mobile version below — leave it empty to reuse the desktop text.'
              : 'Editing DESKTOP styles. Switch to Mobile to override sizes, colors, spacing or content just for phones.'}
          </p>

          {selectedNode && selectedNodePath != null ? (
            <NodeInspector
              key={`${selectedNodePath}-${viewMode}`}
              node={selectedNode}
              styleView={styleView}
              isMobile={isMobile}
              onStyle={(patch, target) =>
                updateNodeStyle(
                  block.id,
                  selectedNodePath,
                  patch,
                  target === 'containerStyle' ? 'containerStyle' : styleTarget
                )
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
  /** Effective style values to display for the active viewport. */
  styleView: CSSProperties;
  /** True when the Mobile viewport is active (edits target mobileStyle). */
  isMobile: boolean;
  onStyle: (patch: CSSProperties, target?: 'style' | 'containerStyle') => void;
  onContent: (patch: Record<string, unknown>) => void;
}

function NodeInspector({ node, styleView, isMobile, onStyle, onContent }: InspectorProps) {
  const style: CSSProperties = styleView;

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
          {!isMobile && (
          <div className="field-group">
            <div className="field-group-title">Content</div>
            <RichTextEditor
              value={node.html ?? ''}
              plainFallback={node.content}
              allowBlocks={node.type !== 'Link'}
              placeholder={node.type === 'Link' ? 'Link text' : 'Type text…'}
              onChange={(html, plain) =>
                onContent(
                  hasRichFormatting(html)
                    ? { content: plain, html }
                    : { content: plain, html: undefined }
                )
              }
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
          )}
          {isMobile && (
          <div className="field-group">
            <div className="field-group-title">Mobile content</div>
            {/* Seed from any existing mobile override, else the desktop text — so
                the editor starts from what actually shows and the user just
                tweaks it. Writes mobile-only keys; desktop content is untouched. */}
            <RichTextEditor
              value={node.mobileHtml ?? node.html ?? ''}
              plainFallback={node.mobileContent ?? node.content}
              allowBlocks={node.type !== 'Link'}
              placeholder={node.type === 'Link' ? 'Mobile link text' : 'Mobile text…'}
              onChange={(html, plain) =>
                onContent(
                  hasRichFormatting(html)
                    ? { mobileContent: plain, mobileHtml: html }
                    : { mobileContent: plain, mobileHtml: undefined }
                )
              }
            />
            <p className="fc-hint" style={{ marginTop: 6 }}>
              This text shows only on phones (≤600px). Desktop keeps its own content.
              {node.type === 'Link' ? ' The link URL is shared with desktop.' : ''}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onContent({ mobileContent: undefined, mobileHtml: undefined })}
            >
              Clear mobile override (use desktop text)
            </button>
          </div>
          )}
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
          {!isMobile && (
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
          )}
          {isMobile && (
          <div className="field-group">
            <div className="field-group-title">Mobile content</div>
            {/* Seed from the mobile label if set, else the desktop label. */}
            <TextControl
              label="Label"
              value={node.mobileLabel ?? node.label}
              onChange={(v) => onContent({ mobileLabel: v || undefined })}
            />
            <p className="fc-hint" style={{ marginTop: 6 }}>
              Shown only on phones (≤600px). The link URL is shared with desktop.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onContent({ mobileLabel: undefined })}
            >
              Clear mobile override (use desktop label)
            </button>
          </div>
          )}
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
      if (isMobile) {
        return (
          <p className="fc-hint">
            Image source, size and link are shared across viewports. Switch to Desktop to edit
            them.
          </p>
        );
      }
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
