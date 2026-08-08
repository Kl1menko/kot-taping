"use client";

import { useEffect, useState } from "react";

const DURATION = 1000;

/**
 * White intro screen with the wordmark. Paints before hydration (the markup is
 * server-rendered and hidden via CSS animation), so there is no flash of the
 * page underneath. It self-removes after DURATION, and the CSS animation also
 * hides it on its own if JS never runs.
 */
export function Preloader() {
  // Reading the media query lazily keeps the server render (and therefore the
  // first paint) identical for everyone; the CSS hides `.preloader` outright
  // for reduced-motion users, so there is no flash before this resolves.
  const [done, setDone] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (done) return;

    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      setDone(true);
      document.body.style.overflow = "";
    }, DURATION);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [done]);

  if (done) return null;

  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader__mark">
        <span className="preloader__line">Kotova</span>
        <span className="preloader__line preloader__line--2">Taping</span>
      </div>
    </div>
  );
}
