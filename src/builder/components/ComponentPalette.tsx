'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentRegistryEntry } from '@/lib/registry/types';
import { formatCategoryLabel } from '@/builder/utils/props';
import { useBuilderStore } from '@/builder/store/builderStore';

function PaletteItem({ entry }: { entry: ComponentRegistryEntry }) {
  const addBlock = useBuilderStore((s) => s.addBlock);
  const dragId = `palette-${entry.id}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: 'palette', componentId: entry.id },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="palette-item"
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`Add ${entry.name} to canvas`}
      onDoubleClick={() => addBlock(entry.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addBlock(entry.id);
        }
      }}
      title="Drag to canvas, double-click, or press Enter to add"
    >
      <span className="palette-item-name">{entry.name}</span>
      <span className="palette-item-desc">{entry.description}</span>
    </div>
  );
}

export function ComponentPalette({ className }: { className?: string }) {
  const paletteByCategory = useBuilderStore((s) => s.paletteByCategory);

  const categories = Object.keys(paletteByCategory).sort();

  return (
    <aside className={`builder-panel builder-panel--palette${className ? ` ${className}` : ''}`}>
      <div className="builder-panel-header">Components</div>
      <div className="builder-panel-body">
        {categories.length === 0 ? (
          <div className="props-empty">Loading components...</div>
        ) : (
          categories.map((category) => (
            <div key={category} className="palette-category">
              <div className="palette-category-title">{formatCategoryLabel(category)}</div>
              {paletteByCategory[category].map((entry) => (
                <PaletteItem key={entry.id} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
