export class CodeViewParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line = 1, column = 1) {
    super(message);
    this.name = 'CodeViewParseError';
    this.line = line;
    this.column = column;
  }
}

type LocNode = { loc?: { start: { line: number; column: number } } | null };

export function fail(message: string, node?: LocNode | null): never {
  const line = node?.loc?.start.line ?? 1;
  const column = (node?.loc?.start.column ?? 0) + 1;
  throw new CodeViewParseError(message, line, column);
}
