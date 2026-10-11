import { useState } from "react";
import {
  acknowledgeSnapshot,
  restoreFromSnapshot,
  type Snapshot,
} from "../lib/db/snapshotRepo";
import { ConfirmDialog } from "./common/ConfirmDialog";

interface RecoveryBannerProps {
  snapshot: Snapshot;
  onDone: () => void;
}

// IndexedDB が作り直された（データが消えた）ときに表示する復元案内。
export function RecoveryBanner(props: RecoveryBannerProps) {
  const { snapshot, onDone } = props;
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restoreFromSnapshot();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setConfirmSkip(false);
    setBusy(true);
    try {
      await acknowledgeSnapshot();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sidememo-recovery-banner" role="alert">
      <p className="sidememo-recovery-banner__text">
        メモが見つからないため、前回のバックアップ（{new Date(snapshot.savedAt).toLocaleString("ja-JP")}・メモ {snapshot.notes.length} 件）から復元できます。
      </p>
      <div className="sidememo-recovery-banner__actions">
        <button
          type="button"
          className="sidememo-button sidememo-button--primary"
          onClick={() => void handleRestore()}
          disabled={busy}
        >
          復元する
        </button>
        <button
          type="button"
          className="sidememo-button"
          onClick={() => setConfirmSkip(true)}
          disabled={busy}
        >
          復元せずに続ける
        </button>
      </div>
      {error && <p className="sidememo-recovery-banner__error">{error}</p>}
      <ConfirmDialog
        open={confirmSkip}
        title="バックアップを上書きしますか？"
        message="復元せずに続けると、このバックアップは現在の内容で上書きされ、元に戻せなくなります。"
        confirmLabel="上書きする"
        destructive
        onConfirm={() => void handleSkip()}
        onCancel={() => setConfirmSkip(false)}
      />
    </div>
  );
}
