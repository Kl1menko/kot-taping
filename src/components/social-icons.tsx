import type { SocialId } from "@/lib/contacts";

/** Brand glyphs, drawn to sit on a 24px grid like the rest of the icon set. */
const PATHS: Record<SocialId, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  telegram: <path d="M21 4.5L2.8 11.4l5.1 1.7 1.9 5.9 2.7-3.3 4.6 3.4L21 4.5zM7.9 13.1L21 4.5l-9.5 10.6-.2 3.9" />,
  tiktok: (
    <path d="M15.5 3.5c.4 2.1 1.9 3.6 4 3.9v2.9c-1.6 0-3-.5-4.1-1.3v5.6c0 3.2-2.5 5.4-5.4 5.4A5.4 5.4 0 0 1 4.6 14a5.4 5.4 0 0 1 5.9-5.3v3a2.4 2.4 0 1 0 2 2.4V3.5h3z" />
  ),
  facebook: (
    <path d="M14.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.5V4.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H9v3h2.7V21" />
  ),
};

export function SocialIcon({
  id,
  className = "size-[18px]",
}: {
  id: SocialId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
