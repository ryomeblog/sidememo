import type { LayoutMode } from "../../../types";
import * as settingsRepo from "../../lib/db/settingsRepo";

interface LayoutModeSelectorProps {
  value: LayoutMode;
}

const OPTIONS: Array<{
  value: LayoutMode;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "自動",
    description: "幅 400px 以上で 2 ペイン、それ未満で 1 ペイン",
  },
  {
    value: "two-pane",
    label: "常時 2 ペイン",
    description: "一覧とエディタを並べて表示",
  },
  {
    value: "one-pane",
    label: "常時 1 ペイン",
    description: "一覧 / エディタをタブ切替",
  },
];

export function LayoutModeSelector(props: LayoutModeSelectorProps) {
  const { value } = props;

  const handleChange = (next: LayoutMode) => {
    void settingsRepo.setSetting("layoutMode", next);
  };

  return (
    <div className="sidememo-layout-selector">
      <h3 className="sidememo-section__title">レイアウト</h3>
      <div className="sidememo-layout-selector__cards">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={
                active
                  ? "sidememo-layout-card sidememo-layout-card--active"
                  : "sidememo-layout-card"
              }
              onClick={() => handleChange(opt.value)}
              aria-pressed={active}
            >
              <div className="sidememo-layout-card__label">{opt.label}</div>
              <div className="sidememo-layout-card__desc">{opt.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
