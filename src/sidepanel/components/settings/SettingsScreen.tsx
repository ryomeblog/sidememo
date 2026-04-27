import type { SettingValues, Tag } from "../../../types";
import { TagManager } from "./TagManager";
import { LayoutModeSelector } from "./LayoutModeSelector";
import { AppearanceSection } from "./AppearanceSection";
import { ImportExport } from "./ImportExport";
import { StorageInfo } from "./StorageInfo";

interface SettingsScreenProps {
  tags: Tag[];
  settings: SettingValues;
  onClose: () => void;
}

export function SettingsScreen(props: SettingsScreenProps) {
  const { tags, settings, onClose } = props;
  return (
    <div className="sidememo-settings">
      <header className="sidememo-settings__header">
        <button
          type="button"
          className="sidememo-button"
          onClick={onClose}
          aria-label="設定を閉じる"
        >
          ← 戻る
        </button>
        <h2 className="sidememo-settings__title">設定</h2>
      </header>
      <div className="sidememo-settings__body">
        <LayoutModeSelector value={settings.layoutMode} />
        <AppearanceSection settings={settings} />
        <TagManager tags={tags} />
        <ImportExport />
        <StorageInfo />
      </div>
    </div>
  );
}
