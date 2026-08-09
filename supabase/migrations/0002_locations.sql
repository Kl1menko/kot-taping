-- Два кабінети студії: Львів і Київ.
--
-- Запис має знати, де він відбувається: без цього календар змішував би два
-- міста в один потік, а аналітика не розділила б виручку по кабінетах.

create table locations (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  city       text not null,
  address    text not null,
  phone      text,
  sort       integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table locations enable row level security;

insert into locations (slug, city, address, phone, sort) values
  ('lviv', 'Львів', 'вул. Зелена, 204б', '+380506568341', 0),
  ('kyiv', 'Київ',  'просп. Берестейський, 67А', '+380506568341', 1);

-- Спершу дозволяємо null, щоб проставити наявним записам значення, і лише
-- потім робимо колонку обов'язковою — інакше міграція впала б на непорожній
-- таблиці.
alter table appointments
  add column location_id uuid references locations (id) on delete restrict;

update appointments
   set location_id = (select id from locations where slug = 'lviv')
 where location_id is null;

alter table appointments
  alter column location_id set not null;

create index appointments_location_starts_idx
  on appointments (location_id, starts_at);

-- Заявка з сайту може називати бажаний кабінет; null — «будь-який».
alter table requests
  add column location_slug text;
