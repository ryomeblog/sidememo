import { useCallback, useEffect, useState } from "react";
import {
  getRecoveryState,
  saveSnapshotIfNeeded,
  type RecoveryState,
} from "../lib/db/snapshotRepo";

// 上書きバックアップの間隔。
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

// 起動時・一定間隔・サイドパネルを隠したときにスナップショットを上書きする。
// 復元待ち（IndexedDB が作り直された後）の状態を recovery で返す。
export function useSnapshotBackup(): {
  recovery: RecoveryState | null;
  refresh: () => Promise<void>;
} {
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);

  const refresh = useCallback(async () => {
    const state = await getRecoveryState();
    setRecovery(state);
    if (!state.pending) await saveSnapshotIfNeeded();
  }, []);

  useEffect(() => {
    const report = (error: unknown) => {
      console.error("Snapshot backup failed", error);
    };
    // 非同期取得の結果を反映するだけなので setState-in-effect は正当な用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch(report);

    const timer = setInterval(() => {
      void saveSnapshotIfNeeded().catch(report);
    }, BACKUP_INTERVAL_MS);

    const handleHidden = () => {
      if (document.visibilityState !== "hidden") return;
      void saveSnapshotIfNeeded().catch(report);
    };
    document.addEventListener("visibilitychange", handleHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleHidden);
    };
  }, [refresh]);

  return { recovery, refresh };
}
