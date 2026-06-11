export const BOOK_CATEGORIES = [
    "Fiction",
    "Self-Help",
    "Education",
    "Comic",
    "Biography",
    "Science",
    "Motivational",
    "Business",
    "Health",
    "Travel",
    "Cooking",
    "Poetry",
    "Religion",
    "Technology",
    "History",
    "Art",
] as const;

export type BookCategory = typeof BOOK_CATEGORIES[number];

export const VISIBILITIES = ['public', 'friends', 'private'] as const;
export const AGE_RESTRICTIONS = ['none', '13+', '16+', '18+'] as const;

// Public-safe column list for the books table (excludes sensitive file_hash).
// Use this instead of "*" so column-level REVOKE on books.file_hash never breaks reads.
export const BOOK_PUBLIC_COLUMNS =
  "id, channel_id, title, author, description, cover_url, book_url, pages, views_count, likes_count, comments_count, created_at, category, language, tags, visibility, age_restriction, comments_enabled, ratings_enabled, downloads_count, rating_avg, rating_count";
