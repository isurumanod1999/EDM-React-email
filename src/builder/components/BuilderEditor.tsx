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
import { useSaveFeedbackToasts } from '@/builder/hooks/useSaveFeedbackToasts';
import { useUnsavedChangesGuard } from '@/builder/hooks/useUnsavedChangesGuard';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderToastContainer } from './BuilderToastContainer';
import { BuilderMobileNav, type MobileDrawer } from './BuilderMobileNav';
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
  const loadSavedComponents = useBuilderStore((s) => s.loadSavedComponents);
  const addBlock = useBuilderStore((s) => s.addBlock);
  const addSavedComponent = useBuilderStore((s) => s.addSavedComponent);
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks);
  const registry = useBuilderStore((s) => s.registry);
  const savedComponents = useBuilderStore((s) => s.savedComponents);
  const isLoading = useBuilderStore((s) => s.isLoading);
  const template = useBuilderStore((s) => s.template);

  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [mobileDrawer, setMobileDrawer] = useState<MobileDrawer>(null);

  useAutoSave(true, 45000);
  useSaveFeedbackToasts();
  useUnsavedChangesGuard(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadRegistry(), loadSavedComponents()]);
        await loadTemplate(templateId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }
    init();
  }, [templateId, loadRegistry, loadSavedComponents, loadTemplate]);

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

    if (activeData?.type === 'saved-component') {
      const savedComponentId = activeData.savedComponentId as string;
      if (over.id === 'canvas-drop-zone') {
        addSavedComponent(savedComponentId);
      } else {
        const overData = over.data.current;
        if (overData?.type === 'block') {
          const template = useBuilderStore.getState().template;
          const overIndex = template?.blocks.findIndex((block) => block.id === over.id) ?? -1;
          addSavedComponent(savedComponentId, overIndex >= 0 ? overIndex : undefined);
        } else {
          addSavedComponent(savedComponentId);
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
  const activeSavedComponent =
    activeDragId?.startsWith('saved-')
      ? savedComponents.find((component) => `saved-${component.id}` === activeDragId)
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
        <div
          className={`builder-body${mobileDrawer ? ' builder-body--drawer-open' : ''}`}
        >
          {mobileDrawer ? (
            <button
              type="button"
              className="builder-mobile-backdrop"
              aria-label="Close panel"
              onClick={() => setMobileDrawer(null)}
            />
          ) : null}
          <ComponentPalette
            className={
              mobileDrawer === 'components' ? 'builder-panel--mobile-open' : undefined
            }
          />
          <main className="builder-center">
            <BlockCanvas />
            <LivePreview />
          </main>
          <PropertyPanel
            className={
              mobileDrawer === 'properties' ? 'builder-panel--mobile-open' : undefined
            }
          />
          <ComponentCustomizer />
        </div>
        <BuilderMobileNav activeDrawer={mobileDrawer} onSelect={setMobileDrawer} />
        <BuilderToastContainer />
      </div>

      <DragOverlay>
        {activePaletteEntry ? (
          <div className="palette-item" style={{ width: 240, cursor: 'grabbing' }}>
            <span className="palette-item-name">{activePaletteEntry.name}</span>
          </div>
        ) : activeSavedComponent ? (
          <div className="palette-item" style={{ width: 240, cursor: 'grabbing' }}>
            <span className="palette-item-name">{activeSavedComponent.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
