import { useEffect } from "react";
import {
  MESSAGE_INSERT_TEXT,
  STORAGE_PENDING_INSERTION,
  type InsertTextMessage,
  type PendingInsertion,
} from "../lib/chrome/messaging";

// Service Worker からの挿入リクエストを Side Panel 起動経路にかかわらず取りこぼさず受け取る。
// (1) chrome.runtime.onMessage: 既に開いている時のリアルタイム経由
// (2) chrome.storage.session: 起動直後 / 競合時のフォールバック
export function useInsertionListener(onInsert: (text: string) => void): void {
  useEffect(() => {
    const handler = onInsert;

    const messageListener = (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === MESSAGE_INSERT_TEXT
      ) {
        const msg = message as InsertTextMessage;
        if (typeof msg.text === "string" && msg.text.length > 0) {
          handler(msg.text);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // マウント時に保留中があれば消化する
    chrome.storage.session
      .get(STORAGE_PENDING_INSERTION)
      .then((res) => {
        const pending = res[STORAGE_PENDING_INSERTION] as
          | PendingInsertion
          | undefined;
        if (pending && typeof pending.text === "string" && pending.text) {
          handler(pending.text);
          return chrome.storage.session.remove(STORAGE_PENDING_INSERTION);
        }
        return undefined;
      })
      .catch((error: unknown) => {
        console.warn("Failed to drain pending insertion", error);
      });

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [onInsert]);
}
