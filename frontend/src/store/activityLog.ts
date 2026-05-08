import { create } from "zustand";
import { activityLogs as initialActivityLogs, type ActivityLogRecord } from "@/lib/mocks/activityLogs";

interface ActivityLogState {
  readonly activities: ActivityLogRecord[];
  readonly addActivity: (activity: ActivityLogRecord) => void;
  readonly markAsRead: (activityId: string) => void;
  readonly markAllAsRead: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()((set) => ({
  activities: initialActivityLogs,
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities],
  })),
  markAsRead: (activityId) => set((state) => ({
    activities: state.activities.map((activity) => activity.id === activityId ? { ...activity, read: true } : activity),
  })),
  markAllAsRead: () => set((state) => ({
    activities: state.activities.map((activity) => ({ ...activity, read: true })),
  })),
}));
