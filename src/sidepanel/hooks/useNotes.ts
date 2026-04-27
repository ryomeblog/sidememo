import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db/index";
import type { Note } from "../../types";

// 一覧はピン留め優先 → 更新日時降順。
// useLiveQuery なので IndexedDB の変更が即座に反映される。
export function useNotes(filterTagId?: string): Note[] | undefined {
  return useLiveQuery(async () => {
    const notes = filterTagId
      ? await db.notes.where("tagIds").equals(filterTagId).toArray()
      : await db.notes.toArray();
    return notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.updatedAt - a.updatedAt;
    });
  }, [filterTagId]);
}

export function useNote(id: string | null): Note | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return db.notes.get(id);
  }, [id]);
}
