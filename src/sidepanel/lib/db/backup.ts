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

export async function importAll(
  payload: ExportPayload,
  mode: "merge" | "replace",
): Promise<ImportResult> {
  return db.transaction("rw", db.notes, db.tags, async () => {
    if (mode === "replace") {
      await db.notes.clear();
      await db.tags.clear();
    }
    if (payload.tags.length > 0) await db.tags.bulkPut(payload.tags);
    if (payload.notes.length > 0) await db.notes.bulkPut(payload.notes);
    return {
      importedNotes: payload.notes.length,
      importedTags: payload.tags.length,
    };
  });
}
