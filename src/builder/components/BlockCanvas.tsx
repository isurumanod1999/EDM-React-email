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
    <section className="builder-canvas-section">
      <div className="builder-panel-header">
        Structure
        <span className="rail-count">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`builder-panel-body builder-canvas-drop${isOver ? ' is-drop-target' : ''}`}
        aria-label="Email block structure. Drag components here or use Enter on palette items to add blocks."
      >
        {blocks.length === 0 ? (
          <div className="canvas-empty">
            Drag components from the palette, or double-click one to add it
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
    </section>
  );
}
