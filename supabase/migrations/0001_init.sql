-- Внутрішня система студії Kotova Taping.
--
-- Доступ до всіх таблиць — виключно з сервера під service-role ключем. RLS
-- увімкнено без жодної policy: це закриває таблиці для anon/authenticated
-- ролей (service-role обходить RLS за визначенням). У базі лежать телефони
-- клієнтів і нотатки про здоров'я, тому анонімного читання бути не може.

create extension if not exists "pgcrypto";

-- — Довідник послуг —
-- Джерело правди для прайсу. Початкові рядки перенесені з src/lib/services.ts.
create table services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  summary     text not null default '',
  -- Гривні, цілими. Разом із price_from дає «від 2200 ₴».
  price       integer not null check (price >= 0),
  price_from  boolean not null default false,
  wear        text,
  badge       text,
  category    text not null,
  tone        text not null default 'sand' check (tone in ('sand', 'clay', 'blush')),
  -- Скільки часу блокує в календарі. Прайс тривалість не фіксує, тому 60 хв
  -- як робоча заготовка — майстер поправить у адмінці.
  duration_min integer not null default 60 check (duration_min > 0),
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index services_category_sort_idx on services (category, sort);

-- — Клієнти —
-- Телефон нормалізується до цифр (+380XXXXXXXXX) перед записом, тому unique
-- на ньому справді ловить повторний візит тієї ж людини.
create table clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null unique,
  email      text,
  -- Протипоказання, особливості шкіри, домовленості. Чутливе поле.
  notes      text,
  created_at timestamptz not null default now()
);

-- — Записи (журнал майстра) —
create type appointment_status as enum ('planned', 'done', 'cancelled', 'no_show');

create table appointments (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete restrict,
  -- Послугу не видаляємо, а деактивуємо, тож restrict тут теж доречний:
  -- історія записів має лишатись читабельною.
  service_id   uuid not null references services (id) on delete restrict,
  starts_at    timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  -- Ціна фіксується на момент запису: прайс зміниться, а історія доходу ні.
  price        integer not null check (price >= 0),
  status       appointment_status not null default 'planned',
  note         text,
  source       text not null default 'manual' check (source in ('manual', 'site')),
  created_at   timestamptz not null default now()
);

create index appointments_starts_at_idx on appointments (starts_at);
create index appointments_client_idx on appointments (client_id, starts_at desc);

-- — Заявки з сайту —
-- Намір, а не подія. Живе окремо від appointments: заявка може так і не стати
-- записом, і саме це співвідношення дає конверсію.
create type request_status as enum ('new', 'converted', 'declined');

create table requests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text not null,
  -- Slug, а не FK: заявка має пережити перейменування чи видалення послуги.
  service_slug   text not null,
  preferred_date date,
  note           text,
  status         request_status not null default 'new',
  -- Заповнюється, коли майстер перетворює заявку на запис.
  appointment_id uuid references appointments (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index requests_status_created_idx on requests (status, created_at desc);

-- — Редагований контент лендінгу —
create table faq_items (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null,
  sort         integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create table testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null,
  author       text not null,
  detail       text,
  sort         integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Фото «до/після». Публікується лише з дозволу клієнта — is_published
-- за замовчуванням false саме тому.
create table results (
  id           uuid primary key default gen_random_uuid(),
  before_url   text not null,
  after_url    text not null,
  caption      text,
  sort         integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

-- — Замок —
alter table services     enable row level security;
alter table clients      enable row level security;
alter table appointments enable row level security;
alter table requests     enable row level security;
alter table faq_items    enable row level security;
alter table testimonials enable row level security;
alter table results      enable row level security;
