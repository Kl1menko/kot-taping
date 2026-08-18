import type { Metadata } from "next";
import { Card, Container, PillButton, SectionLabel } from "@/components/ui";
import { CONTACTS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "@/components/social-icons";

/**
 * Куди повертається людина після оплати.
 *
 * Сторінка навмисно нічого не стверджує про результат: monobank повертає сюди
 * і після успіху, і після відмови, а правду про статус приносить вебхук —
 * асинхронно й пізніше. Написати тут «Дякуємо, оплачено!» означало б збрехати
 * тому, у кого платіж не пройшов.
 *
 * `noindex`: службова сторінка, у видачі їй робити нічого.
 */
export const metadata: Metadata = {
  title: "Оплата",
  robots: { index: false, follow: false },
};

export default function PaymentDone() {
  return (
    <main id="main">
      <Card as="section" tone="canvas" className="py-24 md:py-32">
        <Container>
          <SectionLabel>Оплата</SectionLabel>
          <h1 className="mt-8 max-w-[20ch] text-[34px] leading-[1.1] sm:text-[44px]">
            Дякую! Платіж обробляється
          </h1>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-muted">
            Банк надішле підтвердження на вашу картку, а я побачу оплату в
            системі за кілька секунд. Якщо щось пішло не так — напишіть мені,
            розберемося.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <PillButton href="/" size="lg">
              На головну
            </PillButton>

            <nav aria-label="Зв'язатися" className="flex flex-wrap gap-2">
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
          </div>

          <p className="mt-8 text-[15px] text-ink-muted">
            Питання щодо оплати —{" "}
            <a
              href={`tel:${CONTACTS.phone}`}
              className="underline underline-offset-4 hover:text-ink"
            >
              {CONTACTS.phoneDisplay}
            </a>
          </p>
        </Container>
      </Card>
    </main>
  );
}
