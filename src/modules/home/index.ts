/**
 * Home Module - Public API
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/home/* directly.
 *    They consume home only via routes (/, /saved, /notifications).
 * 2. This module MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by Home:
 *   - Pages: Home, SavedPosts, Notifications
 *   - Components: PostCard, FeedCard, CreatePostCard, PostComments,
 *     StoriesBar, StoryViewer, WhatsAppStoriesBar, stories/*
 *   - Hooks: useFeed, usePosts, useStories, useReactions, useSavedPosts
 */
export { default as Home } from './pages/Home';
export { default as SavedPosts } from './pages/SavedPosts';
export { default as Notifications } from './pages/Notifications';
