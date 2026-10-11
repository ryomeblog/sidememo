import { useEffect, useState } from "react";
import {
  getBackupStatus,
  restoreFromBackup,
  type BackupStatus,
} from "../../lib/db/snapshotRepo";
import { ConfirmDialog } from "../common/ConfirmDialog";

// 自動バックアップからの手動復元。
// 既存のメモは残し、同じ ID のメモは更新日時が新しい方を採用する。
export function RestoreSection() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    getBackupStatus()
      .then(setStatus)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async () => {
    setConfirming(false);
    setError(null);
    setMessage(null);
    try {
      const result = await restoreFromBackup();
      setMessage(
        `復元完了 (メモ ${result.mergedNotes} 件 / タグ ${result.mergedTags} 件を追加・更新)`,
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const hasBackup = status !== null && status.backupNotes > 0;

  return (
    <div className="sidememo-restore">
      <h3 className="sidememo-section__title">バックアップから復元</h3>
      <p className="sidememo-section__hint">
        {status === null && "読み込み中..."}
        {status !== null && !hasBackup && "バックアップはまだありません。"}
        {status !== null &&
          hasBackup &&
          `最終バックアップ: ${status.savedAt ? new Date(status.savedAt).toLocaleString("ja-JP") : "-"}（メモ ${status.backupNotes} 件 / タグ ${status.backupTags} 件）`}
        {status !== null &&
          status.lostNotes.length > 0 &&
          ` ／ DB に無いメモ ${status.lostNotes.length} 件`}
      </p>
      <div className="sidememo-restore__row">
        <button
          type="button"
          className="sidememo-button"
          onClick={() => setConfirming(true)}
          disabled={!hasBackup}
        >
          バックアップから復元
        </button>
      </div>
      {message && <div className="sidememo-import-export__status">{message}</div>}
      {error && <div className="sidememo-import-export__error">{error}</div>}
      <ConfirmDialog
        open={confirming}
        title="バックアップから復元しますか？"
        message="バックアップのメモとタグを現在のデータに追加します。同じメモは更新日時が新しい方を残します。"
        confirmLabel="復元する"
        onConfirm={() => void handleRestore()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
