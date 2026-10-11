import { db } from "./index";
import { mergeInto, type MergeResult } from "./backup";
import type { Note, Tag } from "../../../types";

// バックアップは chrome.storage.local に、メモ・タグごとの ID キーで保存する。
// - DB に存在するメモ・タグだけを上書きする（DB から消えても、バックアップの ID は残る）
// - 論理削除（deletedAt）されたメモは、バックアップから消してから DB からも物理削除する
// - バックアップにあるのに DB に無い ID は「消えたメモ」として扱い、復元か無視を選ばせる
// UI 層はこのリポジトリ経由でのみ利用する (§3.2)。

const NOTE_PREFIX = "backup:note:";
const TAG_PREFIX = "backup:tag:";
const META_KEY = "backup:meta";
// 旧形式（メモ全体を 1 キーに保存していた版）。移行後に削除する。
const LEGACY_KEY = "sidememo:snapshot";

export interface BackupStatus {
  savedAt: number | null;
  backupNotes: number;
  backupTags: number;
  // バックアップにあるが DB に無いメモ（DB が消えた等で失われたもの）
  lostNotes: Note[];
}

export type RestoreResult = MergeResult;

// 直列化: バックアップ・復元・確認を 1 本ずつ実行し、互いに競合させない。
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

async function migrateLegacy(): Promise<void> {
  const result = await chrome.storage.local.get([LEGACY_KEY]);
  const legacy = result[LEGACY_KEY] as { notes: Note[]; tags: Tag[] } | undefined;
  if (!legacy) return;
  const stored = await chrome.storage.local.get(null);
  const updates: Record<string, unknown> = {};
  for (const note of legacy.notes) {
    const key = NOTE_PREFIX + note.id;
    if (!(key in stored)) updates[key] = note;
  }
  for (const tag of legacy.tags) {
    const key = TAG_PREFIX + tag.id;
    if (!(key in stored)) updates[key] = tag;
  }
  if (Object.keys(updates).length > 0) await chrome.storage.local.set(updates);
  await chrome.storage.local.remove(LEGACY_KEY);
}

// 定期・起動時・パネルを隠したときに呼ぶ。
// 1. DB の内容でバックアップを上書き（変更があったものだけ）
// 2. 論理削除したメモをバックアップから消し、DB からも物理削除する
export function runBackup(): Promise<void> {
  return serialize(async () => {
    await migrateLegacy();
    const stored = await chrome.storage.local.get(null);

    const allNotes = await db.notes.toArray();
    const liveNotes = allNotes.filter((n) => n.deletedAt === undefined);
    const deletedNotes = allNotes.filter((n) => n.deletedAt !== undefined);
    const tags = await db.tags.toArray();

    const updates: Record<string, unknown> = {};
    for (const note of liveNotes) {
      const key = NOTE_PREFIX + note.id;
      if (JSON.stringify(stored[key]) !== JSON.stringify(note)) updates[key] = note;
    }
    for (const tag of tags) {
      const key = TAG_PREFIX + tag.id;
      if (JSON.stringify(stored[key]) !== JSON.stringify(tag)) updates[key] = tag;
    }
    if (Object.keys(updates).length > 0) {
      updates[META_KEY] = { savedAt: Date.now() };
      await chrome.storage.local.set(updates);
    }

    if (deletedNotes.length > 0) {
      // 先にバックアップから消し、成功してから DB から物理削除する。
      await chrome.storage.local.remove(
        deletedNotes.map((n) => NOTE_PREFIX + n.id),
      );
      await db.transaction("rw", db.notes, db.revisions, async () => {
        for (const note of deletedNotes) {
          await db.revisions.where("noteId").equals(note.id).delete();
        }
        await db.notes.bulkDelete(deletedNotes.map((n) => n.id));
      });
    }
  });
}

export function getBackupStatus(): Promise<BackupStatus> {
  return serialize(async () => {
    const stored = await chrome.storage.local.get(null);
    const backupNotes: Note[] = [];
    let backupTags = 0;
    for (const [key, value] of Object.entries(stored)) {
      if (key.startsWith(NOTE_PREFIX)) backupNotes.push(value as Note);
      if (key.startsWith(TAG_PREFIX)) backupTags += 1;
    }
    const ids = new Set((await db.notes.toArray()).map((n) => n.id));
    const meta = stored[META_KEY] as { savedAt: number } | undefined;
    return {
      savedAt: meta?.savedAt ?? null,
      backupNotes: backupNotes.length,
      backupTags,
      lostNotes: backupNotes.filter((n) => !ids.has(n.id)),
    };
  });
}

// バックアップにあるメモを DB に統合する。
// - 同じ ID のメモは更新日時が新しい方を残す
// - 同じ本文の既存メモは重複させない（初期化直後のウェルカムメモなど）
// 統合後、重複で取り込まなかった「消えたメモ」はバックアップから外す。
export function restoreFromBackup(): Promise<RestoreResult> {
  return serialize(async () => {
    const stored = await chrome.storage.local.get(null);
    const notes: Note[] = [];
    const tags: Tag[] = [];
    for (const [key, value] of Object.entries(stored)) {
      if (key.startsWith(NOTE_PREFIX)) notes.push(value as Note);
      if (key.startsWith(TAG_PREFIX)) tags.push(value as Tag);
    }
    const result = await db.transaction("rw", db.notes, db.tags, () =>
      mergeInto({ tags, notes }, { sameId: "newer", skipSameContent: true }),
    );
    await dropLostNotes();
    return result;
  });
}

// 消えたメモをバックアップから外す（「無視」・復元後の後始末・置き換えインポート後）。
export function discardLostNotes(): Promise<number> {
  return serialize(dropLostNotes);
}

async function dropLostNotes(): Promise<number> {
  const stored = await chrome.storage.local.get(null);
  const ids = new Set((await db.notes.toArray()).map((n) => n.id));
  const lostKeys = Object.keys(stored).filter(
    (key) => key.startsWith(NOTE_PREFIX) && !ids.has(key.slice(NOTE_PREFIX.length)),
  );
  if (lostKeys.length > 0) await chrome.storage.local.remove(lostKeys);
  return lostKeys.length;
}

// アプリ内のタグ削除をバックアップにも反映する（物理削除のため即時）。
export function removeTagFromBackup(tagId: string): Promise<void> {
  return serialize(async () => {
    await chrome.storage.local.remove(TAG_PREFIX + tagId);
  });
}
