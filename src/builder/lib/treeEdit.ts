import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

/**
 * Helpers for addressing and editing nodes inside a `figma-react-email` block's
 * ReactEmailNode tree.
 *
 * Nodes are addressed by an INDEX PATH (array of child indices from the root),
 * serialised as a dotted string (e.g. `"0.2.1"`). The empty path `[]` (`""`)
 * refers to the root node. This needs no schema change and stays valid for
 * already-saved templates. Structural edits (duplicate/remove) rewrite the
 * children arrays immutably, so paths of later siblings shift accordingly —
 * callers should use the `newPath` returned by `duplicateNodeAtPath`.
 */

export type NodePath = number[];

/** Node variants that hold children. */
type ContainerNode = Extract<
  ReactEmailNode,
  {
    type:
      | 'Section'
      | 'Container'
      | 'Row'
      | 'Column'
      | 'Html'
      | 'Body'
      | 'Head'
      | 'Tailwind';
  }
>;

function isContainer(node: ReactEmailNode): node is ContainerNode {
  return (
    node.type === 'Section' ||
    node.type === 'Container' ||
    node.type === 'Row' ||
    node.type === 'Column' ||
    node.type === 'Html' ||
    node.type === 'Body' ||
    node.type === 'Head' ||
    node.type === 'Tailwind'
  );
}

/** Children array for a node, or null when the node cannot have children. */
export function nodeChildren(node: ReactEmailNode): ReactEmailNode[] | null {
  return isContainer(node) ? node.children : null;
}

export function pathToString(path: NodePath): string {
  return path.join('.');
}

export function parsePath(path: string): NodePath {
  if (!path) return [];
  return path
    .split('.')
    .map((p) => Number(p))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

/** Resolve the node at `path`, or undefined if the path is invalid. */
export function getNodeAtPath(
  tree: ReactEmailNode,
  path: NodePath
): ReactEmailNode | undefined {
  let current: ReactEmailNode | undefined = tree;
  for (const idx of path) {
    if (!current) return undefined;
    const children = nodeChildren(current);
    if (!children || idx < 0 || idx >= children.length) return undefined;
    current = children[idx];
  }
  return current;
}

/**
 * Return a NEW tree with the node at `path` replaced by `updater(node)`.
 * Immutable: untouched branches keep their identity. Invalid paths return the
 * original tree unchanged.
 */
export function updateNodeAtPath(
  tree: ReactEmailNode,
  path: NodePath,
  updater: (node: ReactEmailNode) => ReactEmailNode
): ReactEmailNode {
  if (path.length === 0) return updater(tree);

  const children = nodeChildren(tree);
  if (!children) return tree;

  const [head, ...rest] = path;
  if (head < 0 || head >= children.length) return tree;

  const nextChildren = children.map((child, i) =>
    i === head ? updateNodeAtPath(child, rest, updater) : child
  );

  return { ...(tree as ContainerNode), children: nextChildren };
}

/** Deep, structural clone of a node subtree (plain data — no functions). */
export function cloneNode(node: ReactEmailNode): ReactEmailNode {
  return structuredClone(node);
}

/**
 * Insert a deep copy of the node at `path` immediately after it (as a sibling).
 * The root (`[]`) has no parent and can't be duplicated — the tree is returned
 * unchanged with the original path. Returns the new tree plus the path of the
 * inserted copy so the caller can keep it selected.
 */
export function duplicateNodeAtPath(
  tree: ReactEmailNode,
  path: NodePath
): { tree: ReactEmailNode; newPath: NodePath } {
  if (path.length === 0) return { tree, newPath: path };

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  let insertedAt = index;

  const nextTree = updateNodeAtPath(tree, parentPath, (parent) => {
    const children = nodeChildren(parent);
    if (!children || index < 0 || index >= children.length) return parent;
    const copy = cloneNode(children[index]);
    insertedAt = index + 1;
    const nextChildren = [
      ...children.slice(0, index + 1),
      copy,
      ...children.slice(index + 1),
    ];
    return { ...(parent as ContainerNode), children: nextChildren };
  });

  return { tree: nextTree, newPath: [...parentPath, insertedAt] };
}

/**
 * Remove the node at `path`. The root (`[]`) can't be removed — the tree is
 * returned unchanged.
 */
export function removeNodeAtPath(tree: ReactEmailNode, path: NodePath): ReactEmailNode {
  if (path.length === 0) return tree;

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];

  return updateNodeAtPath(tree, parentPath, (parent) => {
    const children = nodeChildren(parent);
    if (!children || index < 0 || index >= children.length) return parent;
    return { ...(parent as ContainerNode), children: children.filter((_, i) => i !== index) };
  });
}

/** Depth-first walk, invoking `cb` with each node and its index path. */
export function walkTree(
  tree: ReactEmailNode,
  cb: (node: ReactEmailNode, path: NodePath) => void,
  path: NodePath = []
): void {
  cb(tree, path);
  const children = nodeChildren(tree);
  if (children) {
    children.forEach((child, i) => walkTree(child, cb, [...path, i]));
  }
}

/** Short, human-friendly label for a node row in the layers tree. */
export function nodeSummary(node: ReactEmailNode): string {
  switch (node.type) {
    case 'Text':
    case 'Heading':
    case 'Link':
      return truncate(node.content);
    case 'Button':
      return truncate(node.label);
    case 'Img':
      return truncate(node.alt || node.src.split('/').pop() || 'image');
    case 'Spacer':
      return `${node.height}px`;
    case 'Preview':
      return truncate(node.content);
    case 'CodeInline':
      return truncate(node.content);
    case 'Markdown':
      return truncate(node.content);
    case 'CodeBlock':
      return truncate(node.code.split('\n')[0] ?? 'code');
    case 'Font':
      return node.fontFamily;
    default:
      return '';
  }
}

function truncate(text: string, max = 32): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
