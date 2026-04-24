import * as React from "react";

export type Announcement = {
  id: number;
  title: string | null;
  body?: string | null;
  audience?: string | null;
  is_pinned?: boolean;
  is_active?: boolean;
  published_at?: string | null;
};

export function useAnnouncementReadState(
  announcements: Announcement[],
  userEmail: string | null
) {
  const storageKey = React.useMemo(
    () =>
      userEmail
        ? `onehealth_ann_read_${userEmail}`
        : "onehealth_ann_read_guest",
    [userEmail]
  );

  const [readIds, setReadIds] = React.useState<Set<number>>(new Set());

  // Load from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setReadIds(new Set(parsed.map((id) => Number(id))));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Keep storage in sync when readIds change
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const arr = Array.from(readIds);
      window.localStorage.setItem(storageKey, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }, [storageKey, readIds]);

  // Cleanup: remove IDs that no longer exist in announcements
  React.useEffect(() => {
    const validIds = new Set(announcements.map((a) => a.id));
    setReadIds((prev) => {
      let changed = false;
      const next = new Set<number>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [announcements]);

  const markAllRead = React.useCallback(() => {
    setReadIds(new Set(announcements.map((a) => a.id)));
  }, [announcements]);

  const markOneRead = React.useCallback((id: number) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unreadCount = React.useMemo(
    () => announcements.filter((a) => !readIds.has(a.id)).length,
    [announcements, readIds]
  );

  return {
    readIds,          // Set<number>
    unreadCount,      // how many are unread
    markAllRead,      // call this when user opens the bell modal
    markOneRead,      // optional: when user clicks a specific item
  };
}
