"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Background loop for the hero. Muted + playsInline so mobile browsers allow
 * autoplay; falls back to the poster frame when the user prefers reduced
 * motion, and offers a manual play control in that case.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) {
        ref.current?.pause();
        setPlaying(false);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 size-full object-cover"
        poster="/video/hero-poster.jpg"
        autoPlay={!reduced}
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="Сеанс лімфодренажного тейпування у студії"
      >
        {/* Small screens get the lighter 480px encode */}
        <source
          src="/video/hero-mobile.webm"
          type="video/webm"
          media="(max-width: 767px)"
        />
        <source
          src="/video/hero-mobile.mp4"
          type="video/mp4"
          media="(max-width: 767px)"
        />
        <source src="/video/hero.webm" type="video/webm" />
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Pause/play control — required so motion is never forced on the user. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Зупинити відео" : "Відтворити відео"}
        className="absolute left-5 top-5 z-10 grid size-11 place-items-center rounded-full bg-white/80 text-ink backdrop-blur transition-colors duration-200 hover:bg-white md:left-8 md:top-8"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
