import Link from "next/link";
import { CONTACTS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { Card, Container } from "./ui";

export function SiteFooter() {
  return (
    <Card as="section" tone="canvas" className="py-16 md:py-20">
      <Container>
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[15px] leading-tight">
            Kotova
            <br />
            Taping
          </p>
          <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-ink-muted">
            Студія естетичного тейпування. Працюю за попереднім записом.
          </p>
        </div>

        <div className="flex flex-col gap-6 md:items-end">
          <nav aria-label="Соцмережі" className="flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${s.label} — ${s.handle}`}
                className="grid size-11 place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
              >
                <SocialIcon id={s.id} />
              </a>
            ))}
          </nav>

          <nav
            aria-label="Контакти"
            className="flex flex-wrap gap-x-8 gap-y-3 text-[15px] md:justify-end"
          >
            <a
              href={`mailto:${CONTACTS.email}`}
              className="text-ink-muted underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
            >
              {CONTACTS.email}
            </a>
            <Link
              href="#booking"
              className="text-ink-muted underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
            >
              Записатись
            </Link>
          </nav>
        </div>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-[13px] text-ink-muted">
        © {new Date().getFullYear()} Kotova Taping
      </p>
      </Container>
    </Card>
  );
}
