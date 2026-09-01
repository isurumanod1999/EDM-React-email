/**
 * Contract for deferring long-running work off the request path (AD-7).
 *
 * Interface only this phase — export and Figma/AI import stay synchronous
 * until a runtime adapter is wired (Epic F3). Defining it now reserves the
 * seam so async work can be added without changing route signatures.
 */

export type JobStatusValue = 'queued' | 'running' | 'done' | 'error';

export interface JobSubmission {
  /** Stable job type the worker knows how to execute, e.g. 'email.export'. */
  type: string;
  payload: Record<string, unknown>;
}

export interface JobRecord {
  id: string;
  type: string;
  status: JobStatusValue;
  /** Present when status is 'done'. */
  result?: unknown;
  /** Safe, non-sensitive message when status is 'error'. */
  error?: string;
}

export interface JobQueue {
  /** Enqueue work and return its handle. */
  enqueue(job: JobSubmission): Promise<{ jobId: string }>;

  /** Current status/record for a job id, or null if unknown. */
  getStatus(jobId: string): Promise<JobRecord | null>;
}
