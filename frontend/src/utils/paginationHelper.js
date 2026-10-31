/**
 * Brightloop Central Pagination Accumulator
 *
 * Provides a loop-safe, deduplicating utility to retrieve all pages of a paginated backend endpoint.
 * Eliminates artificial record caps (e.g., 1,000 records) while preventing runaway loops and memory exhaustion.
 */

/**
 * Iterates through all pages of a backend service method until all records are retrieved.
 *
 * @param {(params: { page: number, pageSize: number, [key: string]: any }) => Promise<{
 *   items: Array<any>,
 *   total: number,
 *   page: number,
 *   page_size: number,
 *   pages: number
 * }>} fetchPageFn Async service function accepting pagination parameters
 * @param {Object} [options={}]
 * @param {number} [options.pageSize=100] Number of records per page (up to backend le=100)
 * @param {number} [options.maxPages=500] Safety circuit breaker (defaults to 500 pages = up to 50,000 records)
 * @param {Object} [options.filterParams={}] Additional query parameters to pass to the service
 * @returns {Promise<{
 *   items: Array<any>,
 *   total: number,
 *   isComplete: boolean,
 *   pagesRetrieved: number
 * }>}
 */
export async function fetchAllPages(fetchPageFn, options = {}) {
  const { pageSize = 100, maxPages = 500, filterParams = {} } = options;
  const items = [];
  const seenIds = new Set();

  let currentPage = 1;
  let totalPages = 1;
  let serverTotal = 0;
  let isComplete = true;

  try {
    do {
      const response = await fetchPageFn({
        page: currentPage,
        pageSize,
        ...filterParams,
      });

      const pageItems = Array.isArray(response?.items) ? response.items : [];
      totalPages = Number(response?.pages) || 1;
      serverTotal = Number(response?.total) || pageItems.length;

      // If backend returns an empty page earlier than totalPages indicates, terminate
      if (pageItems.length === 0) {
        break;
      }

      // Deduplicate by ID to handle records that might have shifted across page boundaries
      for (const item of pageItems) {
        const uniqueKey = item?.id ? String(item.id) : `${currentPage}-${items.length}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          items.push(item);
        }
      }

      currentPage += 1;
    } while (currentPage <= totalPages && currentPage <= maxPages);

    if (totalPages > maxPages) {
      isComplete = false;
      console.warn(
        `[Brightloop Pagination] Dataset exceeded safety circuit breaker of ${maxPages} pages. Loaded ${items.length} records.`
      );
    }
  } catch (err) {
    console.error('[Brightloop Pagination] Network or server error during pagination iteration:', err);
    isComplete = false;
  }

  return {
    items,
    total: serverTotal || items.length,
    isComplete,
    pagesRetrieved: currentPage - 1,
  };
}
