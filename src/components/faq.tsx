import { Card, Container, SectionLabel } from "./ui";

/**
 * PLACEHOLDER COPY — general information, not medical advice. Review and
 * correct every answer before publishing, especially the contraindications.
 */
export const FAQ_ITEMS = [
  {
    q: "Скільки носити тейп після сеансу?",
    a: "Зазвичай від 8 годин до 2 діб — залежить від схеми та зони. Точний час я називаю наприкінці сеансу й показую, як зняти тейп без подразнення шкіри.",
  },
  {
    q: "Чи можна з тейпами спати й приймати душ?",
    a: "Так. Матеріал водостійкий: душ, сон і легке тренування тейпу не завадять. Уникати варто лише гарячої сауни та інтенсивного тертя зони.",
  },
  {
    q: "Скільки сеансів потрібно, щоб побачити результат?",
    a: "Набряк і свіжість помітні вже після першого сеансу, але тримаються недовго. Для стійкого ефекту потрібен курс — зазвичай 8–10 сеансів із періодичністю 2–3 рази на тиждень.",
  },
  {
    q: "Які є протипоказання?",
    a: "Пошкодження та запалення шкіри в зоні роботи, алергія на акрил, гострі стани, тромбоз, онкозахворювання, вагітність — усе це обговорюємо до сеансу. За наявності хронічних діагнозів попередньо порадьтеся з лікарем.",
  },
  {
    q: "Це боляче?",
    a: "Ні. Тейп накладається без натягу або з мінімальним натягом, відчувається як легкий дотик тканини до шкіри.",
  },
  {
    q: "Чи поєднується тейпування з косметологією?",
    a: "Поєднується з масажем і доглядовими процедурами. Після ін'єкцій та апаратних процедур потрібна пауза — її тривалість залежить від процедури, тому попередьте мене про них заздалегідь.",
  },
];

export function Faq() {
  return (
    <Card as="section" id="faq" tone="canvas" className="py-20 md:py-28">
      <Container>
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>Питання</SectionLabel>
          <h2 className="mt-8 max-w-[16ch] text-[30px] leading-[1.15] sm:text-[38px]">
            Що варто знати до першого сеансу
          </h2>
        </div>

        <div className="divide-y divide-line border-t border-line">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[18px] leading-snug [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-transform duration-200 group-open:rotate-45"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
      </Container>
    </Card>
  );
}
