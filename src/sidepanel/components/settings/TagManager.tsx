import { useState } from "react";
import type { Tag } from "../../../types";
import * as tagsRepo from "../../lib/db/tagsRepo";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface TagManagerProps {
  tags: Tag[];
}

const PRESET_COLORS = [
  "#7F77DD",
  "#1D9E75",
  "#D85A30",
  "#E5A23E",
  "#3D8FE0",
  "#C44A8B",
  "#5A7A8C",
];

export function TagManager(props: TagManagerProps) {
  const { tags } = props;
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("タグ名を入力してください");
      return;
    }
    if (tags.some((t) => t.name === trimmed)) {
      setError("同じ名前のタグが既に存在します");
      return;
    }
    setError(null);
    await tagsRepo.createTag(trimmed, newColor);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("タグ名を入力してください");
      return;
    }
    if (tags.some((t) => t.name === trimmed && t.id !== editingId)) {
      setError("同じ名前のタグが既に存在します");
      return;
    }
    await tagsRepo.updateTag(editingId, { name: trimmed, color: editColor });
    cancelEdit();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await tagsRepo.deleteTag(id);
  };

  return (
    <div className="sidememo-tag-manager">
      <h3 className="sidememo-section__title">タグ管理</h3>
      <p className="sidememo-section__hint">
        タグの作成 / 編集 / 削除ができます。タグを削除しても、メモ自体は残ります。
      </p>

      <ul className="sidememo-tag-manager__list">
        {tags.map((tag) => {
          const editing = editingId === tag.id;
          return (
            <li key={tag.id} className="sidememo-tag-manager__item">
              {editing ? (
                <>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <input
                    className="sidememo-tag-manager__name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="タグ名"
                  />
                  <button
                    type="button"
                    className="sidememo-button sidememo-button--primary"
                    onClick={() => void saveEdit()}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="sidememo-button"
                    onClick={cancelEdit}
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="sidememo-tag-manager__swatch"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                  <span className="sidememo-tag-manager__name">{tag.name}</span>
                  <button
                    type="button"
                    className="sidememo-button"
                    onClick={() => startEdit(tag)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="sidememo-button sidememo-button--danger"
                    onClick={() => setPendingDelete(tag)}
                  >
                    削除
                  </button>
                </>
              )}
            </li>
          );
        })}
        {tags.length === 0 && (
          <li className="sidememo-tag-manager__empty">タグがありません</li>
        )}
      </ul>

      <div className="sidememo-tag-manager__create">
        <ColorPicker value={newColor} onChange={setNewColor} />
        <input
          className="sidememo-tag-manager__name-input"
          placeholder="新しいタグ名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          aria-label="新しいタグ名"
        />
        <button
          type="button"
          className="sidememo-button sidememo-button--primary"
          onClick={() => void handleCreate()}
        >
          + 追加
        </button>
      </div>
      {error && <div className="sidememo-tag-manager__error">{error}</div>}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="タグを削除しますか？"
        message={
          pendingDelete
            ? `「${pendingDelete.name}」を削除します。このタグはすべてのメモから取り除かれます。`
            : ""
        }
        confirmLabel="削除"
        destructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="sidememo-tag-manager__colors" role="radiogroup" aria-label="タグの色">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          className={
            value === color
              ? "sidememo-tag-manager__color sidememo-tag-manager__color--active"
              : "sidememo-tag-manager__color"
          }
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          title={color}
        />
      ))}
    </div>
  );
}
