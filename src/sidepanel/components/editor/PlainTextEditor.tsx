import { useEffect, useRef } from "react";

export interface PlainTextEditorApi {
  insertText: (text: string) => void;
  focus: () => void;
}

interface PlainTextEditorProps {
  // Milkdown 版と同じ契約：初期値はマウント時のみ反映する。
  // メモ切替時は親で key={note.id} を渡して再マウントすること。
  initialValue: string;
  onChange: (text: string) => void;
  onReady?: (api: PlainTextEditorApi) => void;
}

// プレーンテキストモード用のエディタ。
// Markdown のリアルタイム整形・シリアライズを一切通さないので、
// 入力した文字列がそのまま content として保存される。
export function PlainTextEditor(props: PlainTextEditorProps) {
  const { initialValue, onChange, onReady } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    onReadyRef.current?.({
      insertText: (text: string) => {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = el.value.slice(0, start) + text + el.value.slice(end);
        el.value = next;
        const caret = start + text.length;
        el.setSelectionRange(caret, caret);
        el.focus();
        onChange(next);
      },
      focus: () => el.focus(),
    });
    // onChange は毎レンダー同一とは限らないが、insertText 内で参照するのは
    // 呼び出し時点の最新クロージャで十分なため依存に含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      ref={textareaRef}
      className="sidememo-plaintext"
      defaultValue={initialValue}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      aria-label="メモ本文 (プレーンテキスト)"
      placeholder="ここに入力…"
    />
  );
}
