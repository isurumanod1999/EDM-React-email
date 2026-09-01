/**
 * Minimal structured logger (Story 1.8).
 *
 * Emits single-line JSON to stdout/stderr so logs are greppable and can be
 * shipped to a collector later without code changes. Never log secrets or full
 * request bodies (FR21). Bind a correlation id with `logger.child({ correlationId })`
 * so every line for a request can be traced end-to-end.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

function write(level: LogLevel, message: string, base: LogFields, fields?: LogFields): void {
  const line = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...base,
    ...fields,
  };

  const serialized = JSON.stringify(line);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

function createLogger(base: LogFields = {}): Logger {
  return {
    debug: (message, fields) => write('debug', message, base, fields),
    info: (message, fields) => write('info', message, base, fields),
    warn: (message, fields) => write('warn', message, base, fields),
    error: (message, fields) => write('error', message, base, fields),
    child: (bindings) => createLogger({ ...base, ...bindings }),
  };
}

export const logger: Logger = createLogger();
