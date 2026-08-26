"use client";

import { useEffect, useState } from "react";
import { useBookingModal } from "./booking-modal";
import type { Dictionary } from "@/lib/dictionary";

/**
 * Sticky booking bar for small screens. Appears once the user scrolls past the
 * hero and hides again while the booking form itself is on screen.
 */
export function MobileCta({ t }: { t: Dictionary }) {
  const [visible, setVisible] = useState(false);
  const { open } = useBookingModal();

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      const form = document.getElementById("booking");
      const formOnScreen = form
        ? form.getBoundingClientRect().top < window.innerHeight
        : false;
      setVisible(past && !formOnScreen);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-40 p-4 md:hidden",
        "transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]",
        "pb-[calc(1rem+env(safe-area-inset-bottom))]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      ].join(" ")}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={() => open()}
        tabIndex={visible ? undefined : -1}
        className="flex w-full min-h-[56px] cursor-pointer items-center justify-between gap-4 rounded-full bg-ink py-2 pl-7 pr-2 text-[15px] text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]"
      >
        {t.booking.cta}
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink">
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
    </div>
  );
}
