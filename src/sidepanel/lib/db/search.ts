import Fuse from "fuse.js";
import { db } from "./index";
import type { Note } from "../../../types";

// 設計書 §5.6 — IndexedDB のインデックスで候補を絞り込み、Fuse.js であいまい検索する。

export interface SearchOptions {
  query: string;
  tagIds?: string[]; // 指定タグの OR 絞り込み
}

export async function searchNotes(opts: SearchOptions): Promise<Note[]> {
  const tagIds = opts.tagIds ?? [];
  let candidates: Note[];
  if (tagIds.length === 0) {
    candidates = await db.notes.toArray();
  } else {
    // OR 絞り込み: いずれかのタグを含むメモ
    const seen = new Set<string>();
    candidates = [];
    for (const tagId of tagIds) {
      const notes = await db.notes.where("tagIds").equals(tagId).toArray();
      for (const n of notes) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          candidates.push(n);
        }
      }
    }
  }

  const trimmed = opts.query.trim();
  if (!trimmed) return candidates;

  const fuse = new Fuse(candidates, {
    keys: ["title", "content"],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse.search(trimmed).map((r) => r.item);
}

export function sortByPinAndUpdate(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return b.updatedAt - a.updatedAt;
  });
}
