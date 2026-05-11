import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { editorViewCtx, schemaCtx, serializerCtx } from "@milkdown/core";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface MilkdownEditorProps {
  // 初期値はマウント時のみ反映する。値が変わってもエディタは作り直さないため、
  // メモ切替時は親で `key={note.id}` を渡してアンマウント / 再マウントすること。
  initialValue: string;
  onChange: (markdown: string) => void;
  onReady?: (crepe: Crepe) => void;
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  const { initialValue, onChange, onReady } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let destroyed = false;
    const crepe = new Crepe({
      root,
      defaultValue: initialValueRef.current,
    });

    void crepe
      .create()
      .then(() => {
        if (destroyed) {
          void crepe.destroy();
          return;
        }
        // クリップボードへ書き出す text/plain を上書きする。
        // Milkdown / CommonMark プリセットは空段落を round-trip するため
        // markdown シリアライズ時に `<br />` を埋め込む（preset-commonmark の
        // paragraph.toMarkdown 参照）。既定の clipboardTextSerializer はその
        // markdown をそのままクリップボードに載せるため、外部アプリへ貼り付け
        // ると `<br />` が文字列として現れてしまう。シリアライズ後に `<br />`
        // を取り除き、末尾の余分な改行も整える。
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const schema = ctx.get(schemaCtx);
          const serializer = ctx.get(serializerCtx);
          view.setProps({
            clipboardTextSerializer: (slice) => {
              const doc = schema.topNodeType.createAndFill(
                undefined,
                slice.content,
              );
              if (!doc) return "";
              return serializer(doc)
                .replace(/<br\s*\/?>/g, "")
                .replace(/\n+$/, "");
            },
          });
        });
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown) => {
            onChangeRef.current(markdown);
          });
        });
        onReadyRef.current?.(crepe);
      })
      .catch((error: unknown) => {
        console.error("Milkdown initialization failed", error);
      });

    return () => {
      destroyed = true;
      void crepe.destroy();
    };
  }, []);

  return <div ref={containerRef} className="sidememo-milkdown" />;
}
