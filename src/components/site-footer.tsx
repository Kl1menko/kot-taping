import Link from "next/link";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { CATEGORIES } from "@/lib/services";
import { SocialIcon } from "./social-icons";
import { FooterBookLink } from "./footer-book-link";
import { Card, Container } from "./ui";

export function SiteFooter() {
  return (
    <Card as="footer" tone="canvas" className="py-16 md:py-20">
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
            <FooterBookLink />
          </nav>
        </div>
      </div>

      {/*
        Карта сайту в футері.

        Вона стоїть на кожній сторінці, тож будь-яка категорія за одне
        посилання і від людини, і від краулера — а той роздає вагу саме по
        посиланнях. Без цього блоку сторінки категорій висіли б на самому лише
        sitemap.xml, який відповідає на «що існує», але не на «що тут головне».
      */}
      <div className="mt-14 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
        <nav aria-label="Послуги">
          <h2 className="text-[14px] text-ink-muted">Послуги</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/poslugy/${cat.id}`}
                  className="text-[15px] underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Кабінети">
          <h2 className="text-[14px] text-ink-muted">Кабінети</h2>
          <ul className="mt-4 space-y-2">
            {LOCATIONS.map((location) => (
              <li key={location.slug}>
                <Link
                  href={`/mistsya/${location.slug}`}
                  className="text-[15px] underline-offset-4 transition-colors duration-200 hover:underline"
                >
                  {location.city}
                  <span className="text-ink-muted"> — {location.address}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-[13px] text-ink-muted">
        © {new Date().getFullYear()} Kotova Taping
      </p>
      </Container>
    </Card>
  );
}
