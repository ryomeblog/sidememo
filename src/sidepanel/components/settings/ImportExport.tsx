import { useRef, useState } from "react";
import {
  downloadExport,
  importAll,
  parseImportFile,
  type ExportPayload,
} from "../../lib/db/backup";
import { ConfirmDialog } from "../common/ConfirmDialog";

type ImportMode = "merge" | "replace";

export function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [pendingPayload, setPendingPayload] = useState<ExportPayload | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    try {
      await downloadExport();
      setStatus("エクスポートを開始しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      const payload = await parseImportFile(file);
      // replace 時は破壊的なので確認を挟む。merge は即時実行。
      if (mode === "replace") {
        setPendingPayload(payload);
      } else {
        const result = await importAll(payload, "merge");
        setStatus(
          `インポート完了 (メモ ${result.importedNotes} 件 / タグ ${result.importedTags} 件)`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // 同じファイルを再選択できるよう input をリセット
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingPayload) return;
    const payload = pendingPayload;
    setPendingPayload(null);
    try {
      const result = await importAll(payload, "replace");
      setStatus(
        `置き換えインポート完了 (メモ ${result.importedNotes} 件 / タグ ${result.importedTags} 件)`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="sidememo-import-export">
      <h3 className="sidememo-section__title">エクスポート / インポート</h3>
      <p className="sidememo-section__hint">
        メモとタグを JSON ファイルとして保存・復元できます。データはローカルのみで扱われます。
      </p>

      <div className="sidememo-import-export__row">
        <button
          type="button"
          className="sidememo-button sidememo-button--primary"
          onClick={() => void handleExport()}
        >
          エクスポート (JSON)
        </button>
      </div>

      <div className="sidememo-import-export__row">
        <fieldset className="sidememo-import-export__mode">
          <legend>インポート方式</legend>
          <label>
            <input
              type="radio"
              name="import-mode"
              value="merge"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
            />
            マージ (既存データに追加)
          </label>
          <label>
            <input
              type="radio"
              name="import-mode"
              value="replace"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            置き換え (既存データを削除して上書き)
          </label>
        </fieldset>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      {status && <div className="sidememo-import-export__status">{status}</div>}
      {error && <div className="sidememo-import-export__error">{error}</div>}

      <ConfirmDialog
        open={pendingPayload !== null}
        title="既存データを置き換えますか？"
        message={`現在の全メモ・全タグを削除し、ファイルの内容で置き換えます (メモ ${pendingPayload?.notes.length ?? 0} 件 / タグ ${pendingPayload?.tags.length ?? 0} 件)。この操作は取り消せません。`}
        confirmLabel="置き換える"
        destructive
        onConfirm={() => void handleConfirmReplace()}
        onCancel={() => setPendingPayload(null)}
      />
    </div>
  );
}
