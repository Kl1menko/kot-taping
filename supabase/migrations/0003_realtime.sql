-- Сповіщення адмінки про зміни в реальному часі.
--
-- Задача: коли з сайту прилітає заявка або майстер міняє запис з іншого
-- пристрою, відкрита адмінка має оновитись сама, без F5.
--
-- Головне обмеження — з 0001_init: у таблицях лежать телефони й нотатки про
-- здоров'я, тож анонімного читання бути не може. Тому підписка НЕ дає доступу
-- до рядків: замість policy на appointments/clients/requests заводимо окрему
-- порожню таблицю-дзвіночок. У неї пишуть тригери, вона не містить нічого,
-- крім назви таблиці й часу, і саме її слухає браузер.
--
-- Отримавши сигнал, клієнт лише викликає router.refresh() — дані, як і
-- раніше, читає сервер під service-role після перевірки сесії. Витоку немає
-- навіть якщо anon-ключ хтось дістане: усе, що він побачить, — це факт
-- «у таблиці appointments щось змінилось».

create table realtime_pings (
  id         bigint generated always as identity primary key,
  -- Яка саме таблиця змінилась: клієнт вирішує, чи його це стосується.
  source     text not null,
  changed_at timestamptz not null default now()
);

alter table realtime_pings enable row level security;

-- Єдина policy на читання в усій базі — і вона нічого не відкриває, бо в
-- таблиці немає персональних даних за побудовою.
create policy "anon may read pings"
  on realtime_pings for select
  to anon
  using (true);

-- Писати може лише сервер (service-role обходить RLS) і тригери.
-- Жодної policy на insert/update/delete навмисно немає.

create index realtime_pings_changed_idx on realtime_pings (changed_at desc);

create or replace function notify_change() returns trigger
  language plpgsql
  security definer
  -- Явний search_path: без нього security definer — відома діра, бо виклик
  -- можна перехопити через підставлену схему.
  set search_path = public
as $$
begin
  insert into realtime_pings (source) values (tg_table_name);
  return null; -- after-тригер, значення не використовується
end;
$$;

create trigger appointments_ping
  after insert or update or delete on appointments
  for each statement execute function notify_change();

create trigger requests_ping
  after insert or update or delete on requests
  for each statement execute function notify_change();

create trigger clients_ping
  after insert or update or delete on clients
  for each statement execute function notify_change();

create trigger services_ping
  after insert or update or delete on services
  for each statement execute function notify_change();

-- Дзвіночок у публікацію; самі таблиці з даними туди НЕ додаємо.
alter publication supabase_realtime add table realtime_pings;

-- Таблиця службова й нескінченно росте, тож чистимо на кожній сотій вставці.
-- Тримати історію сигналів немає сенсу: вони цінні лише в момент появи.
create or replace function trim_realtime_pings() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if (random() < 0.01) then
    delete from realtime_pings
     where changed_at < now() - interval '1 hour';
  end if;
  return null;
end;
$$;

create trigger realtime_pings_trim
  after insert on realtime_pings
  for each statement execute function trim_realtime_pings();
