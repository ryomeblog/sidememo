import { useEffect, useState } from "react";
import {
  getSnapshot,
  restoreFromSnapshot,
  type Snapshot,
} from "../../lib/db/snapshotRepo";
import { ConfirmDialog } from "../common/ConfirmDialog";

// 自動バックアップ（chrome.storage.local の写し）からの手動復元。
// 既存のメモは残し、同じ ID のメモは更新日時が新しい方を採用する。
export function RestoreSection() {
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(
    undefined,
  );
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    getSnapshot()
      .then(setSnapshot)
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
    setStatus(null);
    try {
      const result = await restoreFromSnapshot();
      if (!result) {
        setStatus("復元できるバックアップがありません");
        return;
      }
      setStatus(
        `復元完了 (メモ ${result.mergedNotes} 件 / タグ ${result.mergedTags} 件を追加・更新)`,
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="sidememo-restore">
      <h3 className="sidememo-section__title">バックアップから復元</h3>
      <p className="sidememo-section__hint">
        {snapshot === undefined && "読み込み中..."}
        {snapshot === null && "バックアップはまだありません。"}
        {snapshot &&
          `最終バックアップ: ${new Date(snapshot.savedAt).toLocaleString("ja-JP")}（メモ ${snapshot.notes.length} 件 / タグ ${snapshot.tags.length} 件）`}
      </p>
      <div className="sidememo-restore__row">
        <button
          type="button"
          className="sidememo-button"
          onClick={() => setConfirming(true)}
          disabled={!snapshot}
        >
          バックアップから復元
        </button>
      </div>
      {status && <div className="sidememo-import-export__status">{status}</div>}
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
