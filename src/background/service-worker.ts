// SideMemo Service Worker (MV3)
// MV3 の Service Worker は非アクティブ化されるためステートレスに保つ (§13)。
// 永続データ操作は Side Panel 側 (IndexedDB) で行う。

const MENU_OPEN_PANEL = "sidememo-open";
const MENU_INSERT_SELECTION = "sidememo-insert-selection";
const STORAGE_PENDING_INSERTION = "sidememo:pending-insertion";
const MESSAGE_INSERT_TEXT = "sidememo:insert-text";

interface PendingInsertion {
  text: string;
  capturedAt: number;
}

function setupContextMenus() {
  // 既存のメニュー項目をクリアしてから登録 (再インストール時の重複防止)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_OPEN_PANEL,
      title: "SideMemo を開く",
      contexts: ["all"],
    });
    chrome.contextMenus.create({
      id: MENU_INSERT_SELECTION,
      title: "選択テキストを SideMemo に挿入",
      contexts: ["selection"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  // ツールバーアイコンクリックでサイドパネルを開く
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.error("Failed to set side panel behavior", error);
    });
  setupContextMenus();
});

// MV3 SW は再起動するため onStartup でも確実に登録する
chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_OPEN_PANEL) {
    if (tab?.windowId !== undefined) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (error) {
        console.warn("sidePanel.open failed", error);
      }
    }
    return;
  }

  if (info.menuItemId === MENU_INSERT_SELECTION) {
    const text = info.selectionText?.trim();
    if (!text) return;

    // Side Panel 起動前後の取りこぼし対策として storage.session に保存し、
    // パネル側のマウント時に必ず引き取れるようにする。
    const payload: PendingInsertion = { text, capturedAt: Date.now() };
    try {
      await chrome.storage.session.set({
        [STORAGE_PENDING_INSERTION]: payload,
      });
    } catch (error) {
      console.warn("storage.session.set failed", error);
    }

    if (tab?.windowId !== undefined) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (error) {
        console.warn("sidePanel.open failed", error);
      }
    }

    // 既に開いていればメッセージで即時挿入する。
    // 受信側不在時の例外は無視する (storage 経由で拾われる)。
    chrome.runtime
      .sendMessage({ type: MESSAGE_INSERT_TEXT, text, capturedAt: payload.capturedAt })
      .catch(() => {
        /* receiver 不在時は無視 */
      });
  }
});
