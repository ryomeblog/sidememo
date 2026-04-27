import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
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
