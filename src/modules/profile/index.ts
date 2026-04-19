/**
 * Profile Module - Public API
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/profile/* directly.
 *    They consume profile only via routes (/profile, /profile/:userId, /friends, /settings).
 * 2. This module MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by Profile:
 *   - Pages: Profile, Friends, Settings
 *   - Components: ProfileIntroCard, ProfileMoreMenu, ProfilePostCard,
 *     ProfileSettingsDialog, FeaturedPhotos, FriendsPreview, SocialLinksSection,
 *     ProfileImageUpload, EditProfileDialog
 *   - Hooks: useProfile, useProfileSettings, useUserPosts, useUserPhotos,
 *     useUserVideos, useMutualFriends, useUserInterests
 */
export { default as Profile } from './pages/Profile';
export { default as Friends } from './pages/Friends';
export { default as Settings } from './pages/Settings';
