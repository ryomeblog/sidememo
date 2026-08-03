import type { DownloadFormat, Note } from "../../../types";

// メモ 1 件を .md / .txt としてダウンロードする。
// 内容は加工せずそのまま書き出す（拡張子だけが変わる）ため、
// Markdown モードで書いたメモも記法を保ったまま保存される。

// ファイル名に使えない文字と制御文字を潰す。
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;
const MAX_BASENAME = 80;

export function toSafeFilename(title: string, format: DownloadFormat): string {
  const base = title
    .replace(INVALID_CHARS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .slice(0, MAX_BASENAME)
    .trim();
  return `${base.length > 0 ? base : "無題"}.${format}`;
}

export function buildNoteBlob(note: Note, format: DownloadFormat): Blob {
  // BOM 無し UTF-8。Windows のメモ帳対策で txt のみ BOM を付ける。
  const mime = format === "md" ? "text/markdown" : "text/plain";
  const parts = format === "txt" ? ["\uFEFF", note.content] : [note.content];
  return new Blob(parts, { type: `${mime};charset=utf-8` });
}

export interface DownloadNoteOptions {
  /** true にすると保存先ダイアログを表示する。 */
  saveAs?: boolean;
}

export async function downloadNote(
  note: Note,
  format: DownloadFormat,
  options: DownloadNoteOptions = {},
): Promise<void> {
  const blob = buildNoteBlob(note, format);
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({
      url,
      filename: toSafeFilename(note.title, format),
      saveAs: options.saveAs ?? false,
      conflictAction: "uniquify",
    });
  } finally {
    // downloads API は内部で fetch するため即時 revoke しない (backup.ts と同じ方針)。
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
