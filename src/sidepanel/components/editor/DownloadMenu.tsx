import { useEffect, useRef, useState } from "react";
import type { DownloadFormat } from "../../../types";

interface DownloadMenuProps {
  onDownload: (format: DownloadFormat) => void;
  disabled?: boolean;
}

const FORMATS: Array<{ value: DownloadFormat; label: string }> = [
  { value: "md", label: "Markdown (.md)" },
  { value: "txt", label: "テキスト (.txt)" },
];

export function DownloadMenu(props: DownloadMenuProps) {
  const { onDownload, disabled = false } = props;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="sidememo-download" ref={wrapperRef}>
      <button
        type="button"
        className="sidememo-icon-button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="ダウンロード"
        aria-label="このメモをダウンロード"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⬇
      </button>
      {open && (
        <div className="sidememo-download__menu" role="menu">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="menuitem"
              className="sidememo-download__item"
              onClick={() => {
                setOpen(false);
                onDownload(f.value);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
