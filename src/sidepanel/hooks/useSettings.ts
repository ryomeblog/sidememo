import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db/index";
import { DEFAULT_SETTINGS, type SettingValues } from "../../types";

// 設定全体を IndexedDB から購読する。値が無いキーはデフォルトでフォールバック。
export function useSettings(): SettingValues {
  const settings = useLiveQuery(async () => {
    const rows = await db.settings.toArray();
    const merged = { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>;
    for (const row of rows) {
      if (row.key in merged) merged[row.key] = row.value;
    }
    return merged as unknown as SettingValues;
  }, []);
  return settings ?? DEFAULT_SETTINGS;
}
