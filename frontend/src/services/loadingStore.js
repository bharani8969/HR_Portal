// Tiny global store of in-flight network requests. The loader UI subscribes to it.
const entries = new Map();
const listeners = new Set();
let seq = 0;
let snap = { count: 0, entries: [] };

const emit = () => { snap = { count: entries.size, entries: [...entries.values()] }; listeners.forEach((l) => l()); };
export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getSnapshot = () => snap;

// blocking: covers the screen (after `delay` ms) so users cannot click on while it loads.
// quiet requests only drive the thin top progress bar.
export function begin({ blocking = true, delay = 400, label } = {}) {
  const id = ++seq;
  entries.set(id, { start: Date.now(), blocking, delay, label });
  emit();
  return () => { if (entries.delete(id)) emit(); };
}
