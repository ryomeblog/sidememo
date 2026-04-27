// Service Worker と Side Panel 間のメッセージ型定義
export const MESSAGE_INSERT_TEXT = "sidememo:insert-text" as const;
export const STORAGE_PENDING_INSERTION = "sidememo:pending-insertion" as const;

export interface InsertTextMessage {
  type: typeof MESSAGE_INSERT_TEXT;
  text: string;
  capturedAt: number;
}

export interface PendingInsertion {
  text: string;
  capturedAt: number;
}
