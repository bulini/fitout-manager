"use client";
import { useEffect } from "react";
import { XIcon } from "./Icons";

/** Pannello che sale dal basso su mobile; su desktop diventa una finestra centrata. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 md:hidden" />
        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Chiudi">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
