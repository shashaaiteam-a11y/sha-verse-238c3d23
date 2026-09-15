/** Fixed-window batching: events from different tables never overwrite one another. */
export function createRealtimeBatch(invalidate: (key: string) => void, delay = 250) {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    add(keys: readonly string[]) {
      keys.forEach(key => pending.add(key));
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        const keys = [...pending];
        pending.clear();
        keys.forEach(key => invalidate(key));
      }, delay);
    },
    dispose() { clearTimeout(timer); pending.clear(); timer = undefined; },
  };
}
