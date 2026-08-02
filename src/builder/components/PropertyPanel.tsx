'use client';

import { useMemo } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { FieldRenderer, getFieldValue } from './FieldRenderer';
import type { TemplateCategory } from '@/lib/schema/template';

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
  const registry = useBuilderStore((s) => s.registry);
  const showAdvanced = useBuilderStore((s) => s.showAdvanced);
  const updateBlockProp = useBuilderStore((s) => s.updateBlockProp);
  const updateMeta = useBuilderStore((s) => s.updateMeta);
  const updateTemplateInfo = useBuilderStore((s) => s.updateTemplateInfo);

  const selectedBlock = template?.blocks.find((b) => b.id === selectedBlockId);
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

  return (
    <aside className={panelClass}>
      <div className="builder-panel-header">Properties</div>
      <div className="builder-panel-body">
        {/* Template settings when no block selected */}
        {!selectedBlock && (
          <>
            <div className="field-group">
              <div className="field-group-title">Template</div>
              <div className="field">
                <label className="field-label">Name</label>
                <input
                  className="field-input"
                  value={template.name}
                  onChange={(e) => updateTemplateInfo({ name: e.target.value })}
                />
              </div>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={template.meta.backgroundColor}
                    onChange={(e) => updateMeta({ backgroundColor: e.target.value })}
                    style={{ width: 40, height: 36 }}
                  />
                  <input
                    className="field-input"
                    value={template.meta.backgroundColor}
                    onChange={(e) => updateMeta({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="props-empty">
              Select a block to edit its properties
            </div>
          </>
        )}

        {/* Block properties */}
        {selectedBlock && componentDef && (
          <>
            <div className="field-group">
              <div className="field-group-title">{componentDef.name}</div>
              <p className="field-help" style={{ marginBottom: 12 }}>
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
