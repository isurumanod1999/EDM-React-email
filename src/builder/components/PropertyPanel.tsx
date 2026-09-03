'use client';

import { useMemo } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { FieldRenderer, getFieldValue } from './FieldRenderer';
import type { TemplateCategory } from '@/lib/schema/template';
import { parseFieldPath } from '@/lib/preview/selectionIdentity';
import { ChevronLeftIcon } from './icons';

const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'promotional', label: 'Promotional' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'product-showcase', label: 'Product Showcase' },
  { value: 'layout', label: 'Layout' },
];

export function PropertyPanel({ className }: { className?: string }) {
  const template = useBuilderStore((s) => s.template);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectedNodePath = useBuilderStore((s) => s.selectedNodePath);
  const registry = useBuilderStore((s) => s.registry);
  const showAdvanced = useBuilderStore((s) => s.showAdvanced);
  const updateBlockProp = useBuilderStore((s) => s.updateBlockProp);
  const updateMeta = useBuilderStore((s) => s.updateMeta);
  const updateTemplateInfo = useBuilderStore((s) => s.updateTemplateInfo);
  const selectBlock = useBuilderStore((s) => s.selectBlock);

  const selectedBlock = template?.blocks.find((b) => b.id === selectedBlockId);
  const selectedFieldKey = parseFieldPath(selectedNodePath);
  const componentDef = selectedBlock
    ? registry.find((c) => c.id === selectedBlock.componentId)
    : null;

  const groupedFields = useMemo(() => {
    if (!componentDef) return {};
    const fields = componentDef.fields.filter((f) => showAdvanced || !f.advanced);
    return fields.reduce<Record<string, typeof componentDef.fields>>((acc, field) => {
      const group = field.group ?? 'General';
      if (!acc[group]) acc[group] = [];
      acc[group].push(field);
      return acc;
    }, {});
  }, [componentDef, showAdvanced]);

  const panelClass = `builder-panel builder-panel--properties${className ? ` ${className}` : ''}`;

  if (!template) {
    return (
      <aside className={panelClass}>
        <div className="builder-panel-header">Properties</div>
        <div className="props-empty">Loading...</div>
      </aside>
    );
  }

  const panelTitle = selectedBlock
    ? selectedBlock.label || componentDef?.name || 'Block properties'
    : 'Template settings';

  return (
    <aside className={panelClass}>
      <div className="builder-panel-header property-panel-header">
        {selectedBlock ? (
          <button
            type="button"
            className="property-panel-back"
            onClick={() => selectBlock(null)}
            title="Back to template settings"
            aria-label="Back to template settings"
          >
            <ChevronLeftIcon />
          </button>
        ) : null}
        <span className="property-panel-title" title={panelTitle}>
          {panelTitle}
        </span>
        <span className="property-panel-context">
          {selectedBlock ? 'Block' : 'Email'}
        </span>
      </div>
      <div className="builder-panel-body">
        {/* Template settings when no block selected */}
        {!selectedBlock && (
          <>
            <div className="field-group">
              <div className="field-group-title">Template</div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea
                  className="field-textarea"
                  value={template.description ?? ''}
                  onChange={(e) => updateTemplateInfo({ description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="field">
                <label className="field-label">Category</label>
                <select
                  className="field-select"
                  value={template.category}
                  onChange={(e) =>
                    updateTemplateInfo({ category: e.target.value as TemplateCategory })
                  }
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-group">
              <div className="field-group-title">Email Meta</div>
              <div className="field">
                <label className="field-label">Preview Text</label>
                <input
                  className="field-input"
                  value={template.meta.previewText}
                  onChange={(e) => updateMeta({ previewText: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Background Color</label>
                <div className="field-color-row">
                  <input
                    type="color"
                    className="field-color"
                    value={template.meta.backgroundColor}
                    onChange={(e) => updateMeta({ backgroundColor: e.target.value })}
                    aria-label="Choose background color"
                  />
                  <input
                    className="field-input"
                    value={template.meta.backgroundColor}
                    onChange={(e) => updateMeta({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Email Width</label>
                <div className="field-input-suffix">
                  <input
                    type="number"
                    className="field-input"
                    min={320}
                    max={800}
                    step={10}
                    value={template.meta.containerWidth}
                    onChange={(e) =>
                      updateMeta({ containerWidth: Number(e.target.value) || 600 })
                    }
                  />
                  <span>px</span>
                </div>
                <p className="field-help">Recommended range: 600–700px.</p>
              </div>
            </div>
          </>
        )}

        {/* Block properties */}
        {selectedBlock && componentDef && (
          <>
            <div className="property-panel-summary">
              <span className="property-panel-summary-type">{componentDef.name}</span>
              <p>
                {componentDef.description}
              </p>
            </div>

            {Object.entries(groupedFields).map(([group, fields]) => (
              <div key={group} className="field-group">
                <div className="field-group-title">{group}</div>
                {fields.map((field) => (
                  <FieldRenderer
                    key={field.key}
                    field={field}
                    selected={selectedFieldKey === field.key}
                    value={getFieldValue(selectedBlock.props, field.key)}
                    onChange={(value) => updateBlockProp(selectedBlock.id, field.key, value)}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {selectedBlock && !componentDef && (
          <div className="props-empty">
            Unknown component: {selectedBlock.componentId}
          </div>
        )}
      </div>
    </aside>
  );
}
