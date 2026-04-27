import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    title,
    message,
    confirmLabel = "OK",
    cancelLabel = "キャンセル",
    onConfirm,
    onCancel,
    destructive = false,
  } = props;

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      confirmButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="sidememo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="sidememo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-confirm-title"
        aria-describedby="sm-confirm-message"
      >
        <h2 id="sm-confirm-title" className="sidememo-modal__title">
          {title}
        </h2>
        <p id="sm-confirm-message" className="sidememo-modal__message">
          {message}
        </p>
        <div className="sidememo-modal__actions">
          <button
            type="button"
            className="sidememo-button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={
              destructive
                ? "sidememo-button sidememo-button--danger"
                : "sidememo-button sidememo-button--primary"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
