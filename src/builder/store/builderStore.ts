import { create } from 'zustand';
import type { CSSProperties } from 'react';
import type { EmailTemplateDocument, EmailTemplateMeta, TemplateBlock } from '@/lib/schema/template';
import type { ComponentRegistryEntry } from '@/lib/registry/types';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import { createBlockFromSavedComponent } from '@/lib/saved-components/placement';
import { generateId } from '@/lib/utils/id';
import { setNestedValue } from '@/builder/utils/props';
import {
  updateNodeAtPath,
  duplicateNodeAtPath,
  removeNodeAtPath,
  parsePath,
  pathToString,
} from '@/builder/lib/treeEdit';
import type { FigmaSession } from '@/builder/types/figmaSession';

/** Which CSSProperties bag on a node an edit targets. */
export type StyleTarget = 'style' | 'containerStyle' | 'mobileStyle';
export type SavedComponentActionResult = { ok: true } | { ok: false; error: string };

interface BuilderState {
  template: EmailTemplateDocument | null;
  registry: ComponentRegistryEntry[];
  registryByCategory: Record<string, ComponentRegistryEntry[]>;
  paletteByCategory: Record<string, ComponentRegistryEntry[]>;
  savedComponents: SavedComponentDocument[];
  savedComponentsLoading: boolean;
  savedComponentsError: string | null;
  selectedBlockId: string | null;
  selectedNodePath: string | null;
  figmaSession: FigmaSession | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  showAdvanced: boolean;
  viewMode: 'desktop' | 'mobile';
  saveError: string | null;
  saveMessage: string | null;
  /** Survives toolbar remounts / fast refresh while a Figma build is in progress. */
  figmaBuildModalOpen: boolean;

  setTemplate: (template: EmailTemplateDocument) => void;
  setFigmaSession: (session: FigmaSession | null) => void;
  clearFigmaSession: () => void;
  updateFigmaHint: (hint: string) => void;
  loadRegistry: () => Promise<void>;
  loadSavedComponents: () => Promise<void>;
  loadTemplate: (id: string) => Promise<void>;
  selectBlock: (id: string | null) => void;
  selectNode: (blockId: string, nodePath: string | null) => void;
  updateNodeStyle: (
    blockId: string,
    nodePath: string,
    patch: CSSProperties,
    target?: StyleTarget
  ) => void;
  updateNodeContent: (
    blockId: string,
    nodePath: string,
    patch: Record<string, unknown>
  ) => void;
  duplicateNode: (blockId: string, nodePath: string) => void;
  removeNode: (blockId: string, nodePath: string) => void;
  addBlock: (componentId: string, index?: number) => void;
  addSavedComponent: (savedComponentId: string, index?: number) => void;
  saveBlockAsReusable: (
    blockId: string,
    metadata: { name: string; description?: string }
  ) => Promise<SavedComponentActionResult>;
  deleteSavedComponent: (id: string) => Promise<SavedComponentActionResult>;
  addBlocksFromAi: (blocks: { componentId: string; props: Record<string, unknown>; label?: string }[]) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  /** Replace the full blocks array (code-view apply). Preserves meta/id. */
  replaceBlocks: (blocks: TemplateBlock[]) => void;
  updateBlockProp: (blockId: string, key: string, value: unknown) => void;
  updateMeta: (meta: Partial<EmailTemplateMeta>) => void;
  updateTemplateInfo: (
    info: Partial<Pick<EmailTemplateDocument, 'name' | 'description' | 'category'>>
  ) => void;
  setShowAdvanced: (show: boolean) => void;
  setViewMode: (mode: 'desktop' | 'mobile') => void;
  setFigmaBuildModalOpen: (open: boolean) => void;
  save: (options?: { auto?: boolean }) => Promise<boolean>;
  resetDirty: () => void;
}

