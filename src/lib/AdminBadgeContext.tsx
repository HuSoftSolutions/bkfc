"use client";

import { createContext, useContext } from "react";
import { useAdminBadges, AdminBadges } from "@/lib/useAdminBadges";

interface AdminBadgeContextValue {
  badges: AdminBadges;
  refresh: () => Promise<void>;
}

const AdminBadgeContext = createContext<AdminBadgeContextValue>({
  badges: { calls: 0, news: 0, events: 0, messages: 0, volunteers: 0, registrations: 0, donations: 0 },
  refresh: async () => {},
});

export function AdminBadgeProvider({ children }: { children: React.ReactNode }) {
  const { badges, refresh } = useAdminBadges();
  return (
    <AdminBadgeContext.Provider value={{ badges, refresh }}>
      {children}
    </AdminBadgeContext.Provider>
  );
}

export function useAdminBadgeContext() {
  return useContext(AdminBadgeContext);
}
