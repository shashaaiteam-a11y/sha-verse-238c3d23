/**
 * Movion Module - Public API
 *
 * Movion's actual implementation lives at `src/movion/` (already isolated:
 * its own pages/, components/, hooks/, contexts/, store, algorithms, types).
 * This `src/modules/movion/` folder is a symmetry wrapper so all 7 modules
 * share the same public-API shape under `src/modules/<name>/`.
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/movion/* or src/movion/*.
 *    They consume movion only via routes (/movion, /video/:id, /channel/:id).
 * 2. Movion MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. Movion MUST NOT import from any other src/modules/<name>/*.
 */
export { default as Movion } from './pages/Movion';
export { default as VideoWatch } from './pages/VideoWatch';
export { default as ChannelPage } from './pages/ChannelPage';
export { default as CreatorStudio } from './pages/CreatorStudio';
export { default as MovionLibrary } from './pages/MovionLibrary';
export { default as MovionAdmin } from './pages/MovionAdmin';
