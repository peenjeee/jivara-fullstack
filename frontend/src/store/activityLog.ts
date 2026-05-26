import { create } from "zustand";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";

interface ActivityLogState {
  readonly activities: ActivityLogRecord[];
  readonly isLoading: boolean;
  readonly unreadActivityCount: number | null;
  readonly setActivities: (activities: ActivityLogRecord[]) => void;
  readonly setLoading: (isLoading: boolean) => void;
  readonly setUnreadActivityCount: (count: number | null) => void;
  readonly addActivity: (activity: ActivityLogRecord) => void;
  readonly markAsRead: (activityId: string) => void;
  readonly markAllAsRead: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()((set) => ({
  activities: [],
  isLoading: false,
  unreadActivityCount: null,
  setActivities: (activities) => set({ activities }),
  setLoading: (isLoading) => set({ isLoading }),
  setUnreadActivityCount: (count) => set({ unreadActivityCount: count }),
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities],
    unreadActivityCount: activity.read ? state.unreadActivityCount : state.unreadActivityCount === null ? null : state.unreadActivityCount + 1,
  })),
  markAsRead: (activityId) => set((state) => {
    const wasUnread = state.activities.some((activity) => activity.id === activityId && !activity.read);

    return {
      activities: state.activities.map((activity) => activity.id === activityId ? { ...activity, read: true } : activity),
      unreadActivityCount: state.unreadActivityCount === null || !wasUnread ? state.unreadActivityCount : Math.max(state.unreadActivityCount - 1, 0),
    };
  }),
  markAllAsRead: () => set((state) => ({
    activities: state.activities.map((activity) => ({ ...activity, read: true })),
    unreadActivityCount: 0,
  })),
}));
