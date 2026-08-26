"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

function ArrowGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The reference's signature control: a black pill whose label sits left and a
 * contrasting circular arrow sits right, inset into the pill.
 */
export function PillButton({
  href,
  onClick,
  children,
  tone = "dark",
  size = "md",
  className = "",
  "aria-label": ariaLabel,
}: {
  /** Renders a link. Omit and pass `onClick` to render a button instead. */
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  tone?: "dark" | "light";
  size?: "md" | "lg";
  className?: string;
  "aria-label"?: string;
}) {
  const dark = tone === "dark";
  const large = size === "lg";
  const cls = [
    "group inline-flex min-h-[56px] items-center rounded-full py-2 pr-2 text-[15px] transition-colors duration-200",
    // `lg` fixes the width so sibling buttons line up, and pushes the arrow
    // to the far edge. Height is unchanged.
    large ? "w-full justify-between gap-10 pl-8 sm:w-[300px]" : "gap-4 pl-7",
    dark
      ? "bg-ink text-white hover:bg-[#2a2a2a]"
      : "bg-white text-ink hover:bg-[#f3f3f3]",
    className,
  ].join(" ");

  const inner = (
    <>
      <span>{children}</span>
      <span
        className={[
          "grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-200",
          "group-hover:translate-x-0.5",
          dark ? "bg-white text-ink" : "bg-ink text-white",
        ].join(" ")}
      >
        <ArrowGlyph className="size-4" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${cls} cursor-pointer`}
    >
      {inner}
    </button>
  );
}

/**
 * Full-bleed section band. Sections run edge to edge and alternate background
 * so neighbouring bands stay visually separated.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  tone = "surface",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "footer";
  tone?: "surface" | "canvas" | "blush";
} & ComponentPropsWithoutRef<"section">) {
  // Фон задається лише тут: `bg-*` через className зіткнувся б із цим класом,
  // а переможця вирішував би порядок правил у CSS, а не порядок у рядку.
  const bg =
    tone === "canvas" ? "bg-canvas" : tone === "blush" ? "bg-blush" : "bg-surface";
  return (
    <Tag {...rest} className={`w-full ${bg} ${className}`}>
      {children}
    </Tag>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1360px] px-5 md:px-10 ${className}`}>
      {children}
    </div>
  );
}

/** Small slash-prefixed label, e.g. "/ Послуги". */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] text-ink-muted">
      <span aria-hidden="true">/ </span>
      {children}
    </p>
  );
}

/** Uppercase eyebrow that sits above a large heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
      {children}
    </p>
  );
}
