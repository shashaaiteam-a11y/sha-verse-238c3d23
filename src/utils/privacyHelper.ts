// Privacy visibility helper utility
// Location: src/utils/privacyHelper.ts

export interface PrivacySettings {
  email?: string;
  phone?: string;
  birthdate?: string;
  location?: string;
  work?: string;
  education?: string;
  relationship?: string;
  friends_list?: string;
  bio?: string;
  about_me?: string;
  current_city?: string;
  hometown?: string;
  website?: string;
  [key: string]: string | undefined;
}

export type PrivacyLevel = 'public' | 'friends' | 'only_me';

/**
 * Check if a piece of information should be visible to the current user
 * @param privacySetting - The privacy level from profile (public/friends/only_me)
 * @param isOwnProfile - Is this the current user's own profile?
 * @param isFriend - Is the current user a friend of the profile owner?
 * @returns boolean - Whether the information should be visible
 */
export const shouldShowInfo = (
  privacySetting: string | undefined,
  isOwnProfile: boolean,
  isFriend: boolean
): boolean => {
  // Own profile can always see everything
  if (isOwnProfile) return true;

  // Default to public if not set
  const level = (privacySetting || 'public') as PrivacyLevel;

  switch (level) {
    case 'public':
      return true; // Everyone can see
    case 'friends':
      return isFriend; // Only friends can see
    case 'only_me':
      return false; // Only owner can see (non-owner sees nothing)
    default:
      return false;
  }
};

/**
 * Filter profile data based on privacy settings
 * @param profile - The full profile object
 * @param privacySettings - Privacy settings for each field
 * @param isOwnProfile - Is this the current user's own profile?
 * @param isFriend - Is the current user a friend of the profile owner?
 * @returns Filtered profile object with only visible fields
 */
export const filterProfileByPrivacy = (
  profile: any,
  privacySettings: PrivacySettings | null | undefined,
  isOwnProfile: boolean,
  isFriend: boolean
): any => {
  if (!profile) return profile;

  const privacy = privacySettings || {};
  const filteredProfile = { ...profile };

  // List of fields that have privacy controls
  const privacyFields = [
    'email',
    'phone',
    'birthdate',
    'location',
    'work',
    'education',
    'relationship_status',
    'bio',
    'about_me',
    'current_city',
    'hometown',
    'website',
  ];

  // Check each field against privacy settings
  privacyFields.forEach((field) => {
    const privacyLevel = privacy[field] || 'public';
    if (!shouldShowInfo(privacyLevel, isOwnProfile, isFriend)) {
      filteredProfile[field] = null;
    }
  });

  return filteredProfile;
};

/**
 * Get privacy level for a specific field
 */
export const getPrivacyLevel = (
  privacySettings: PrivacySettings | null | undefined,
  field: string
): PrivacyLevel => {
  return ((privacySettings?.[field] || 'public') as PrivacyLevel);
};
