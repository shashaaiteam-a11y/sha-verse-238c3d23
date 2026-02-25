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
