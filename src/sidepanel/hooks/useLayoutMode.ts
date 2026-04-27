import { useSyncExternalStore } from "react";
import { useSettings } from "./useSettings";

const NARROW_THRESHOLD = 400;

export type EffectiveLayout = "two-pane" | "one-pane";

function subscribeWindow(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getWindowWidth(): number {
  return window.innerWidth;
}

// 自動モードでは幅 400px をしきい値に 2 ペイン / 1 ペインを切り替える。
// useSyncExternalStore を使うので effect 内 setState の連鎖再レンダーは発生しない。
export function useLayoutMode(): EffectiveLayout {
  const settings = useSettings();
  const width = useSyncExternalStore(subscribeWindow, getWindowWidth, () =>
    NARROW_THRESHOLD,
  );

  if (settings.layoutMode === "two-pane") return "two-pane";
  if (settings.layoutMode === "one-pane") return "one-pane";
  return width >= NARROW_THRESHOLD ? "two-pane" : "one-pane";
}
