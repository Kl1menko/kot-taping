"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades a section in on first scroll into view.
 *
 * Starts visible and only hides itself once the effect confirms both JS and
 * IntersectionObserver are available — so no-JS and older browsers always see
 * the content. Honours prefers-reduced-motion by skipping the animation.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Already in view on load (e.g. deep link) — leave it visible.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return;

    setShown(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
