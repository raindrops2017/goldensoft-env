import { create } from 'zustand';

interface FullscreenState {
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  toggleFullscreen: () => void;
}

export const useFullscreenStore = create<FullscreenState>((set) => ({
  isFullscreen: typeof document !== 'undefined' ? !!document.fullscreenElement : false,
  setIsFullscreen: (val) => set({ isFullscreen: val }),
  toggleFullscreen: () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  },
}));
