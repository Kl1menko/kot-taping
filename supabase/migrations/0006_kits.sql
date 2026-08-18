-- Набори для самотейпування вдома: каталог і замовлення.
--
-- Це другий продукт студії, не процедура. У нього власний життєвий цикл —
-- оплата, відправлення, накладна — якого немає і не має бути в записів на
-- процедуру, тому таблиця окрема, а не поле в `requests`.
--
-- До цієї міграції спосіб 2 з маршруту клієнта не існував: посилання на
-- Google-форму лежало в коді, але на сайті не рендерилося ніде.

-- — Каталог —
-- Ціна керується з адмінки, тому набори — рядки в базі, а не константи.
create table kits (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  summary     text not null default '',
  price       integer not null default 0 check (price >= 0),
  -- Ціна залежить від параметрів — показуємо «від», як і в прайсі послуг.
  price_from  boolean not null default false,
  -- Зона визначає, що питати у формі: для шиї є вибір кольору, для обличчя
  -- потрібні заміри, а колір лише білий.
  zone        text not null check (zone in ('neck', 'face')),
  -- Чи можна обрати колір. Обличчя — лише білий, тож false.
  allows_color boolean not null default false,
  -- Чи потрібні заміри в сантиметрах. Для обличчя — так.
  needs_measurements boolean not null default false,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table kits enable row level security;

-- Види тейпування зі способу 2 маршруту.
insert into kits (slug, title, summary, zone, allows_color, needs_measurements, sort) values
  ('neck', 'Шия',
   'Набір для самостійного тейпування шиї. Колір на вибір.',
   'neck', true, false, 0),
  ('face-full', 'Обличчя повністю',
   'Чоло, рот і щоки — повний набір. Тейп білий.',
   'face', false, true, 1),
  ('face-forehead', 'Чоло',
   'Окрема зона: чоло. Тейп білий.',
   'face', false, true, 2),
  ('face-mouth', 'Рот',
   'Окрема зона: рот. Тейп білий.',
   'face', false, true, 3),
  ('face-cheeks', 'Щоки',
   'Окрема зона: щоки. Тейп білий.',
   'face', false, true, 4);

-- — Замовлення —
-- Статуси — це кроки ручної частини маршруту: зв'язатися → отримати оплату →
-- відправити. Далі замовлення закрите.
create type kit_order_status as enum ('new', 'confirmed', 'paid', 'shipped', 'cancelled');

create table kit_orders (
  id           uuid primary key default gen_random_uuid(),
  -- Slug, а не FK: замовлення має пережити зміну чи зняття набору з продажу —
  -- та сама причина, що й у `requests.service_slug`.
  kit_slug     text not null,
  name         text not null,
  phone        text not null,
  -- Куди писати. Ті самі канали, що й у заявці на процедуру.
  contact_channel contact_channel not null default 'telegram',
  contact_handle  text,

  -- Колір: лише для наборів на шию. Для обличчя лишається null — тейп білий.
  tape_color   text,
  -- Заміри для обличчя, вільним текстом: клієнти пишуть як завгодно, а читає
  -- їх людина.
  measurements text,

  -- Місто й країна — щоб одразу було видно, чи це worldwide-доставка: вона
  -- змінює вартість. Точну адресу майстриня бере в чаті вже після оплати, тож
  -- у базі до того моменту її немає.
  city         text not null,
  country      text not null default 'Україна',

  note         text,
  status       kit_order_status not null default 'new',
  -- Накладна для відстеження — з'являється на кроці відправлення.
  tracking     text,
  consent_at   timestamptz,
  created_at   timestamptz not null default now()
);

alter table kit_orders enable row level security;

create index kit_orders_status_created_idx
  on kit_orders (status, created_at desc);

-- Автооновлення адмінки — та сама механіка, що в міграції 0003: тригер пише
-- у службову таблицю, клієнт бачить сигнал і робить router.refresh().
create trigger kit_orders_ping
  after insert or update or delete on kit_orders
  for each statement execute function notify_change();
