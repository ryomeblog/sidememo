import { db } from "./index";
import { DEFAULT_SETTINGS, type SettingValues } from "../../../types";

type SettingKey = keyof SettingValues;

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingValues[K]> {
  const row = await db.settings.get(key);
  if (!row) return DEFAULT_SETTINGS[key];
  return row.value as SettingValues[K];
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValues[K],
): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings(): Promise<SettingValues> {
  const rows = await db.settings.toArray();
  const values = { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>;
  for (const row of rows) {
    if (row.key in values) {
      values[row.key] = row.value;
    }
  }
  return values as unknown as SettingValues;
}
