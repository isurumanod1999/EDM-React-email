import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { renderTemplateRequestSchema } from '@/lib/schema/validators';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { getTemplate } from '@/lib/templates/fileStorage';

export const dynamic = 'force-dynamic';

/**
 * Editor-only highlight CSS + a click/hover bridge that maps `data-node-path`
 * elements to selection messages for the builder. Injected ONLY when the
 * request is flagged `editable`; the export path never sees this, so shipped
 * email markup stays clean.
 */
const EDITABLE_STYLE = `
<style id="__fc-style">
  [data-node-path], [data-block-root] { cursor: pointer; }
  .__fc-hover { outline: 1px dashed #818cf8 !important; outline-offset: -1px; }
  .__fc-selected { outline: 2px solid #4f46e5 !important; outline-offset: -2px; }
</style>`;

const EDITABLE_SCRIPT = `
<script id="__fc-bridge">
(function () {
  function clearClass(cls) {
    var nodes = document.querySelectorAll('.' + cls);
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove(cls);
  }
  function findNode(blockId, path) {
    var sel = '[data-node-path="' + (path || '') + '"]';
    if (blockId) sel = '[data-block-id="' + blockId + '"]' + sel;
    return document.querySelector(sel);
  }
  function findBlockRoot(blockId) {
    if (!blockId) return null;
    return document.querySelector('[data-block-id="' + blockId + '"][data-block-root]');
  }
  function applySelection(blockId, path) {
    clearClass('__fc-selected');
    if (path == null) {
      // Block-level selection (built-in components).
      var root = findBlockRoot(blockId);
      if (root) root.classList.add('__fc-selected');
      return;
    }
    var el = findNode(blockId, path);
    if (el) el.classList.add('__fc-selected');
  }
  function emitSelect(blockId, path) {
    applySelection(blockId, path);
    parent.postMessage({ source: 'figma-customizer', type: 'select', blockId: blockId, nodePath: path }, '*');
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    // A specific AST node wins over the surrounding block wrapper.
    var nodeEl = e.target.closest('[data-node-path]');
    if (nodeEl) {
      e.preventDefault();
      e.stopPropagation();
      emitSelect(nodeEl.getAttribute('data-block-id'), nodeEl.getAttribute('data-node-path'));
      return;
    }
    var blockEl = e.target.closest('[data-block-id]');
    if (blockEl) {
      e.preventDefault();
      e.stopPropagation();
      emitSelect(blockEl.getAttribute('data-block-id'), null);
    }
  }, true);
  document.addEventListener('mouseover', function (e) {
    clearClass('__fc-hover');
    if (!e.target.closest) return;
    var el = e.target.closest('[data-node-path]') || e.target.closest('[data-block-id]');
    if (el) el.classList.add('__fc-hover');
  });
  document.addEventListener('mouseleave', function () { clearClass('__fc-hover'); }, true);
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.source === 'figma-customizer-parent' && d.type === 'highlight') {
      applySelection(d.blockId, d.nodePath == null ? null : d.nodePath);
    }
  });
  parent.postMessage({ source: 'figma-customizer', type: 'ready' }, '*');
})();
</script>`;

function injectEditableBridge(html: string): string {
  let out = html;
  out = out.includes('</head>')
    ? out.replace('</head>', `${EDITABLE_STYLE}</head>`)
    : `${EDITABLE_STYLE}${out}`;
  out = out.includes('</body>')
    ? out.replace('</body>', `${EDITABLE_SCRIPT}</body>`)
    : `${out}${EDITABLE_SCRIPT}`;
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support rendering by saved template id
    if (body.templateId && typeof body.templateId === 'string') {
      const template = await getTemplate(body.templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const html = await render(
        DynamicEmailTemplate({
          meta: template.meta,
          blocks: template.blocks,
        })
      );

      return NextResponse.json({ html, templateId: template.id });
    }

    const parsed = renderTemplateRequestSchema.parse(body);

    const rendered = await render(
      DynamicEmailTemplate({
        meta: parsed.meta ?? DEFAULT_TEMPLATE_META,
        blocks: parsed.blocks,
        editable: parsed.editable,
      })
    );

    const html = parsed.editable ? injectEditableBridge(rendered) : rendered;

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Error rendering dynamic email:', error);
    const message = error instanceof Error ? error.message : 'Failed to render email';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