function markDirty(
  state: Pick<BuilderState, 'template'>,
  patch: Partial<EmailTemplateDocument>
): Partial<BuilderState> {
  if (!state.template) return {};
  return {
    template: { ...state.template, ...patch },
    isDirty: true,
    saveMessage: null,
    saveError: null,
  };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  template: null,
  registry: [],
  registryByCategory: {},
  paletteByCategory: {},
  savedComponents: [],
  savedComponentsLoading: false,
  savedComponentsError: null,
  selectedBlockId: null,
  selectedNodePath: null,
  figmaSession: null,
  isDirty: false,
  isSaving: false,
  isLoading: false,
  showAdvanced: false,
  viewMode: 'desktop',
  saveError: null,
  saveMessage: null,
  figmaBuildModalOpen: false,

  setTemplate: (template) =>
    set({
      template,
      isDirty: false,
      selectedBlockId: null,
      selectedNodePath: null,
      saveError: null,
      saveMessage: null,
    }),

  setFigmaSession: (session) => set({ figmaSession: session }),

  clearFigmaSession: () => set({ figmaSession: null }),

  updateFigmaHint: (hint) => {
    const { figmaSession } = get();
    if (!figmaSession) return;
    set({
      figmaSession: {
        ...figmaSession,
        hint: hint.trim() || undefined,
      },
    });
  },

  loadRegistry: async () => {
    const res = await fetch('/api/registry');
    if (!res.ok) throw new Error('Failed to load component registry');
    const data = await res.json();
    set({
      registry: data.components,
      registryByCategory: data.byCategory,
      paletteByCategory: data.paletteByCategory ?? data.byCategory,
    });
  },

  loadSavedComponents: async () => {
    set({ savedComponentsLoading: true, savedComponentsError: null });
    try {
      const res = await fetch('/api/saved-components');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to load reusable components'
        );
      }
      set({ savedComponents: data.components ?? [], savedComponentsLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load reusable components';
      set({ savedComponentsLoading: false, savedComponentsError: message });
    }
  },

  loadTemplate: async (id: string) => {
    set({ isLoading: true, saveError: null });
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error('Template not found');
      const data = await res.json();
      set({
        template: data.template,
        isDirty: false,
        isLoading: false,
        selectedBlockId: null,
        selectedNodePath: null,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  selectBlock: (id) =>
    set((state) => ({
      selectedBlockId: id,
      // Switching blocks clears any node selection from the previous block.
      selectedNodePath: id === state.selectedBlockId ? state.selectedNodePath : null,
    })),

  selectNode: (blockId, nodePath) =>
    set({ selectedBlockId: blockId, selectedNodePath: nodePath }),

  updateNodeStyle: (blockId, nodePath, patch, target = 'style') => {
    const { template } = get();
    if (!template) return;

    const block = template.blocks.find((b) => b.id === blockId);
    const tree = block?.props?.tree as ReactEmailNode | undefined;
    if (!tree) return;

    const nextTree = updateNodeAtPath(tree, parsePath(nodePath), (node) => {
      const current = ((node as Record<string, unknown>)[target] as CSSProperties | undefined) ?? {};
      const merged: Record<string, unknown> = { ...current };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') delete merged[key];
        else merged[key] = value;
      }
      return { ...node, [target]: merged } as ReactEmailNode;
    });

    get().updateBlockProp(blockId, 'tree', nextTree);
  },

  updateNodeContent: (blockId, nodePath, patch) => {
    const { template } = get();
    if (!template) return;

    const block = template.blocks.find((b) => b.id === blockId);
    const tree = block?.props?.tree as ReactEmailNode | undefined;
    if (!tree) return;

    const nextTree = updateNodeAtPath(tree, parsePath(nodePath), (node) => {
      const next: Record<string, unknown> = { ...node };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete next[key];
        else next[key] = value;
      }
      return next as ReactEmailNode;
    });

    get().updateBlockProp(blockId, 'tree', nextTree);
  },

  duplicateNode: (blockId, nodePath) => {
    const { template } = get();
    if (!template) return;

    const block = template.blocks.find((b) => b.id === blockId);
    const tree = block?.props?.tree as ReactEmailNode | undefined;
    if (!tree) return;

    const { tree: nextTree, newPath } = duplicateNodeAtPath(tree, parsePath(nodePath));
    if (nextTree === tree) return; // root or invalid path — nothing to duplicate

    get().updateBlockProp(blockId, 'tree', nextTree);
    set({ selectedBlockId: blockId, selectedNodePath: pathToString(newPath) });
  },

  removeNode: (blockId, nodePath) => {
    const { template } = get();
    if (!template) return;

    const block = template.blocks.find((b) => b.id === blockId);
    const tree = block?.props?.tree as ReactEmailNode | undefined;
    if (!tree) return;

    const nextTree = removeNodeAtPath(tree, parsePath(nodePath));
    if (nextTree === tree) return; // root or invalid path — nothing to remove

    get().updateBlockProp(blockId, 'tree', nextTree);
    set({ selectedNodePath: null });
  },

  addBlock: (componentId, index) => {
    const { registry, template } = get();
    if (!template) return;

    const entry = registry.find((c) => c.id === componentId);
    if (!entry) return;

    const block: TemplateBlock = {
      id: generateId(),
      componentId: entry.id,
      componentVersion: entry.version,
      props: structuredClone(entry.defaultProps),
      label: entry.name,
    };

    const blocks = [...template.blocks];
    const insertAt = index ?? blocks.length;
    blocks.splice(insertAt, 0, block);

    set({
      ...markDirty(get(), { blocks }),
      selectedBlockId: block.id,
    });
  },

  addSavedComponent: (savedComponentId, index) => {
    const { savedComponents, template } = get();
    if (!template) return;
    const saved = savedComponents.find((component) => component.id === savedComponentId);
    if (!saved) return;

    const block = createBlockFromSavedComponent(saved);
    const blocks = [...template.blocks];
    const insertAt = index ?? blocks.length;
    blocks.splice(insertAt, 0, block);
    set({
      ...markDirty(get(), { blocks }),
      selectedBlockId: block.id,
      selectedNodePath: null,
    });
  },

  saveBlockAsReusable: async (blockId, metadata) => {
    const { template, registry } = get();
    const block = template?.blocks.find((candidate) => candidate.id === blockId);
    if (!block) return { ok: false, error: 'Canvas component not found' };
    const entry = registry.find((candidate) => candidate.id === block.componentId);

    try {
      const res = await fetch('/api/saved-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metadata.name,
          description: metadata.description || undefined,
          category: entry?.category ?? 'layout',
          componentId: block.componentId,
          componentVersion: block.componentVersion,
          props: structuredClone(block.props),
          label: block.label,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to save reusable component'
        );
      }
      set((state) => ({
        savedComponents: [data.component, ...state.savedComponents],
        savedComponentsError: null,
      }));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to save reusable component',
      };
    }
  },

  deleteSavedComponent: async (id) => {
    const { template } = get();
    if (template?.blocks.some((block) => block.sourceSavedComponentId === id)) {
      return {
        ok: false,
        error: `Remove this reusable component from "${template.name}" and save the template first.`,
      };
    }

    try {
      const res = await fetch(`/api/saved-components/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to delete reusable component'
        );
      }
      set((state) => ({
        savedComponents: state.savedComponents.filter((component) => component.id !== id),
        savedComponentsError: null,
      }));
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete reusable component';
      set({ savedComponentsError: message });
      return { ok: false, error: message };
    }
  },

  addBlocksFromAi: (aiBlocks) => {
    const { registry, template } = get();
    if (!template || aiBlocks.length === 0) return;

    const newBlocks: TemplateBlock[] = [];

    for (const aiBlock of aiBlocks) {
      const entry = registry.find((c) => c.id === aiBlock.componentId);
      if (!entry) continue;

      newBlocks.push({
        id: generateId(),
        componentId: entry.id,
        componentVersion: entry.version,
        props: {
          ...structuredClone(entry.defaultProps),
          ...aiBlock.props,
        },
        label: aiBlock.label ?? entry.name,
      });
    }

    if (newBlocks.length === 0) return;

    const blocks = [...template.blocks, ...newBlocks];

    set({
      ...markDirty(get(), { blocks }),
      selectedBlockId: newBlocks[0].id,
    });
  },

  removeBlock: (id) => {
    const { template, selectedBlockId } = get();
    if (!template) return;

    const blocks = template.blocks.filter((b) => b.id !== id);
    set({
      ...markDirty(get(), { blocks }),
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
      selectedNodePath: selectedBlockId === id ? null : get().selectedNodePath,
    });
  },

  duplicateBlock: (id) => {
    const { template } = get();
    if (!template) return;

    const index = template.blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const source = template.blocks[index];
    const copy: TemplateBlock = {
      ...structuredClone(source),
      id: generateId(),
      label: `${source.label ?? source.componentId} (Copy)`,
    };

    const blocks = [...template.blocks];
    blocks.splice(index + 1, 0, copy);

    set({
      ...markDirty(get(), { blocks }),
      selectedBlockId: copy.id,
    });
  },

  reorderBlocks: (activeId, overId) => {
    const { template } = get();
    if (!template || activeId === overId) return;

    const oldIndex = template.blocks.findIndex((b) => b.id === activeId);
    const newIndex = template.blocks.findIndex((b) => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const blocks = [...template.blocks];
    const [moved] = blocks.splice(oldIndex, 1);
    blocks.splice(newIndex, 0, moved);

    set(markDirty(get(), { blocks }));
  },

  replaceBlocks: (blocks) => {
    const { template } = get();
    if (!template) return;
    set(markDirty(get(), { blocks }));
  },

  updateBlockProp: (blockId, key, value) => {
    const { template } = get();
    if (!template) return;

    const blocks = template.blocks.map((block) => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        props: setNestedValue(block.props, key, value),
      };
    });

    set(markDirty(get(), { blocks }));
  },

  updateMeta: (meta) => {
    const { template } = get();
    if (!template) return;
    set(markDirty(get(), { meta: { ...template.meta, ...meta } }));
  },

  updateTemplateInfo: (info) => {
    set(markDirty(get(), info));
  },

  setShowAdvanced: (show) => set({ showAdvanced: show }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFigmaBuildModalOpen: (open) => set({ figmaBuildModalOpen: open }),
  resetDirty: () => set({ isDirty: false }),

  save: async (options) => {
    const { template } = get();
    if (!template) return false;

    set({ isSaving: true, saveError: null, saveMessage: null });

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }

      const data = await res.json();
      set({
        template: data.template,
        isDirty: false,
        isSaving: false,
        saveMessage: options?.auto ? 'Auto-saved' : 'Saved successfully',
      });
      return true;
    } catch (error) {
      set({
        isSaving: false,
        saveError: error instanceof Error ? error.message : 'Save failed',
      });
      return false;
    }
  },
}));
