'use client';

import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentRegistryEntry } from '@/lib/registry/types';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import { formatCategoryLabel } from '@/builder/utils/props';
import { useBuilderStore } from '@/builder/store/builderStore';
import { pushToast } from '@/builder/store/toastStore';
import { CloseIcon } from './icons';

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
      aria-label={`Add ${entry.name} to the email`}
      onDoubleClick={() => addBlock(entry.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addBlock(entry.id);
        }
      }}
      title={entry.description ?? 'Drag into Structure, double-click, or press Enter to add'}
    >
      <span className="palette-item-name">{entry.name}</span>
      <span className="palette-item-desc">{entry.description}</span>
    </div>
  );
}

function SavedPaletteItem({ component }: { component: SavedComponentDocument }) {
  const addSavedComponent = useBuilderStore((state) => state.addSavedComponent);
  const deleteSavedComponent = useBuilderStore((state) => state.deleteSavedComponent);
  const dragId = `saved-${component.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: 'saved-component', savedComponentId: component.id },
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const handleDelete = async () => {
    if (!window.confirm(`Delete reusable component "${component.name}"?`)) return;
    const result = await deleteSavedComponent(component.id);
    if (!result.ok) {
      pushToast(result.error, 'error', 7000);
      return;
    }
    pushToast(`"${component.name}" deleted`, 'success');
  };

  return (
    <div className="saved-palette-row">
      <div
        ref={setNodeRef}
        style={style}
        className="palette-item saved-palette-item"
        {...listeners}
        {...attributes}
        tabIndex={0}
        role="button"
        aria-label={`Add reusable component ${component.name} to the email`}
        onDoubleClick={() => addSavedComponent(component.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addSavedComponent(component.id);
          }
        }}
        title={
          component.description ||
          'Drag into Structure, double-click, or press Enter to add'
        }
      >
        <span className="palette-item-name">{component.name}</span>
        <span className="palette-item-desc">
          {component.description || component.label || component.componentId}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-danger saved-palette-delete"
        onClick={handleDelete}
        title="Delete reusable component"
        aria-label={`Delete reusable component ${component.name}`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function ComponentPalette({ style }: { style?: React.CSSProperties }) {
  const paletteByCategory = useBuilderStore((s) => s.paletteByCategory);
  const savedComponents = useBuilderStore((s) => s.savedComponents);
  const savedComponentsLoading = useBuilderStore((s) => s.savedComponentsLoading);
  const savedComponentsError = useBuilderStore((s) => s.savedComponentsError);
  const [query, setQuery] = useState('');

  const search = query.trim().toLowerCase();

  const matchedSaved = useMemo(() => {
    if (!search) return savedComponents;
    return savedComponents.filter((component) =>
      `${component.name} ${component.description ?? ''} ${component.label ?? ''}`
        .toLowerCase()
        .includes(search)
    );
  }, [savedComponents, search]);

  const matchedCategories = useMemo(() => {
    return Object.keys(paletteByCategory)
      .sort()
      .map((category) => ({
        category,
        entries: search
          ? paletteByCategory[category].filter((entry) =>
              `${entry.name} ${entry.description ?? ''}`.toLowerCase().includes(search)
            )
          : paletteByCategory[category],
      }))
      .filter((group) => group.entries.length > 0);
  }, [paletteByCategory, search]);

  const registryLoading = Object.keys(paletteByCategory).length === 0;
  const noResults = Boolean(search) && matchedCategories.length === 0 && matchedSaved.length === 0;

  return (
    <section className="rail-section rail-section--components" style={style}>
      <div className="builder-panel-header">
        Components
        <input
          type="search"
          className="rail-search"
          placeholder="Search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search components"
        />
      </div>
      <div className="builder-panel-body">
        {noResults ? <div className="props-empty">No components match “{query.trim()}”.</div> : null}

        {matchedSaved.length > 0 || (!search && !savedComponentsLoading) ? (
          <div className="palette-category palette-category--reusable">
            <div className="palette-category-title">Reusable</div>
            {savedComponentsLoading ? (
              <div className="props-empty">Loading reusable components...</div>
            ) : matchedSaved.length === 0 ? (
              <div className="props-empty">No reusable components yet.</div>
            ) : (
              matchedSaved.map((component) => (
                <SavedPaletteItem key={component.id} component={component} />
              ))
            )}
            {savedComponentsError ? (
              <div className="palette-error" role="alert">
                {savedComponentsError}
              </div>
            ) : null}
          </div>
        ) : null}

        {registryLoading ? (
          <div className="props-empty">Loading components...</div>
        ) : (
          matchedCategories.map(({ category, entries }) => (
            <div key={category} className="palette-category">
              <div className="palette-category-title">{formatCategoryLabel(category)}</div>
              {entries.map((entry) => (
                <PaletteItem key={entry.id} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
