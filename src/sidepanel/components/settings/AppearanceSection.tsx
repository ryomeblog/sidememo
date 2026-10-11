import type {
  SettingValues,
  ThemeMode,
  ToolbarVisibility,
} from "../../../types";
import * as settingsRepo from "../../lib/db/settingsRepo";

interface AppearanceSectionProps {
  settings: SettingValues;
}

const THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: "auto", label: "自動 (OS に従う)" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

const FONT_SIZES: SettingValues["fontSize"][] = [12, 13, 14, 16, 18];

const TOOLBAR_VIS: Array<{ value: ToolbarVisibility; label: string }> = [
  { value: "always", label: "常時表示" },
  { value: "auto-hide", label: "自動非表示 (ホバーで表示)" },
  { value: "hidden", label: "非表示" },
];

const DEBOUNCE: SettingValues["autosaveDebounceMs"][] = [250, 500, 1000];

export function AppearanceSection(props: AppearanceSectionProps) {
  const { settings } = props;

  return (
    <div className="sidememo-appearance">
      <h3 className="sidememo-section__title">外観・編集</h3>

      <label className="sidememo-field">
        <span className="sidememo-field__label">テーマ</span>
        <select
          value={settings.theme}
          onChange={(e) => {
            void settingsRepo.setSetting("theme", e.target.value as ThemeMode);
          }}
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="sidememo-field">
        <span className="sidememo-field__label">フォントサイズ</span>
        <select
          value={settings.fontSize}
          onChange={(e) => {
            const next = Number(e.target.value) as SettingValues["fontSize"];
            void settingsRepo.setSetting("fontSize", next);
          }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} px
            </option>
          ))}
        </select>
      </label>

      <label className="sidememo-field">
        <span className="sidememo-field__label">ツールバー表示</span>
        <select
          value={settings.toolbarVisibility}
          onChange={(e) => {
            void settingsRepo.setSetting(
              "toolbarVisibility",
              e.target.value as ToolbarVisibility,
            );
          }}
        >
          {TOOLBAR_VIS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="sidememo-field">
        <span className="sidememo-field__label">自動保存の遅延</span>
        <select
          value={settings.autosaveDebounceMs}
          onChange={(e) => {
            const next = Number(
              e.target.value,
            ) as SettingValues["autosaveDebounceMs"];
            void settingsRepo.setSetting("autosaveDebounceMs", next);
          }}
        >
          {DEBOUNCE.map((d) => (
            <option key={d} value={d}>
              {d} ms
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
