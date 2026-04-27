import type { Note } from "../../../types";
import * as notesRepo from "../../lib/db/notesRepo";
import { captureActiveTab } from "../../lib/chrome/tabs";

interface PageRefBarProps {
  note: Note;
}

// 設計書 §5.7 — 「+ ページ添付」ボタン押下時のみ取り込む。自動取り込みは行わない。
export function PageRefBar(props: PageRefBarProps) {
  const { note } = props;
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
    </div>
  );
}
