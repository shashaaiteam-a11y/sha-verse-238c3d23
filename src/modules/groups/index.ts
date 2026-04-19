/**
 * Groups Module - Public API
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/groups/* directly.
 *    They consume groups only via routes (/groups, /groups/:groupId, /groups/:groupId/admin).
 * 2. This module MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by Groups:
 *   - Pages: Groups, GroupDetail, GroupAdmin
 *   - Components: CreateGroupDialog, group/* (group UI components)
 *   - Hooks: useGroups, useGroupAdmin, useGroupChat, useGroupJoinRequests,
 *     useGroupMembers, useGroupPosts, useGroupReports
 */
export { default as Groups } from './pages/Groups';
export { default as GroupDetail } from './pages/GroupDetail';
export { default as GroupAdmin } from './pages/GroupAdmin';
