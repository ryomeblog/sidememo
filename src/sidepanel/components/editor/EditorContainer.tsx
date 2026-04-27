import { useEffect, useRef, useState } from "react";
import type { Crepe } from "@milkdown/crepe";
import { insert } from "@milkdown/utils";
import type { Note, Tag } from "../../../types";
import * as notesRepo from "../../lib/db/notesRepo";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";
import { useSettings } from "../../hooks/useSettings";
import { onInsertText } from "../../lib/insertionBus";
import { MilkdownEditor } from "./MilkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { PageRefBar } from "./PageRefBar";

interface EditorContainerProps {
  note: Note;
  tags: Tag[];
  onRequestDelete: (note: Note) => void;
}

type SaveStatus = "idle" | "saving" | "saved";

// 親側で key={note.id} を渡しているため、メモ切替時にコンポーネントが
// 自動でアンマウント / 再マウントされる。Milkdown の初期値リロードもこれで成立する。
export function EditorContainer(props: EditorContainerProps) {
  const { note, tags, onRequestDelete } = props;
  const settings = useSettings();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [crepe, setCrepe] = useState<Crepe | null>(null);
  const crepeRef = useRef<Crepe | null>(null);

  // 選択テキスト挿入の購読。crepe が ready になった後でのみ反応する。
  useEffect(() => {
    crepeRef.current = crepe;
  }, [crepe]);

  useEffect(() => {
    return onInsertText((text) => {
      const c = crepeRef.current;
      if (!c) return;
      c.editor.action(insert(text));
    });
  }, []);

  const persist = useDebouncedCallback(
    async (id: string, content: string) => {
      setStatus("saving");
      await notesRepo.updateNote(id, { content });
      setStatus("saved");
    },
    settings.autosaveDebounceMs,
  );

  const handleChange = (value: string) => {
    setStatus("saving");
    persist(note.id, value);
  };

  const handleTogglePin = () => {
    void notesRepo.togglePin(note.id);
  };

  const handleToggleTag = (tagId: string) => {
    const next = note.tagIds.includes(tagId)
      ? note.tagIds.filter((t) => t !== tagId)
      : [...note.tagIds, tagId];
    void notesRepo.updateNote(note.id, { tagIds: next });
  };

  return (
    <div className="sidememo-editor">
      <div className="sidememo-editor__meta-bar">
        <div className="sidememo-editor__tag-chips">
          {tags.length === 0 && (
            <span className="sidememo-editor__tag-empty">
              タグがありません
            </span>
          )}
          {tags.map((tag) => {
            const active = note.tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={
                  active
                    ? "sidememo-tag-chip sidememo-tag-chip--active"
                    : "sidememo-tag-chip"
                }
                style={
                  active
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => handleToggleTag(tag.id)}
                aria-pressed={active}
                aria-label={
                  active
                    ? `タグ「${tag.name}」を外す`
                    : `タグ「${tag.name}」を付ける`
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        <div className="sidememo-editor__meta-actions">
          <button
            type="button"
            className={
              note.pinned === 1
                ? "sidememo-icon-button sidememo-icon-button--active"
                : "sidememo-icon-button"
            }
            onClick={handleTogglePin}
            title={note.pinned === 1 ? "ピン留めを解除" : "ピン留め"}
            aria-label={note.pinned === 1 ? "ピン留めを解除" : "ピン留め"}
            aria-pressed={note.pinned === 1}
          >
            📌
          </button>
          <button
            type="button"
            className="sidememo-icon-button sidememo-icon-button--danger"
            onClick={() => onRequestDelete(note)}
            title="削除"
            aria-label="メモを削除"
          >
            🗑
          </button>
        </div>
      </div>

      <PageRefBar note={note} />
      <EditorToolbar crepe={crepe} visibility={settings.toolbarVisibility} />

      <div className="sidememo-editor__body">
        <MilkdownEditor
          initialValue={note.content}
          onChange={handleChange}
          onReady={setCrepe}
        />
      </div>

      <div className="sidememo-editor__status">
        {status === "saving" && <span>保存中...</span>}
        {status === "saved" && <span>保存しました</span>}
      </div>
    </div>
  );
}
