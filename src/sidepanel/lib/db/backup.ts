import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import type { Note, Tag } from "../../../types";

export interface ExportPayload {
  schemaVersion: 1;
  exportedAt: number;
  notes: Note[];
  tags: Tag[];
}

export interface ImportResult {
  importedNotes: number;
  importedTags: number;
}

export async function exportAll(): Promise<Blob> {
  const data: ExportPayload = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    notes: await db.notes.toArray(),
    tags: await db.tags.toArray(),
  };
  return new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
}

export async function downloadExport(): Promise<void> {
  const blob = await exportAll();
  const url = URL.createObjectURL(blob);
  try {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `sidememo-export-${stamp}.json`;
    await chrome.downloads.download({ url, filename, saveAs: true });
  } finally {
    // download API は内部で fetch するため即時 revoke せず少し待つ
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

function isPayload(value: unknown): value is ExportPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 1 &&
    Array.isArray(v.notes) &&
    Array.isArray(v.tags)
  );
}

export async function parseImportFile(file: File): Promise<ExportPayload> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!isPayload(parsed)) {
    throw new Error("インポートファイルの形式が不正です");
  }
  return parsed;
}

export interface MergeOptions {
  // 同じ ID のメモの扱い。
  // "overwrite": 取り込み側で上書き / "newer": 更新日時が新しい方を残す
  sameId: "overwrite" | "newer";
  // 既存のメモと本文が同一のものは追加しない（初期化直後のウェルカムメモなど）
  skipSameContent: boolean;
}

export interface MergeResult {
  mergedNotes: number;
  mergedTags: number;
}

// 既存データへ統合する。呼び出し側で db.notes / db.tags を含むトランザクションを張ること。
// - 同じ名前のタグは既存のタグに寄せる（タグ名は一意のため、そのまま追加すると衝突する）
// - ID が既存のタグと衝突し名前も違う場合は新しい ID を振る
// - メモのタグ参照は寄せ先の ID に付け替え、対応のないタグ参照は外す
export async function mergeInto(
  data: { tags: Tag[]; notes: Note[] },
  options: MergeOptions,
): Promise<MergeResult> {
  const tagIdMap = new Map<string, string>();
  let mergedTags = 0;
  for (const tag of data.tags) {
    const sameName = await db.tags.where("name").equals(tag.name).first();
    if (sameName) {
      tagIdMap.set(tag.id, sameName.id);
      continue;
    }
    const idTaken = await db.tags.get(tag.id);
    const id = idTaken ? uuidv4() : tag.id;
    await db.tags.add({ ...tag, id });
    tagIdMap.set(tag.id, id);
    mergedTags += 1;
  }

  const localContents = new Set(
    (await db.notes.toArray()).map((n) => n.content),
  );
  let mergedNotes = 0;
  for (const note of data.notes) {
    const local = await db.notes.get(note.id);
    if (local && options.sameId === "newer" && local.updatedAt >= note.updatedAt) {
      continue;
    }
    if (!local && options.skipSameContent && note.content !== "" && localContents.has(note.content)) {
      continue;
    }
    const tagIds = note.tagIds
      .filter((id) => tagIdMap.has(id))
      .map((id) => tagIdMap.get(id) as string);
    await db.notes.put({ ...note, tagIds });
    localContents.add(note.content);
    mergedNotes += 1;
  }
  return { mergedNotes, mergedTags };
}

export async function importAll(
  payload: ExportPayload,
  mode: "merge" | "replace",
): Promise<ImportResult> {
  return db.transaction("rw", db.notes, db.tags, async () => {
    if (mode === "replace") {
      await db.notes.clear();
      await db.tags.clear();
      if (payload.tags.length > 0) await db.tags.bulkPut(payload.tags);
      if (payload.notes.length > 0) await db.notes.bulkPut(payload.notes);
      return {
        importedNotes: payload.notes.length,
        importedTags: payload.tags.length,
      };
    }
    const merged = await mergeInto(payload, {
      sameId: "overwrite",
      skipSameContent: false,
    });
    return {
      importedNotes: merged.mergedNotes,
      importedTags: merged.mergedTags,
    };
  });
}
