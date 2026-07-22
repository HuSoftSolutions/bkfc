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

export function sortEventsUpcomingFirst<
  T extends { pinned?: boolean; date?: string; endDate?: string }
>(items: T[]): T[] {
  // Site dates are Eastern Time (YYYY-MM-DD strings)
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  const isPast = (e: T) => (e.endDate || e.date || "") < today;
  return [...items].sort((a, b) => {
    // Pinned items first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Upcoming before past
    const aPast = isPast(a);
    const bPast = isPast(b);
    if (aPast !== bPast) return aPast ? 1 : -1;
    // Upcoming: soonest first; past: most recent first
    return aPast
      ? (b.date || "").localeCompare(a.date || "")
      : (a.date || "").localeCompare(b.date || "");
  });
}
