import { useCallback, useEffect, useState } from "react";
import { getBackupStatus, runBackup } from "../lib/db/snapshotRepo";

// バックアップの間隔。
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

// 起動時・一定間隔・サイドパネルを隠したときにバックアップを実行する。
// DB から消えたメモ（バックアップにあるのに DB に無いもの）の件数を lostCount で返す。
export function useSnapshotBackup(): {
  lostCount: number;
  refresh: () => Promise<void>;
} {
  const [lostCount, setLostCount] = useState(0);

  const refresh = useCallback(async () => {
    await runBackup();
    const status = await getBackupStatus();
    setLostCount(status.lostNotes.length);
  }, []);

  useEffect(() => {
    const report = (error: unknown) => {
      console.error("Backup failed", error);
    };
    // 非同期取得の結果を反映するだけなので setState-in-effect は正当な用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch(report);

    const timer = setInterval(() => {
      void refresh().catch(report);
    }, BACKUP_INTERVAL_MS);

    const handleHidden = () => {
      if (document.visibilityState !== "hidden") return;
      void refresh().catch(report);
    };
    document.addEventListener("visibilitychange", handleHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleHidden);
    };
  }, [refresh]);

  return { lostCount, refresh };
}
