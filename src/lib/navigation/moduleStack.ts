/**
 * Dedicated module navigation history stack for the six primary modules.
 *
 * This is intentionally INDEPENDENT of the browser/router history. It only ever
 * records switches between the primary bottom-navigation modules and is used to
 * drive the Android hardware-back "walk backwards through modules" behavior.
 *
 * Deep pages inside a module are NOT tracked here — those keep using normal
 * router history (navigate(-1)).
 */

// Order matches the bottom navigation + swipe order.
export const MODULE_ROOTS = [
  "/",
  "/movion",
  "/novachat",
  "/bookshelf",
  "/groups",
  "/profile",
] as const;

export const isModuleRoot = (path: string): boolean =>
  (MODULE_ROOTS as readonly string[]).includes(path);

let stack: string[] = [];

export const moduleStack = {
  /** Current stack snapshot (for debugging/tests). */
  get(): string[] {
    return [...stack];
  },

  /** Reset the stack to a single base entry (e.g. on login / fresh mount). */
  reset(path: string): void {
    stack = isModuleRoot(path) ? [path] : [];
  },

  /**
   * Push a module onto the stack. Consecutive duplicates are ignored so that
   * re-selecting the same module never grows the history (Part 4 requirement).
   */
  push(path: string): void {
    if (!isModuleRoot(path)) return;
    if (stack[stack.length - 1] === path) return; // dedupe consecutive
    stack.push(path);
  },

  /**
   * Walk one step backwards. Removes the current top and returns the module the
   * user should land on, or `null` when we are already at the base entry
   * (meaning the app should exit).
   */
  back(): string | null {
    if (stack.length <= 1) return null;
    stack.pop();
    return stack[stack.length - 1] ?? null;
  },
};
