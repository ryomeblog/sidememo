import type { EditorMode, Note } from "../../../types";
import * as notesRepo from "../../lib/db/notesRepo";
import { captureActiveTab } from "../../lib/chrome/tabs";

interface PageRefBarProps {
  note: Note;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const VIEW_MODES: Array<{ value: EditorMode; label: string }> = [
  { value: "markdown", label: "Markdown" },
  { value: "plain", label: "テキスト" },
];

// 表示の切り替え（Markdown: リアルタイム整形 / テキスト: 入力した文字列をそのまま表示・保存）。
function ViewModeToggle(props: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const { mode, onChange } = props;
  return (
    <div className="sidememo-view-toggle" role="group" aria-label="表示形式">
      {VIEW_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          className={
            mode === m.value
              ? "sidememo-view-toggle__button sidememo-view-toggle__button--active"
              : "sidememo-view-toggle__button"
          }
          onClick={() => onChange(m.value)}
          aria-pressed={mode === m.value}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// 設計書 §5.7 — 「+ ページ添付」ボタン押下時のみ取り込む。自動取り込みは行わない。
export function PageRefBar(props: PageRefBarProps) {
  const { note, mode, onModeChange } = props;
  const ref = note.pageRef;

  const handleAttach = async () => {
    const captured = await captureActiveTab();
    if (!captured) {
      console.warn("Active tab not available");
      return;
    }
    await notesRepo.attachPage(note.id, captured);
  };

  const handleDetach = async () => {
    await notesRepo.detachPage(note.id);
  };

  const handleOpen = () => {
    if (ref?.url) {
      void chrome.tabs.create({ url: ref.url });
    }
  };

  const toggle = <ViewModeToggle mode={mode} onChange={onModeChange} />;

  if (!ref) {
    return (
      <div className="sidememo-page-ref">
        <button
          type="button"
          className="sidememo-button"
          onClick={() => void handleAttach()}
        >
          + ページ添付
        </button>
        <span className="sidememo-page-ref__spacer" />
        {toggle}
      </div>
    );
  }

  return (
    <div className="sidememo-page-ref">
      <button
        type="button"
        className="sidememo-page-ref__chip"
        onClick={handleOpen}
        title={ref.url}
      >
        {ref.favicon && (
          <img
            className="sidememo-page-ref__favicon"
            src={ref.favicon}
            alt=""
            width="14"
            height="14"
          />
        )}
        <span className="sidememo-page-ref__title">{ref.title || ref.url}</span>
      </button>
      <button
        type="button"
        className="sidememo-icon-button"
        onClick={() => void handleDetach()}
        title="ページ添付を解除"
        aria-label="ページ添付を解除"
      >
        ×
      </button>
      {toggle}
    </div>
  );
}
