import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, Eyebrow, PillButton } from "@/components/ui";
import { CATEGORIES } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";

/**
 * Сторінка 404.
 *
 * Next і без неї віддає правильний статус, але порожній екран — це глухий кут:
 * людина з пошуку чи зі старого посилання просто йде. Тому тут є куди
 * натиснути, і саме ті посилання, які веде далі до запису.
 *
 * `noindex` обов'язковий: без нього Google може лишити сторінку у видачі як
 * «м'яку 404».
 */
export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main">
      <Card as="section" tone="canvas" className="py-24 md:py-32">
        <Container>
          <Eyebrow>Помилка 404</Eyebrow>
          <h1 className="mt-6 max-w-[20ch] text-[36px] leading-[1.05] sm:text-[48px] lg:text-[60px]">
            Такої сторінки немає
          </h1>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-muted">
            Можливо, адреса застаріла або в ній помилка. Ось те, що шукають
            найчастіше.
          </p>

          <div className="mt-10">
            <PillButton href="/" size="lg">
              На головну
            </PillButton>
          </div>

          <nav aria-label="Послуги" className="mt-14">
            <h2 className="text-[15px] text-ink-muted">
              <span aria-hidden="true">/ </span>Послуги
            </h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/poslugy/${cat.id}`}
                    className="inline-flex min-h-[48px] items-center rounded-full bg-surface px-6 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Кабінети" className="mt-10">
            <h2 className="text-[15px] text-ink-muted">
              <span aria-hidden="true">/ </span>Кабінети
            </h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {LOCATIONS.map((location) => (
                <li key={location.slug}>
                  <Link
                    href={`/mistsya/${location.slug}`}
                    className="inline-flex min-h-[48px] items-center rounded-full bg-surface px-6 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                  >
                    {location.city}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </Card>
    </main>
  );
}
