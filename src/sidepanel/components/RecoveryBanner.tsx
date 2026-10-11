import { useState } from "react";
import { discardLostNotes, restoreFromBackup } from "../lib/db/snapshotRepo";
import { ConfirmDialog } from "./common/ConfirmDialog";

interface RecoveryBannerProps {
  lostCount: number;
  onDone: () => void;
}

// バックアップにあるのに DB に無いメモ（データが消えたもの）がある場合の復元案内。
export function RecoveryBanner(props: RecoveryBannerProps) {
  const { lostCount, onDone } = props;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
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
        メモが {lostCount} 件見つかりません。バックアップから復元できます。
      </p>
      <div className="sidememo-recovery-banner__actions">
        <button
          type="button"
          className="sidememo-button sidememo-button--primary"
          onClick={() => void run(restoreFromBackup)}
          disabled={busy}
        >
          復元する
        </button>
        <button
          type="button"
          className="sidememo-button"
          onClick={() => setConfirmDiscard(true)}
          disabled={busy}
        >
          無視する
        </button>
      </div>
      {error && <p className="sidememo-recovery-banner__error">{error}</p>}
      <ConfirmDialog
        open={confirmDiscard}
        title="見つからないメモを無視しますか？"
        message="無視すると、バックアップからもこれらのメモが消え、元に戻せなくなります。"
        confirmLabel="無視する"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          void run(discardLostNotes);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}
