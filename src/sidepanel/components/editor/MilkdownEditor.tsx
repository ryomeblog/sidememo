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
  // 初期化に失敗したときの通知。呼び出し側は自動保存を止める。
  onError?: () => void;
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  const { initialValue, onChange, onReady, onError } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // [修正] 以前は create() の解決を待たずに cleanup で destroy() を呼んでいたため、
    // メモの切替 / 削除直後のような高速な再マウントで初期化と破棄が競合し、
    // 「Milkdown initialization failed」→ 空のエディタ、という状態になり得た。
    // その状態で markdownUpdated が空文字を流すとメモ本文が消えるので、
    // create() の完了を待ってから destroy() するように直列化する。
    let destroyed = false;
    let createFailed = false;
    const crepe = new Crepe({
      root,
      defaultValue: initialValueRef.current,
    });

    const created = crepe
      .create()
      .then(() => {
        // 既に cleanup が走っている場合はセットアップを行わない。
        // destroy() は cleanup 側が created の解決後に 1 回だけ呼ぶので、
        // ここで destroy してはいけない（二重 destroy になる）。
        if (destroyed) return;
        // クリップボードへ書き出す text/plain を上書きする。
        // Milkdown / CommonMark プリセットは空段落を round-trip するため
        // markdown シリアライズ時に `<br />` を埋め込む（preset-commonmark の
        // paragraph.toMarkdown 参照）。また `mdast-util-to-markdown` は行頭の
        // `=` `#` `-` `>` などを setext / atx 見出しやリストと誤認されないよう
        // `\` を付けて出力する（unsafe.js 参照）。既定の clipboardTextSerializer
        // はその markdown をそのままクリップボードに載せるため、外部アプリへ
        // 貼り付けると `<br />` や `\=====` が文字列として現れてしまう。
        // CommonMark の backslash-escape ルール（`\` の直後の ASCII 約物は
        // literal 文字）に従って unescape し、`<br />` を取り除き、末尾の
        // 余分な改行も整える。
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
                .replace(/\\([!-/:-@[-`{-~])/g, "$1")
                .replace(/<br\s*\/?>/g, "")
                .replace(/\n+$/, "");
            },
          });
        });
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown) => {
            // 破棄フェーズで流れてくる更新は無視する。
            // ここを通すと「空のドキュメント」が保存されてしまう。
            if (destroyed) return;
            onChangeRef.current(markdown);
          });
        });
        onReadyRef.current?.(crepe);
      })
      .catch((error: unknown) => {
        console.error("Milkdown initialization failed", error);
        // 初期化に失敗したエディタからは絶対に保存させない。
        destroyed = true;
        createFailed = true;
        onErrorRef.current?.();
      });

    return () => {
      destroyed = true;
      // create() が解決してから destroy する（二重 destroy と競合を防ぐ）。
      // create 自体が失敗した場合は破棄するものが無いので何もしない。
      void created
        .then(() => {
          if (!createFailed) return crepe.destroy();
        })
        .catch((error: unknown) => {
          console.error("Milkdown destroy failed", error);
        });
    };
  }, []);

  return <div ref={containerRef} className="sidememo-milkdown" />;
}
