'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBuilderStore } from '@/builder/store/builderStore';
import { BlockItem } from './BlockItem';

export function BlockCanvas() {
  const template = useBuilderStore((s) => s.template);
  const registry = useBuilderStore((s) => s.registry);

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
    data: { type: 'canvas' },
  });

  const blocks = template?.blocks ?? [];
  const blockIds = blocks.map((b) => b.id);

  const getComponentName = (componentId: string) =>
    registry.find((c) => c.id === componentId)?.name ?? componentId;

  return (
    <div className="builder-canvas-section">
      <div className="builder-panel-header">
        Canvas ({blocks.length} block{blocks.length !== 1 ? 's' : ''})
      </div>
      <div
        ref={setNodeRef}
        className="builder-panel-body builder-canvas-drop"
        aria-label="Email block canvas. Drag components here or use Enter on palette items to add blocks."
        style={{
          outline: isOver ? '2px dashed var(--accent)' : undefined,
          outlineOffset: -2,
        }}
      >
        {blocks.length === 0 ? (
          <div className="canvas-empty">
            Drag components from the palette or double-click to add blocks
          </div>
        ) : (
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="canvas-list">
              {blocks.map((block) => (
                <BlockItem
                  key={block.id}
                  block={block}
                  componentName={getComponentName(block.componentId)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
