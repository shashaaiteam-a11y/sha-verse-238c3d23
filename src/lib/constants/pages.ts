// Columns of `public.pages` that any authenticated user may read.
// `phone` and `email` are intentionally excluded — they are contact details
// protected by column-level security and fetched per-page via the
// `get_page_contact` RPC to prevent bulk enumeration/scraping.
export const PAGE_PUBLIC_COLUMNS =
  "id, name, slug, about, avatar_url, cover_url, category, created_by, created_at, updated_at, followers_count, website, location, hours, verified";
