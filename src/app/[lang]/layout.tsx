import { notFound } from "next/navigation";
import { HtmlLang } from "@/components/html-lang";
import { LOCALES, isLocale } from "@/lib/i18n";

/**
 * Мовний сегмент.
 *
 * Власної розмітки майже не додає: `<html>` і `<body>` лишаються в кореневому
 * layout, бо під ним живуть і маршрути поза `[lang]` — адмінка, /payment,
 * 404. Єдиний виняток — атрибут `lang` на `<html>`, який виставляє `HtmlLang`.
 *
 * `generateStaticParams` дозволяє зібрати обидві мови статично: сторінки і
 * так статичні з `revalidate`, і без цього переліку Next рендерив би їх на
 * запит, втративши весь виграш прередеру.
 */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  // Невідома мова в URL (/de, /fr) — це 404, а не тихий відкат на українську:
  // інакше кожен випадковий префікс став би дублем головної для пошуковика.
  if (!isLocale(lang)) notFound();

  return (
    <>
      <HtmlLang locale={lang} />
      {children}
    </>
  );
}
