/**
 * API Services Index
 * Central export for all independent API service modules
 */

// Base service
export { BaseService } from './BaseService';
export type { ServiceResult, PaginationParams, PaginatedResult } from './BaseService';

// Post service
export { PostService } from './PostService';
export type { Post, CreatePostParams, UpdatePostParams } from './PostService';

// Reaction service
export { ReactionService } from './ReactionService';
export type { ReactionType, TargetType, Reaction, ReactionCounts, ToggleReactionResult } from './ReactionService';

// Story service
export { StoryService } from './StoryService';
export type { Story, StoryGroup, CreateStoryParams } from './StoryService';

// Share service
export { ShareService } from './ShareService';
export type { ShareTarget, ContentType, ShareParams, SharePermission } from './ShareService';

// Group service
export { GroupService } from './GroupService';
export type { Group, GroupMember, GroupPost } from './GroupService';

// Page service
export { PageService } from './PageService';
export type { Page, PagePost, PageRole } from './PageService';
