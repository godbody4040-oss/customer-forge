/**
 * Exhaustive pagination for reporting reads.
 *
 * Supabase/PostgREST caps every response, so a single `select` silently
 * truncates large result sets and a fixed `.limit(20000)` quietly reports
 * partial numbers. Reporting must be complete or fail loudly, so every read
 * here keeps requesting pages until the source is exhausted.
 */
export interface PageError {
  message: string;
  code?: string | null;
}

export interface PagedResult<T> {
  rows: T[];
  error: PageError | null;
  /** How many requests were needed — useful in tests and diagnostics. */
  pages: number;
}

export const PAGE_SIZE = 1000;

/**
 * Calls `page(from, to)` repeatedly (inclusive range, as PostgREST expects)
 * until a short page comes back. There is no arbitrary page ceiling: the loop
 * ends only when the data ends or a query fails.
 */
export async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) =>
    | PromiseLike<{ data: T[] | null; error: PageError | null }>
    | {
        data: T[] | null;
        error: PageError | null;
      },
  pageSize: number = PAGE_SIZE,
): Promise<PagedResult<T>> {
  const size = Math.max(1, Math.floor(pageSize));
  const rows: T[] = [];
  let index = 0;

  for (;;) {
    const { data, error } = await page(index * size, index * size + size - 1);
    index += 1;
    if (error) return { rows, error, pages: index };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) return { rows, error: null, pages: index };
  }
}
