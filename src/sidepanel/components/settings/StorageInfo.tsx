import { useEffect, useState } from "react";

interface UsageState {
  usage?: number;
  quota?: number;
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

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    // 非同期フェッチ → 結果反映の典型パターン。setState-in-effect だが正当な用途。
    void navigator.storage
      .estimate()
      .then((est) => setInfo({ usage: est.usage, quota: est.quota }))
      .catch((error: unknown) => {
        console.warn("storage.estimate failed", error);
      });
  }, []);

  const percent =
    info.usage !== undefined && info.quota
      ? Math.min(100, (info.usage / info.quota) * 100)
      : null;

  return (
    <div className="sidememo-storage-info">
      <h3 className="sidememo-section__title">ストレージ</h3>
      <p className="sidememo-section__hint">
        拡張機能の権限（unlimitedStorage）により保存容量の上限は緩和されています。メモは 5 分ごとに別の保存領域へ自動バックアップされ、消えた場合は「バックアップから復元」で戻せます。ただし、アンインストールでは両方とも削除されるため、重要なデータは定期的にエクスポートしてください。
      </p>
      <div className="sidememo-storage-info__row">
        <span>使用量</span>
        <span>
          {formatBytes(info.usage)} / {formatBytes(info.quota)}
          {percent !== null && ` (${percent.toFixed(1)}%)`}
        </span>
      </div>
    </div>
  );
}
