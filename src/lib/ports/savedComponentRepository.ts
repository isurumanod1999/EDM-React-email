import type { SavedComponentDocument } from '@/lib/schema/savedComponent';

/** Persistence contract for shared reusable-component snapshots (AD-2). */
export interface SavedComponentRepository {
  list(): Promise<SavedComponentDocument[]>;
  get(id: string): Promise<SavedComponentDocument | null>;
  save(document: SavedComponentDocument): Promise<SavedComponentDocument>;
  delete(id: string): Promise<boolean>;
}
