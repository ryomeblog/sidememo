import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import type { Note, NoteRevision, PageRef } from "../../../types";
import { extractTitle } from "../markdown/extractTitle";

// UI 層は Dexie に直接アクセスせず、必ずこの Repository を経由する (CLAUDE.md / §3.2)。

export interface CreateNoteInput {
  content?: string;
  tagIds?: string[];
}

// 論理削除（deletedAt）されたメモは一覧・取得の対象外にする。
const isLive = (note: Note) => note.deletedAt === undefined;

export async function listNotes(): Promise<Note[]> {
  // ピン留め優先 → 更新日時降順
  const notes = (await db.notes.orderBy("updatedAt").reverse().toArray()).filter(isLive);
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return b.updatedAt - a.updatedAt;
  });
}

export async function listNotesByTag(tagId: string): Promise<Note[]> {
  const notes = (await db.notes.where("tagIds").equals(tagId).toArray()).filter(isLive);
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getNote(id: string): Promise<Note | undefined> {
  const note = await db.notes.get(id);
  return note && isLive(note) ? note : undefined;
}

export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
  const now = Date.now();
  const content = input.content ?? "";
  const note: Note = {
    id: uuidv4(),
    title: extractTitle(content),
    content,
    tagIds: input.tagIds ?? [],
    pinned: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(note);
  return note;
}

export interface UpdateNoteInput {
  content?: string;
  tagIds?: string[];
  pinned?: number;
  pageRef?: PageRef;
}

// 戻り値: 実際に更新できたら true / 対象メモが既に存在しなければ false。
// 削除済みメモへの遅延保存（ゾンビ書き込み）を呼び出し側が検知できるようにする。
export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<boolean> {
  const current = await db.notes.get(id);
  // 削除済み（論理削除）メモへの遅延保存は書き込まない。
  if (!current || !isLive(current)) return false;
  const patch: Partial<Note> = { updatedAt: Date.now() };
  if (input.content !== undefined) {
    patch.content = input.content;
    patch.title = extractTitle(input.content);
  }
  if (input.tagIds !== undefined) patch.tagIds = input.tagIds;
  if (input.pinned !== undefined) patch.pinned = input.pinned;
  if (input.pageRef !== undefined) patch.pageRef = input.pageRef;
  const updated = await db.notes.update(id, patch);
  return updated > 0;
}

export async function togglePin(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (!note) return;
  await db.notes.update(id, {
    pinned: note.pinned === 1 ? 0 : 1,
    updatedAt: Date.now(),
  });
}

export async function attachPage(id: string, pageRef: PageRef): Promise<void> {
  await db.notes.update(id, { pageRef, updatedAt: Date.now() });
}

export async function detachPage(id: string): Promise<void> {
  // Dexie で undefined を渡すとフィールドが削除される
  await db.notes.update(id, { pageRef: undefined, updatedAt: Date.now() });
}

// 論理削除する。削除前のメモ本体を返す。呼び出し側はこれを保持しておけば「元に戻す」が実装できる。
// 物理削除は次回のバックアップ時に行う（バックアップから消してから DB から消す）。
export async function deleteNote(id: string): Promise<Note | undefined> {
  return db.transaction("rw", db.notes, async () => {
    const note = await db.notes.get(id);
    if (!note || !isLive(note)) return undefined;
    await db.notes.update(id, { deletedAt: Date.now() });
    return note;
  });
}

// deleteNote が返したメモをそのまま書き戻す（削除の取り消し）。
// 物理削除済みでも、元の内容で復活させる。
export async function restoreNote(note: Note): Promise<void> {
  await db.notes.put({ ...note, deletedAt: undefined });
}

export async function saveRevision(
  noteId: string,
  content: string,
): Promise<void> {
  const revision: NoteRevision = {
    noteId,
    content,
    savedAt: Date.now(),
  };
  await db.revisions.add(revision);
}
