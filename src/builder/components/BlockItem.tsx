'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TemplateBlock } from '@/lib/schema/template';
import { useBuilderStore } from '@/builder/store/builderStore';
import { SaveReusableComponentModal } from './SaveReusableComponentModal';
import { CloseIcon, DragHandleIcon, DuplicateIcon, PlusIcon } from './icons';

interface BlockItemProps {
  block: TemplateBlock;
  componentName: string;
}

export function BlockItem({ block, componentName }: BlockItemProps) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectBlock = useBuilderStore((s) => s.selectBlock);
  const removeBlock = useBuilderStore((s) => s.removeBlock);
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: 'block', blockId: block.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedBlockId === block.id;
  const label = block.label ?? componentName;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => selectBlock(block.id)}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${label}, ${componentName}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectBlock(block.id);
        }
      }}
    >
      <span
        className="block-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
      >
        <DragHandleIcon />
      </span>
      <div className="block-info">
        <div className="block-name">{label}</div>
        <div className="block-type">{componentName}</div>
      </div>
      <div className="block-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            setSaveModalOpen(true);
          }}
          title="Add to components"
          aria-label={`Add ${label} to reusable components`}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(block.id);
          }}
          title="Duplicate"
          aria-label={`Duplicate ${label}`}
        >
          <DuplicateIcon />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            if (!window.confirm(`Remove "${label}" from the canvas?`)) return;
            removeBlock(block.id);
          }}
          title="Remove"
          aria-label={`Remove ${label}`}
        >
          <CloseIcon />
        </button>
      </div>
      <SaveReusableComponentModal
        block={block}
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />
    </div>
  );
}
