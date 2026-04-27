import type { Note } from "../../types";
import { NoteListItem } from "./NoteListItem";

interface NoteListProps {
  notes: Note[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NoteList(props: NoteListProps) {
  const { notes, selectedId, onSelect } = props;

  if (notes === undefined) {
    return <div className="sidememo-list-empty">読み込み中...</div>;
  }
  if (notes.length === 0) {
    return (
      <div className="sidememo-list-empty">
        メモがありません。「+ 新規」で作成してください。
      </div>
    );
  }

  return (
    <ul className="sidememo-list" role="list">
      {notes.map((note) => (
        <NoteListItem
          key={note.id}
          note={note}
          selected={note.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
