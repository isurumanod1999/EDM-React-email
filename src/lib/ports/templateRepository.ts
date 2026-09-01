import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';

/**
 * Persistence contract for email template documents (AD-2).
 *
 * Consumers depend on this interface, never on a concrete store. Adapters
 * (filesystem now; postgres later) implement it without changing callers.
 * Primitive operations only — create/update/duplicate semantics and
 * timestamp stamping belong to the application service that composes these.
 */
export interface TemplateRepository {
  /** Summaries for listing, newest first. Invalid stored records are skipped. */
  list(): Promise<TemplateSummary[]>;

  /** Full document by id, or null when it does not exist. */
  get(id: string): Promise<EmailTemplateDocument | null>;

  /** Insert or replace a validated document by its id; returns the stored form. */
  save(document: EmailTemplateDocument): Promise<EmailTemplateDocument>;

  /** Remove a document by id; resolves true when something was removed. */
  delete(id: string): Promise<boolean>;
}
