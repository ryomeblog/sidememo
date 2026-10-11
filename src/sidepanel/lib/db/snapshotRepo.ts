import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import { mergeInto, type MergeResult } from "./backup";
import type { Note, Tag } from "../../../types";

// IndexedDB とは別の保存領域（chrome.storage.local）に、メモ・タグの写しを上書きで保持する。
// IndexedDB だけが消えた場合に、ここから復元できるようにするため。
// UI 層はこのリポジトリ経由でのみ利用する (§3.2)。

const SNAPSHOT_KEY = "sidememo:snapshot";
const DB_ID_SETTING_KEY = "dbId";

export interface Snapshot {
  schemaVersion: 1;
  savedAt: number;
  // 書き込み元の IndexedDB を識別する ID。IndexedDB が作り直されると新しい ID になる。
  dbId: string;
  notes: Note[];
  tags: Tag[];
}

export interface RecoveryState {
  // 別の IndexedDB（作り直された後の DB）に対して、未処理のバックアップが残っている。
  // この間はバックアップを上書きしない（復元前のデータを守るため）。
  pending: boolean;
  snapshot: Snapshot | null;
}

export type RestoreResult = MergeResult;

// 直列化: 保存・復元・確認を 1 本ずつ実行し、互いに競合させない。
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

// 直前に書いた内容。変化がなければ chrome.storage への書き込みを省く。
let lastWrittenKey: string | null = null;

async function ensureDbId(): Promise<string> {
  const row = await db.settings.get(DB_ID_SETTING_KEY);
  if (typeof row?.value === "string") return row.value;
  const id = uuidv4();
  await db.settings.put({ key: DB_ID_SETTING_KEY, value: id });
  return id;
}

async function readSnapshot(): Promise<Snapshot | null> {
  const result = await chrome.storage.local.get(SNAPSHOT_KEY);
  return (result[SNAPSHOT_KEY] as Snapshot | undefined) ?? null;
}

async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot });
}

function isForeignPending(snapshot: Snapshot | null, dbId: string): boolean {
  return snapshot !== null && snapshot.dbId !== dbId && snapshot.notes.length > 0;
}

export function getSnapshot(): Promise<Snapshot | null> {
  return serialize(readSnapshot);
}

export function getRecoveryState(): Promise<RecoveryState> {
  return serialize(async () => {
    const snapshot = await readSnapshot();
    const dbId = await ensureDbId();
    return { pending: isForeignPending(snapshot, dbId), snapshot };
  });
}

// 現在の内容でスナップショットを上書きする。復元待ちの間は何もしない。
export function saveSnapshotIfNeeded(): Promise<boolean> {
  return serialize(async () => {
    const dbId = await ensureDbId();
    const existing = await readSnapshot();
    if (isForeignPending(existing, dbId)) return false;

    const notes = await db.notes.toArray();
    const tags = await db.tags.toArray();
    const key = JSON.stringify([dbId, notes, tags]);
    if (key === lastWrittenKey) return false;

    await writeSnapshot({
      schemaVersion: 1,
      savedAt: Date.now(),
      dbId,
      notes,
      tags,
    });
    lastWrittenKey = key;
    return true;
  });
}

// 別 DB のバックアップを「確認済み」にして、以後の自動バックアップで上書きできるようにする。
export function acknowledgeSnapshot(): Promise<void> {
  return serialize(async () => {
    const snapshot = await readSnapshot();
    if (!snapshot) return;
    const dbId = await ensureDbId();
    await writeSnapshot({ ...snapshot, dbId });
    lastWrittenKey = null;
  });
}

// スナップショットの内容を現在の DB にマージする。
// - 同じ名前のタグは既存のタグに寄せる（タグ名は一意のため）
// - 同じ ID のメモは、更新日時が新しい方を残す（編集中の内容を古い写しで潰さない）
export function restoreFromSnapshot(): Promise<RestoreResult | null> {
  return serialize(async () => {
    const snapshot = await readSnapshot();
    if (!snapshot) return null;
    const dbId = await ensureDbId();

    const result = await db.transaction("rw", db.notes, db.tags, () =>
      mergeInto(snapshot, { sameId: "newer", skipSameContent: true }),
    );

    // 復元した DB を新しい基準にして、以後のバックアップを再開する。
    await writeSnapshot({ ...snapshot, dbId });
    lastWrittenKey = null;
    return result;
  });
}
