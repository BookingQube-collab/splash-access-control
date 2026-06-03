/** Max registrations per server-action chunk (stays under ~60s on Vercel). */
export const BQ_BULK_SYNC_CHUNK_SIZE = 40;

/** Upper bound for chunk `limit` in server-action input validation. */
export const BQ_BULK_SYNC_CHUNK_MAX = 50;

export type BookingQubeBulkSyncChunkResult = {
  synced: number;
  skipped: number;
  failed: number;
  rateLimited: number;
  processed: number;
  offset: number;
  total: number;
  hasMore: boolean;
  errors: { registrationId: string; error: string }[];
};

export type BookingQubeBulkSyncChunkError = { error: string };
