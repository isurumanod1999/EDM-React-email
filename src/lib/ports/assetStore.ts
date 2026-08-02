/**
 * Storage contract for uploaded/imported binary assets (AD-2).
 *
 * Adapters (local uploads now; s3-compatible later) implement this without
 * changing callers. Binary payloads use Uint8Array to keep the contract free
 * of Node- or SDK-specific types.
 */

export interface AssetInput {
  data: Uint8Array;
  contentType: string;
  /** Optional original filename; adapters assign their own storage key. */
  filename?: string;
}

export interface StoredAsset {
  /** Opaque storage key the adapter can resolve back to the object. */
  key: string;
  /** URL usable to reference the asset from rendered/exported email. */
  url: string;
  contentType: string;
  byteSize: number;
}

export interface AssetStore {
  /** Persist an asset and return its key and referenceable URL. */
  put(input: AssetInput): Promise<StoredAsset>;

  /** Resolve the referenceable URL for a previously stored key. */
  getUrl(key: string): string;

  /** Remove a stored asset by key; resolves true when something was removed. */
  delete(key: string): Promise<boolean>;
}
