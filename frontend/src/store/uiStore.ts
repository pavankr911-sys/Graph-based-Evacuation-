import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  uiScale: number; // percentage, e.g. 75, 85, 90, 100, 110, 125
  sidebarCollapsed: boolean;
  setUiScale: (scale: number) => void;
  zoomInUI: () => void;
  zoomOutUI: () => void;
  resetUIZoom: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SCALE_STEPS = [75, 80, 85, 90, 95, 100, 110, 125];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      uiScale: 100,
      sidebarCollapsed: false,

      setUiScale: (scale: number) => {
        const clamped = Math.max(70, Math.min(130, Math.round(scale)));
        set({ uiScale: clamped });
        if (typeof document !== "undefined") {
          (document.body.style as any).zoom = `${clamped}%`;
        }
      },

      zoomInUI: () => {
        const { uiScale, setUiScale } = get();
        const next = SCALE_STEPS.find((s) => s > uiScale) || Math.min(130, uiScale + 5);
        setUiScale(next);
      },

      zoomOutUI: () => {
        const { uiScale, setUiScale } = get();
        const prev = [...SCALE_STEPS].reverse().find((s) => s < uiScale) || Math.max(70, uiScale - 5);
        setUiScale(prev);
      },

      resetUIZoom: () => {
        const { setUiScale } = get();
        setUiScale(100);
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },
    }),
    {
      name: "evacuation_twin_ui_settings",
    }
  )
);
