// SideMemo 共有型定義
// 設計書 §4.1 のモデルをそのままアプリ全体で利用する

export interface PageRef {
  url: string;
  title: string;
  favicon?: string;
  capturedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tagIds: string[];
  // pinned は IndexedDB のインデックス制約で number 必須 (0 / 1)
  pinned: number;
  pageRef?: PageRef;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface NoteRevision {
  id?: number;
  noteId: string;
  content: string;
  savedAt: number;
}

export type LayoutMode = "auto" | "two-pane" | "one-pane";
export type ThemeMode = "auto" | "light" | "dark";
export type ToolbarVisibility = "always" | "auto-hide" | "hidden";

export interface SettingValues {
  layoutMode: LayoutMode;
  theme: ThemeMode;
  fontSize: 12 | 13 | 14 | 16 | 18;
  toolbarVisibility: ToolbarVisibility;
  autosaveDebounceMs: 250 | 500 | 1000;
}

export const DEFAULT_SETTINGS: SettingValues = {
  layoutMode: "auto",
  theme: "auto",
  fontSize: 14,
  toolbarVisibility: "always",
  autosaveDebounceMs: 500,
};
