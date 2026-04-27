import type { PageRef } from "../../../types";

// host_permissions 不要 (§8 / §10.3)。tabs 権限のみで URL / title / favicon を取得する。
export async function captureActiveTab(): Promise<PageRef | null> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab) return null;
    return {
      url: tab.url ?? "",
      title: tab.title ?? "",
      favicon: tab.favIconUrl,
      capturedAt: Date.now(),
    };
  } catch (error) {
    console.warn("captureActiveTab failed", error);
    return null;
  }
}
