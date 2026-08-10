"use client";

/**
 * Остання межа: спрацьовує, коли падає сам root layout, і замінює собою весь
 * документ. Глобальні стилі сюди не доїжджають (див. документацію Next), тому
 * оформлення інлайнове — Tailwind-класи тут просто не застосувались би.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="uk">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          backgroundColor: "#ededed",
          color: "#111111",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>Помилка · Kotova Taping</title>

        <main
          style={{
            maxWidth: "460px",
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "28px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 400 }}>
            Щось пішло не так
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: "15px",
              lineHeight: 1.6,
              color: "#646464",
            }}
          >
            Сталася непередбачена помилка. Спробуйте перезавантажити сторінку.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "14px",
                color: "#646464",
              }}
            >
              Код: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: "20px",
              minHeight: "52px",
              width: "100%",
              cursor: "pointer",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#111111",
              color: "#ffffff",
              fontSize: "15px",
              fontFamily: "inherit",
            }}
          >
            Спробувати ще
          </button>
        </main>
      </body>
    </html>
  );
}
