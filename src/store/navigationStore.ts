import { create } from 'zustand';
import type { WaypointId } from '../engine/WaypointGraph';

interface NavigationState {
  currentWaypoint: WaypointId;
  navigateTo: ((id: WaypointId) => void) | null;
  setNavigateTo: (fn: (id: WaypointId) => void) => void;
  setCurrentWaypoint: (id: WaypointId) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  currentWaypoint: 'center',
  navigateTo: null,
  setNavigateTo: (fn) => set({ navigateTo: fn }),
  setCurrentWaypoint: (id) => set({ currentWaypoint: id }),
}));
