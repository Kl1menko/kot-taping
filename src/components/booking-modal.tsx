"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BookingForm } from "./booking-form";
import type { Service } from "@/lib/services";
import type { WorkingDay } from "@/lib/schedule";

type BookingModalContext = {
  /** Opens the sheet, optionally preselecting a service by slug. */
  open: (service?: string) => void;
};

const Ctx = createContext<BookingModalContext | null>(null);

/** Opens the booking sheet from anywhere on the page. */
export function useBookingModal() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useBookingModal must be used inside <BookingModalProvider>");
  }
  return ctx;
}

export function BookingModalProvider({
  children,
  services,
  schedule = {},
}: {
  children: ReactNode;
  /** Прайс із бази — той самий список, що й у картках послуг. */
  services: Service[];
  /** Робочі дні по кабінетах: slug → відкриті дні. Порожньо — запис закрито. */
  schedule?: Record<string, WorkingDay[]>;
}) {
  const [service, setService] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Remember what had focus so we can restore it on close.
  const restoreRef = useRef<HTMLElement | null>(null);

  const open = useCallback((slug?: string) => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    setService(slug);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    restoreRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;

      // Trap focus inside the dialog.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <div className="absolute inset-0 flex justify-center sm:items-center sm:p-6">
            {/* Full screen on phones — no rounded edges or gaps to break on
                short viewports; a centred card from `sm` up. */}
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-modal-title"
              className="relative flex h-dvh w-full flex-col bg-surface sm:h-auto sm:max-h-[92dvh] sm:max-w-[560px] sm:rounded-[28px] sm:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.45)]"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
                <div>
                  <p className="text-[15px] text-ink-muted">
                    <span aria-hidden="true">/ </span>Запис
                  </p>
                  <h2
                    id="booking-modal-title"
                    className="mt-2 text-[24px] leading-tight sm:text-[28px]"
                  >
                    Залиште заявку
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Закрити"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-canvas text-ink transition-colors duration-200 hover:bg-line"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-8">
                <BookingForm
                  services={services}
                  schedule={schedule}
                  preselected={service}
                  onDone={close}
                  fullWidthSubmit
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
