'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useBuilderStore } from '@/builder/store/builderStore';
import { useAutoSave } from '@/builder/hooks/useAutoSave';
import { BuilderToolbar } from './BuilderToolbar';
import { ComponentPalette } from './ComponentPalette';
import { BlockCanvas } from './BlockCanvas';
import { PropertyPanel } from './PropertyPanel';
import { LivePreview } from './LivePreview';
import { ComponentCustomizer } from './ComponentCustomizer';
import '@/builder/builder.css';

interface BuilderEditorProps {
  templateId: string;
}

export function BuilderEditor({ templateId }: BuilderEditorProps) {
  const loadTemplate = useBuilderStore((s) => s.loadTemplate);
  const loadRegistry = useBuilderStore((s) => s.loadRegistry);
  const addBlock = useBuilderStore((s) => s.addBlock);
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks);
  const registry = useBuilderStore((s) => s.registry);
  const isLoading = useBuilderStore((s) => s.isLoading);
  const template = useBuilderStore((s) => s.template);

  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  useAutoSave(true, 45000);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    async function init() {
      try {
        await loadRegistry();
        await loadTemplate(templateId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }
    init();
  }, [templateId, loadRegistry, loadTemplate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const activeData = active.data.current;

    if (activeData?.type === 'palette') {
      const componentId = activeData.componentId as string;
      if (over.id === 'canvas-drop-zone') {
        addBlock(componentId);
      } else {
        const overData = over.data.current;
        if (overData?.type === 'block') {
          const template = useBuilderStore.getState().template;
          const overIndex = template?.blocks.findIndex((b) => b.id === over.id) ?? -1;
          addBlock(componentId, overIndex >= 0 ? overIndex : undefined);
        } else {
          addBlock(componentId);
        }
      }
      return;
    }

    if (activeData?.type === 'block' && active.id !== over.id) {
      reorderBlocks(String(active.id), String(over.id));
    }
  };

  const activePaletteEntry =
    activeDragId?.startsWith('palette-')
      ? registry.find((c) => `palette-${c.id}` === activeDragId)
      : null;

  if (error) {
    return (
      <div className="builder-root">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (isLoading || !template) {
    return (
      <div className="builder-root">
        <div className="loading-state">Loading template...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="builder-root">
        <BuilderToolbar />
        <div className="builder-body">
          <ComponentPalette />
          <main className="builder-center">
            <BlockCanvas />
            <LivePreview />
          </main>
          <PropertyPanel />
          <ComponentCustomizer />
        </div>
      </div>

      <DragOverlay>
        {activePaletteEntry ? (
          <div className="palette-item" style={{ width: 240, cursor: 'grabbing' }}>
            <span className="palette-item-name">{activePaletteEntry.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
