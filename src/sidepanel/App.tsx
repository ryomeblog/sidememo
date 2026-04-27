import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { NoteList } from "./components/NoteList";
import { TagFilterBar } from "./components/TagFilterBar";
import { EditorContainer } from "./components/editor/EditorContainer";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { useNote } from "./hooks/useNotes";
import { useTags } from "./hooks/useTags";
import { useSearch } from "./hooks/useSearch";
import { useLayoutMode } from "./hooks/useLayoutMode";
import { useSettings } from "./hooks/useSettings";
import { useInsertionListener } from "./hooks/useInsertionListener";
import * as notesRepo from "./lib/db/notesRepo";
import { emitInsertText } from "./lib/insertionBus";
import type { Note } from "../types";

type Pane = "list" | "editor";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePane, setActivePane] = useState<Pane>("list");

  const settings = useSettings();
  const layout = useLayoutMode();
  const tags = useTags() ?? [];
  const notes = useSearch(searchQuery, selectedTagIds);

  // テーマ・フォントサイズを HTML root に反映
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "auto") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);

  // 「ユーザー選択 ID が存在しなければ先頭にフォールバック」をレンダー時に派生する。
  const effectiveSelectedId = (() => {
    if (!notes || notes.length === 0) return null;
    if (selectedId && notes.some((n) => n.id === selectedId)) {
      return selectedId;
    }
    return notes[0].id;
  })();

  const selectedNote = useNote(effectiveSelectedId);

  const handleSelectNote = (id: string) => {
    setSelectedId(id);
    if (layout === "one-pane") setActivePane("editor");
  };

  const handleNewNote = async () => {
    const note = await notesRepo.createNote({
      tagIds: selectedTagIds.length === 1 ? [selectedTagIds[0]] : [],
    });
    setSelectedId(note.id);
    if (layout === "one-pane") setActivePane("editor");
  };

  // キーボードショートカット
  // - Ctrl+N で新規作成
  // - Esc で設定画面を閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void handleNewNote();
        return;
      }
      if (e.key === "Escape" && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // handleNewNote captures latest selectedTagIds & layout via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds, layout, settingsOpen]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await notesRepo.deleteNote(id);
    if (layout === "one-pane") setActivePane("list");
  };

  const handleToggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  // Service Worker から渡る選択テキスト挿入要求 (§5.8)。
  // - 開いているメモがあれば bus 経由でカーソル位置に挿入
  // - 無ければ新規メモを作成して本文に格納
  useInsertionListener((text) => {
    if (effectiveSelectedId) {
      if (layout === "one-pane") setActivePane("editor");
      emitInsertText(text);
      return;
    }
    void notesRepo.createNote({ content: text }).then((created) => {
      setSelectedId(created.id);
      if (layout === "one-pane") setActivePane("editor");
    });
  });

  const showList = layout === "two-pane" || activePane === "list";
  const showEditor = layout === "two-pane" || activePane === "editor";

  const sidebarClass =
    layout === "two-pane"
      ? "sidememo-app__sidebar"
      : "sidememo-app__sidebar sidememo-app__sidebar--full";

  const editorClass =
    layout === "two-pane"
      ? "sidememo-app__editor"
      : "sidememo-app__editor sidememo-app__editor--full";

  return (
    <div className={`sidememo-app sidememo-app--${layout}`}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewNote={() => void handleNewNote()}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {showList && (
        <TagFilterBar
          tags={tags}
          selectedTagIds={selectedTagIds}
          onToggle={handleToggleTagFilter}
          onClear={() => setSelectedTagIds([])}
        />
      )}
      <div className="sidememo-app__body">
        {showList && (
          <aside className={sidebarClass}>
            <NoteList
              notes={notes}
              selectedId={effectiveSelectedId}
              onSelect={handleSelectNote}
            />
          </aside>
        )}
        {showEditor && (
          <section className={editorClass}>
            {layout === "one-pane" && (
              <div className="sidememo-editor__back">
                <button
                  type="button"
                  className="sidememo-button"
                  onClick={() => setActivePane("list")}
                >
                  ← 戻る
                </button>
              </div>
            )}
            {selectedNote ? (
              <EditorContainer
                key={selectedNote.id}
                note={selectedNote}
                tags={tags}
                onRequestDelete={setPendingDelete}
              />
            ) : (
              <div className="sidememo-editor-empty">
                {notes && notes.length === 0
                  ? "条件に一致するメモがありません。"
                  : "メモを選択してください。"}
              </div>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="メモを削除しますか？"
        message={
          pendingDelete
            ? `「${pendingDelete.title || "無題"}」を削除します。この操作は取り消せません。`
            : ""
        }
        confirmLabel="削除"
        destructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      {settingsOpen && (
        <div className="sidememo-app__overlay">
          <SettingsScreen
            tags={tags}
            settings={settings}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
