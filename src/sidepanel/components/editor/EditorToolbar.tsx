import type { Crepe } from "@milkdown/crepe";
import type { Ctx } from "@milkdown/ctx";
import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx } from "@milkdown/kit/core";
import { callCommand } from "@milkdown/utils";
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  wrapInHeadingCommand,
  insertHrCommand,
} from "@milkdown/preset-commonmark";
import { toggleStrikethroughCommand } from "@milkdown/preset-gfm";
import type { CmdKey } from "@milkdown/kit/core";
import type { ToolbarVisibility } from "../../../types";

interface EditorToolbarProps {
  crepe: Crepe | null;
  visibility: ToolbarVisibility;
}

function focusEditor(editor: Editor) {
  editor.action((ctx: Ctx) => {
    const view = ctx.get(editorViewCtx);
    if (!view.hasFocus()) view.focus();
  });
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { crepe, visibility } = props;
  if (visibility === "hidden") return null;

  const run = <T,>(key: CmdKey<T>, payload?: T) => {
    if (!crepe) return;
    focusEditor(crepe.editor);
    crepe.editor.action(callCommand(key, payload));
  };

  const handleLink = () => {
    const href = window.prompt("リンク URL を入力");
    if (!href) return;
    run(toggleLinkCommand.key, { href });
  };

  const classes = ["sidememo-editor-toolbar"];
  if (visibility === "auto-hide") {
    classes.push("sidememo-editor-toolbar--auto-hide");
  }

  return (
    <div className={classes.join(" ")} role="toolbar" aria-label="書式ツールバー">
      <div className="sidememo-editor-toolbar__group" aria-label="見出し">
        <ToolbarButton
          label="H1"
          title="見出し 1"
          onClick={() => run(wrapInHeadingCommand.key, 1)}
        />
        <ToolbarButton
          label="H2"
          title="見出し 2"
          onClick={() => run(wrapInHeadingCommand.key, 2)}
        />
        <ToolbarButton
          label="H3"
          title="見出し 3"
          onClick={() => run(wrapInHeadingCommand.key, 3)}
        />
      </div>

      <div className="sidememo-editor-toolbar__group" aria-label="装飾">
        <ToolbarButton
          label="B"
          bold
          title="太字 (Ctrl+B)"
          onClick={() => run(toggleStrongCommand.key)}
        />
        <ToolbarButton
          label="I"
          italic
          title="斜体 (Ctrl+I)"
          onClick={() => run(toggleEmphasisCommand.key)}
        />
        <ToolbarButton
          label="S"
          strike
          title="取消線"
          onClick={() => run(toggleStrikethroughCommand.key)}
        />
      </div>

      <div className="sidememo-editor-toolbar__group" aria-label="リスト">
        <ToolbarButton
          label="•"
          title="箇条書き"
          onClick={() => run(wrapInBulletListCommand.key)}
        />
        <ToolbarButton
          label="1."
          title="番号付きリスト"
          onClick={() => run(wrapInOrderedListCommand.key)}
        />
      </div>

      <div className="sidememo-editor-toolbar__group" aria-label="挿入">
        <ToolbarButton
          label="🔗"
          title="リンク"
          onClick={handleLink}
        />
        <ToolbarButton
          label="</>"
          title="インラインコード"
          onClick={() => run(toggleInlineCodeCommand.key)}
        />
        <ToolbarButton
          label="❝"
          title="引用"
          onClick={() => run(wrapInBlockquoteCommand.key)}
        />
        <ToolbarButton
          label="―"
          title="区切り線"
          onClick={() => run(insertHrCommand.key)}
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}

function ToolbarButton(props: ToolbarButtonProps) {
  const { label, title, onClick, bold, italic, strike } = props;
  const style: React.CSSProperties = {};
  if (bold) style.fontWeight = 700;
  if (italic) style.fontStyle = "italic";
  if (strike) style.textDecoration = "line-through";
  return (
    <button
      type="button"
      className="sidememo-editor-toolbar__button"
      title={title}
      aria-label={title}
      style={style}
      // mousedown でフォーカス移動を抑止し、エディタからセレクションを失わない
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
