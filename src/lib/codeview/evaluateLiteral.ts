import { fail } from '@/lib/codeview/parseError';

type AnyNode = {
  type: string;
  value?: unknown;
  raw?: string;
  operator?: string;
  argument?: AnyNode;
  prefix?: boolean;
  elements?: Array<AnyNode | null>;
  properties?: Array<{
    type: string;
    key: AnyNode;
    value: AnyNode;
    kind?: string;
    method?: boolean;
    shorthand?: boolean;
    computed?: boolean;
  }>;
  name?: string;
  loc?: { start: { line: number; column: number } } | null;
};

/**
 * Evaluate an expression node to a JSON-compatible literal.
 * Rejects identifiers, calls, spreads, templates with expressions, etc. (AD-24).
 */
export function evaluateLiteral(node: AnyNode | null | undefined): unknown {
  if (!node) fail('Expected a literal expression');

  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'UnaryExpression': {
      if (!node.prefix || (node.operator !== '-' && node.operator !== '+')) {
        fail(`Unsupported unary operator "${node.operator}"`, node);
      }
      const arg = evaluateLiteral(node.argument);
      if (typeof arg !== 'number') fail('Unary +/- requires a number literal', node);
      return node.operator === '-' ? -arg : +arg;
    }
    case 'ArrayExpression': {
      return (node.elements ?? []).map((el, i) => {
        if (el == null) fail(`Sparse arrays are not allowed (index ${i})`, node);
        if (el.type === 'SpreadElement') fail('Spread syntax is not allowed', el);
        return evaluateLiteral(el);
      });
    }
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {};
      for (const prop of node.properties ?? []) {
        if (prop.type !== 'Property') fail('Object spread / methods are not allowed', prop as AnyNode);
        if (prop.kind !== 'init' || prop.method || prop.shorthand) {
          fail('Only plain object properties are allowed', prop as AnyNode);
        }
        if (prop.computed) fail('Computed property keys are not allowed', prop as AnyNode);
        let key: string;
        if (prop.key.type === 'Identifier') key = prop.key.name!;
        else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
          key = prop.key.value;
        } else {
          fail('Object keys must be identifiers or string literals', prop.key);
        }
        out[key] = evaluateLiteral(prop.value);
      }
      return out;
    }
    case 'TemplateLiteral':
      fail('Template literals are not allowed — use a string literal', node);
    case 'Identifier':
      fail(
        `Identifier "${node.name}" is not allowed — use literal values only (no variables)`,
        node
      );
    case 'CallExpression':
      fail('Function calls are not allowed', node);
    case 'MemberExpression':
      fail('Member expressions are not allowed', node);
    case 'ConditionalExpression':
      fail('Ternary expressions are not allowed', node);
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      fail('Functions are not allowed', node);
    default:
      fail(`Unsupported expression type "${node.type}"`, node);
  }
}
