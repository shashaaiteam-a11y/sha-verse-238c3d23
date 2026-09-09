/**
 * Turns an FCM payload into an in-app route.
 * The backend always sends `data.path`, built from the same entity paths as
 * src/lib/deepLinks.ts, so tapping a push lands on the correct screen.
 */
export const resolvePushPath = (data: Record<string, unknown> | undefined | null): string => {
  const path = typeof data?.path === 'string' ? data.path : '';
  // Only allow in-app absolute paths — never an external URL.
  if (path.startsWith('/') && !path.startsWith('//')) return path;
  return '/notifications';
};
