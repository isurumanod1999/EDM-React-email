export type CodeSpan = {
  from: number;
  to: number;
  line: number;
  lineEnd: number;
};

export function computeSpan(source: string, from: number, to: number): CodeSpan {
  const line = source.slice(0, from).split('\n').length;
  const lineEnd = source.slice(0, to).split('\n').length;
  return { from, to, line, lineEnd };
}

export interface PrintBuffer {
  length(): number;
  append(text: string): void;
  toString(): string;
}

export function createPrintBuffer(): PrintBuffer {
  const parts: string[] = [];
  let len = 0;
  return {
    length: () => len,
    append(text: string) {
      parts.push(text);
      len += text.length;
    },
    toString: () => parts.join(''),
  };
}
