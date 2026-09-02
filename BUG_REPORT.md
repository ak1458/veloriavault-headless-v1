# Bug Report: Missing Products in WooCommerce Integration

## Issue Description
Users have reported that certain products, specifically "Freya Slim" and potentially others, are missing from the e-commerce storefront. These products exist in the WooCommerce backend but fail to appear on the Next.js frontend, causing a discrepancy that has persisted.

## Root Cause Analysis
After analyzing the codebase, particularly `src/lib/woocommerce.ts`, the root cause of the issue is **unhandled API pagination limits**.

The WooCommerce REST API enforces a strict maximum limit of `100` items per request (`per_page: 100`). The current integration uses this hard limit when fetching products, categories, and variations. However, the codebase **does not implement any pagination logic** to fetch items beyond the first page.

### Affected Code Areas in `src/lib/woocommerce.ts`:
1. **`wcFetch`**: The core fetch utility simply returns the JSON response of the first request. It completely ignores the `x-wp-totalpages` and `x-wp-total` HTTP headers provided by WooCommerce, which indicate if more pages exist.
2. **`getProducts`**: Only accepts a single `page` parameter (defaulting to 1).
3. **`getVariationProducts` & `getParentProducts`**: Hardcodes `per_page: 100`. If the store has 101 or more variable products, product #101 (e.g., "Freya Slim") will never be fetched.
4. **`getCategories`**: Similarly hardcodes `per_page: 100`, meaning categories beyond the first 100 will also be missing.

Because the system only fetches page 1, any product created or ordered such that it falls on page 2 or later is entirely invisible to the Next.js frontend (including Shop pages, category pages, and the Sitemap).

## Recommended Solution
To resolve this issue without altering the fundamental architecture, the following changes should be made manually:

1. **Update `wcFetch` to expose headers**: Modify the `wcFetch` function to return both the data and the response headers, specifically looking for `x-wp-totalpages`.
2. **Implement Recursive/Loop Fetching**: Create an enhanced fetch wrapper (e.g., `wcFetchAll`) that makes an initial request, reads the `x-wp-totalpages` header, and then executes parallel or sequential requests for `page=2` up to `page=total_pages`.
3. **Update Data Access Functions**: Modify `getVariationProducts`, `getParentProducts`, and `getCategories` to use the new paginated fetch logic so they accumulate and return the complete dataset.

## Technology Considerations
Given that this is a Next.js App Router application, fetching all products recursively could increase build times or TTFB (Time to First Byte) if done synchronously on user requests.
- Use `Promise.all` to fetch subsequent pages concurrently rather than sequentially.
- Ensure the Next.js cache (`revalidate: 300`) is leveraged effectively so the paginated requests are only hitting the WooCommerce API periodically and not on every page load.
