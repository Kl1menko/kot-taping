"use client";

import type { ReactNode } from "react";
import { useBookingModal } from "./booking-modal";
import { PillButton } from "./ui";

/**
 * Pill button that opens the booking sheet instead of navigating.
 * Pass `service` to preselect that service in the form.
 */
export function BookNowButton({
  children,
  service,
  tone = "dark",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  service?: string;
  tone?: "dark" | "light";
  size?: "md" | "lg";
  className?: string;
  "aria-label"?: string;
}) {
  const { open } = useBookingModal();
  return (
    <PillButton
      onClick={() => open(service)}
      tone={tone}
      size={size}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </PillButton>
  );
}
