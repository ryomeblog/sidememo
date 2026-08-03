import { useCallback, useEffect, useRef, useState } from "react";
import type { Crepe } from "@milkdown/crepe";
import { insert } from "@milkdown/utils";
import type { DownloadFormat, Note, Tag } from "../../../types";
import * as notesRepo from "../../lib/db/notesRepo";
import { downloadNote } from "../../lib/export/downloadNote";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";
import { useSettings } from "../../hooks/useSettings";
import { onInsertText } from "../../lib/insertionBus";
import { MilkdownEditor } from "./MilkdownEditor";
import { PlainTextEditor, type PlainTextEditorApi } from "./PlainTextEditor";
import { EditorToolbar } from "./EditorToolbar";
import { PageRefBar } from "./PageRefBar";
import { DownloadMenu } from "./DownloadMenu";

interface EditorContainerProps {
  note: Note;
  tags: Tag[];
  onRequestDelete: (note: Note) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// 親側で key={note.id} を渡しているため、メモ切替時にコンポーネントが
// 自動でアンマウント / 再マウントされる。エディタの初期値リロードもこれで成立する。
export function EditorContainer(props: EditorContainerProps) {
  const { note, tags, onRequestDelete } = props;
  const settings = useSettings();
  const mode = settings.editorMode;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [crepe, setCrepe] = useState<Crepe | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const plainApiRef = useRef<PlainTextEditorApi | null>(null);

  // 自動保存を止めるためのフラグ。
  // エディタの初期化に失敗した場合、そのエディタの内容（＝空）を
  // 保存してしまうとメモ本文が消えるので、保存経路ごと遮断する。
  const editorBrokenRef = useRef(false);
  // 最後に DB へ書き込んだ内容。同じ内容の無駄な書き込みを避ける。
  const lastSavedRef = useRef(note.content);
  // 進行中の保存。ダウンロード前に完了を待つために保持する。
  const savingRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    crepeRef.current = crepe;
  }, [crepe]);

  // 選択テキスト挿入の購読。エディタが ready になった後でのみ反応する。
  useEffect(() => {
    return onInsertText((text) => {
      if (plainApiRef.current) {
        plainApiRef.current.insertText(text);
        return;
      }
      const c = crepeRef.current;
      if (!c) return;
      c.editor.action(insert(text));
    });
  }, []);

  const persist = useDebouncedCallback((id: string, content: string) => {
    if (editorBrokenRef.current) return;
    if (content === lastSavedRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    savingRef.current = notesRepo
      .updateNote(id, { content })
      .then((updated) => {
        // updated === false は「保存しようとしたメモが既に削除されている」ケース。
        // 復活させずに黙って捨てる。
        if (updated) lastSavedRef.current = content;
        setStatus(updated ? "saved" : "idle");
      })
      .catch((e: unknown) => {
        console.error("Autosave failed", e);
        setStatus("error");
      });
  }, settings.autosaveDebounceMs);

  const handleChange = (value: string) => {
    if (editorBrokenRef.current) return;
    setStatus("saving");
    persist(note.id, value);
  };

  // [修正] アンマウント時に保留中の自動保存を確定させる。
  // 旧実装は保留中タイマーを破棄していたため、入力直後にメモを切り替える /
  // 削除する / サイドパネルを閉じると最後の入力が失われていた。
  useEffect(() => {
    const flush = () => persist.flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [persist]);

  const handleEditorError = useCallback(() => {
    editorBrokenRef.current = true;
    persist.cancel();
    setStatus("error");
  }, [persist]);

  const handleTogglePin = () => {
    void notesRepo.togglePin(note.id);
  };

  const handleToggleTag = (tagId: string) => {
    const next = note.tagIds.includes(tagId)
      ? note.tagIds.filter((t) => t !== tagId)
      : [...note.tagIds, tagId];
    void notesRepo.updateNote(note.id, { tagIds: next });
  };

  const handleDownload = (format: DownloadFormat) => {
    // 未保存の入力を先に確定させ、その保存の完了を待ってから
    // DB の最新状態を書き出す。flush() は保存を開始するだけなので、
    // 待たずに getNote すると 1 つ前の内容を書き出してしまう。
    persist.flush();
    void savingRef.current
      .then(() => notesRepo.getNote(note.id))
      .then((latest) => downloadNote(latest ?? note, format))
      .catch((e: unknown) => {
        console.error("Download failed", e);
      });
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
          <DownloadMenu onDownload={handleDownload} />
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
      {mode === "markdown" && (
        <EditorToolbar crepe={crepe} visibility={settings.toolbarVisibility} />
      )}

      <div className="sidememo-editor__body">
        {mode === "plain" ? (
          <PlainTextEditor
            key="plain"
            initialValue={note.content}
            onChange={handleChange}
            onReady={(api) => {
              plainApiRef.current = api;
            }}
          />
        ) : (
          <MilkdownEditor
            key="markdown"
            initialValue={note.content}
            onChange={handleChange}
            onReady={setCrepe}
            onError={handleEditorError}
          />
        )}
      </div>

      <div className="sidememo-editor__status">
        {status === "saving" && <span>保存中...</span>}
        {status === "saved" && <span>保存しました</span>}
        {status === "error" && (
          <span className="sidememo-editor__status-error">
            エディタの初期化に失敗しました。自動保存を停止しています。メモを開き直してください。
          </span>
        )}
      </div>
    </div>
  );
}
