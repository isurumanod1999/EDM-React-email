/**
 * Append-only contract for operational/audit events (AD-9, NFR14/NFR15).
 *
 * Events are structured and timestamped and must never carry credentials,
 * session tokens, or email-template content — only the minimum needed for
 * accountability and troubleshooting.
 */

export interface AppEvent {
  /** Stable, kebab-case event type, e.g. 'template.saved', 'access.denied'. */
  type: string;
  /** Acting identity when known; absent while AUTH_MODE is open. */
  actor?: string;
  /** Optional id of the entity the event concerns. */
  targetId?: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Correlation id linking the event to a request/log entry. */
  correlationId?: string;
  /** Minimal, non-sensitive structured detail. */
  data?: Record<string, unknown>;
}

export interface EventLog {
  append(event: AppEvent): Promise<void>;
}
