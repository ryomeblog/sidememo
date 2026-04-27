import type { Note } from "../../types";

interface NoteListItemProps {
  note: Note;
  selected: boolean;
  onSelect: (id: string) => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear
    ? `${date.getMonth() + 1}/${date.getDate()}`
    : date.toLocaleDateString("ja-JP");
}

function getPreview(content: string, title: string): string {
  // 1 行目 (タイトル抽出元) を除いた最初の非空行を簡易プレビューにする
  const lines = content.split(/\r?\n/);
  let firstNonEmpty = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      firstNonEmpty = i;
      break;
    }
  }
  if (firstNonEmpty < 0) return "(空)";
  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) return trimmed;
  }
  // 1 行しかなく、それがタイトル行の場合
  if (title === "無題" && firstNonEmpty >= 0) {
    return lines[firstNonEmpty].trim();
  }
  return "(空)";
}

export function NoteListItem(props: NoteListItemProps) {
  const { note, selected, onSelect } = props;
  const isEmpty = note.content.trim().length === 0;
  const preview = isEmpty ? "(空)" : getPreview(note.content, note.title);

  const classes = ["sidememo-list-item"];
  if (selected) classes.push("sidememo-list-item--selected");
  if (note.pinned === 1) classes.push("sidememo-list-item--pinned");
  if (isEmpty) classes.push("sidememo-list-item--empty");

  return (
    <li>
      <button
        type="button"
        className={classes.join(" ")}
        onClick={() => onSelect(note.id)}
        aria-current={selected ? "true" : undefined}
      >
        <div className="sidememo-list-item__title">
          {note.pinned === 1 && (
            <span aria-label="ピン留め" title="ピン留め">
              📌
            </span>
          )}
          <span>{note.title || "無題"}</span>
        </div>
        <div className="sidememo-list-item__meta">
          <span className="sidememo-list-item__preview">{preview}</span>
          <span className="sidememo-list-item__time">
            {formatTimestamp(note.updatedAt)}
          </span>
        </div>
      </button>
    </li>
  );
}
