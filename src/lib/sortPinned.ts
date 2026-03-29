export function sortPinned<T extends { pinned?: boolean; date?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    // Pinned items first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Then by date descending
    return (b.date || "").localeCompare(a.date || "");
  });
}
