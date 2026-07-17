/**
 * Sanitize user-supplied search text before splicing it into a PostgREST
 * `.or()` / `.ilike()` filter string. PostgREST treats `,` `(` `)` `.` `:`
 * as syntax, and `%` / `_` are wildcards in ILIKE — a raw user string can
 * inject extra filter clauses or alter matching semantics.
 *
 * We escape PostgREST-significant characters and cap length. Callers should
 * still pass the sanitized value through the normal `%${term}%` template.
 */
export function sanitizeSearchTerm(input: string, maxLength = 100): string {
  if (!input) return '';
  return input
    .slice(0, maxLength)
    // strip PostgREST filter delimiters and ILIKE wildcards
    .replace(/[,()\\.:*%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
