import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

type NodePath = number[];

type ContainerNode = Extract<
  ReactEmailNode,
  { type: 'Section' | 'Container' | 'Row' | 'Column' }
>;

function isContainer(node: ReactEmailNode): node is ContainerNode {
  return (
    node.type === 'Section' ||
    node.type === 'Container' ||
    node.type === 'Row' ||
    node.type === 'Column'
  );
}

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
  return { ...tree, children: nextChildren } as ReactEmailNode;
}
