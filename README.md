# Kotova Taping

Сайт і внутрішня система студії естетичного тейпування: лендінг із записом та
адмінка, у якій майстриня веде календар, клієнтів і прайс.

Next.js 16 (App Router), React 19, Tailwind 4, Supabase (Postgres).

## Запуск

```bash
npm install
cp .env.example .env.local   # заповнити — див. нижче
npm run dev
```

Лендінг — http://localhost:3000, адмінка — http://localhost:3000/admin.

## Змінні оточення

Усі серверні змінні читає `src/lib/env.ts` і падає на старті, якщо чогось
бракує. Опис кожної — у `.env.example`; коротко:

| Змінна | Обов'язкова | Призначення |
| --- | --- | --- |
| `SUPABASE_URL` | так | Проєкт Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | так | Доступ у обхід RLS, **лише сервер** |
| `SESSION_SECRET` | так | Підпис сесії адмінки, ≥32 символи |
| `ADMIN_PASSWORD_HASH` | так | Хеш пароля, не пароль |
| `TELEGRAM_BOT_TOKEN` | ні | Сповіщення про заявки |
| `TELEGRAM_CHAT_ID` | ні | Куди слати сповіщення |
| `NEXT_PUBLIC_SITE_URL` | на проді | Канонічна адреса для OG, sitemap, schema.org |

Пароль адміна:

```bash
npm run admin:hash -- 'ваш-пароль'   # вивід у ADMIN_PASSWORD_HASH
```

`NEXT_PUBLIC_SITE_URL` на Vercel можна не задавати — тоді береться
`VERCEL_PROJECT_PRODUCTION_URL`. Але зі своїм доменом задати варто: інакше
canonical вказуватиме на `*.vercel.app`.

## База даних

Міграції в `supabase/migrations/` виконуються по порядку в SQL-редакторі
Supabase (або через `supabase db push`).

```bash
npm run db:seed   # прайс і контент лендінгу з коду в базу
npm run db:demo   # демо-записи на місяць, щоб побачити інтерфейс живим
```

`db:demo` створює вигадані записи — на робочій базі його запускати не треба.

Доступ до таблиць — виключно з сервера під service-role ключем. RLS увімкнено
без жодної policy, тож для anon-ролі таблиці закриті: у базі лежать телефони
клієнтів і нотатки про здоров'я.

## Перевірки

```bash
npm run lint
npm test          # юніт-тести календаря та аналітики
npm run build
```

## Структура

```
src/app/          маршрути: лендінг, /admin/*, metadata-файли
src/components/   секції лендінгу; admin/ — екрани адмінки
src/lib/          домен: services, calendar, analytics, db/, auth/
supabase/         міграції
scripts/          хеш пароля, seed
```

Домен живе в `src/lib` і не залежить від React — тому `calendar.ts` та
`analytics.ts` покриті тестами без рендера.

## Деплой

Vercel: підключити репозиторій, додати змінні оточення, виконати міграції на
проді. Адмінка закрита проксі (`src/proxy.ts`) і перевіркою сесії в кожній
сторінці та Server Action; `/admin` віддається з `noindex` і `no-store`.
