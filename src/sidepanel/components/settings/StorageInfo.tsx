import { useEffect, useState } from "react";
import { requestPersistence } from "../../lib/storage";

interface UsageState {
  usage?: number;
  quota?: number;
  persisted?: boolean;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function StorageInfo() {
  const [info, setInfo] = useState<UsageState>({});
  const [requesting, setRequesting] = useState(false);

  const refresh = async () => {
    const next: UsageState = {};
    if (navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        next.usage = est.usage;
        next.quota = est.quota;
      } catch (error) {
        console.warn("storage.estimate failed", error);
      }
    }
    if (navigator.storage?.persisted) {
      try {
        next.persisted = await navigator.storage.persisted();
      } catch (error) {
        console.warn("storage.persisted failed", error);
      }
    }
    setInfo(next);
  };

  useEffect(() => {
    // 非同期フェッチ → 結果反映の典型パターン。setState-in-effect だが正当な用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  const handleRequestPersist = async () => {
    setRequesting(true);
    try {
      await requestPersistence();
      await refresh();
    } finally {
      setRequesting(false);
    }
  };

  const percent =
    info.usage !== undefined && info.quota
      ? Math.min(100, (info.usage / info.quota) * 100)
      : null;

  return (
    <div className="sidememo-storage-info">
      <h3 className="sidememo-section__title">ストレージ</h3>
      <p className="sidememo-section__hint">
        IndexedDB はストレージ逼迫時にブラウザから削除される可能性があります。重要なデータは定期的にエクスポートしてください。
      </p>
      <div className="sidememo-storage-info__row">
        <span>使用量</span>
        <span>
          {formatBytes(info.usage)} / {formatBytes(info.quota)}
          {percent !== null && ` (${percent.toFixed(1)}%)`}
        </span>
      </div>
      <div className="sidememo-storage-info__row">
        <span>永続化</span>
        <span>{info.persisted ? "有効" : "未許可"}</span>
      </div>
      {!info.persisted && (
        <button
          type="button"
          className="sidememo-button"
          onClick={() => void handleRequestPersist()}
          disabled={requesting}
        >
          永続化を要求
        </button>
      )}
    </div>
  );
}
