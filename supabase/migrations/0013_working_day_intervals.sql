-- Кілька відрізків часу в межах одного робочого дня.
--
-- До цієї міграції день описувався парою `opens_at`/`closes_at` — рівно одним
-- проміжком. Це не описувало звичайний робочий день майстрині: вона приймає
-- зранку, їде на обід чи на виїзд, повертається на вечір. Одним відрізком
-- 10:00–19:00 форма пропонувала запис і на 14:00, коли кабінет порожній, —
-- і заявку доводилось переузгоджувати листуванням, заради скорочення якого
-- графік і заводили.
--
-- Відрізки — окрема таблиця, а не масив у колонці: `exclude` нижче боронить їх
-- від перекриття, а на масиві таку перевірку довелось би писати в застосунку
-- і сподіватись, що жоден шлях запису її не обійде.

create table if not exists working_day_intervals (
  id             uuid primary key default gen_random_uuid(),
  -- Відрізок без дня сенсу не має, і закриття дня має забирати їх усі.
  working_day_id uuid not null references working_days (id) on delete cascade,
  opens_at       time not null,
  closes_at      time not null,
  created_at     timestamptz not null default now(),

  -- Та сама перевірка, що й на дні: 14:00–14:00 це не відрізок нульової
  -- довжини, а помилка вводу.
  constraint working_day_intervals_order check (closes_at > opens_at)
);

-- Перенос: кожен наявний день дає свій єдиний відрізок. Робимо це до того, як
-- колонки дня стануть похідними, — інакше графік, уже заведений майстринею,
-- зник би з форми запису.
--
-- `not exists` робить крок повторюваним: перший запуск цієї міграції впав на
-- неіснуючому `timerange` уже після створення таблиці, тож у базі лишились і
-- таблиця, і перенесені рядки. Без цієї умови повтор задублював би кожен день
-- другим таким самим відрізком — і впав би вже на `exclude`.
insert into working_day_intervals (working_day_id, opens_at, closes_at)
select d.id, d.opens_at, d.closes_at
  from working_days d
 where not exists (
   select 1 from working_day_intervals i where i.working_day_id = d.id
 );

-- Відрізки одного дня не перекриваються: 10:00–14:00 і 13:00–18:00 — це той
-- самий 13:00 у двох відрізках, і сітка часу показала б його двічі.
-- `gist` із `btree_gist`, бо звичайний unique діапазони не вміє.
create extension if not exists btree_gist;

-- Готового `timerange` у Postgres немає, а `tsrange` тягнув би за собою дату.
-- Тому зводимо час до хвилин від опівночі — рівно те, чим його вважає
-- застосунок (див. `parseTime` у src/lib/schedule.ts), — і беремо `numrange`.
--
-- `immutable` тут чесне: `time` не залежить ні від зони, ні від дати, тож
-- значення виразу незмінне, а без цієї позначки індекс його не прийме.
create or replace function time_to_minutes(t time) returns numeric as $$
  select extract(epoch from t) / 60;
$$ language sql immutable strict;

-- `drop` перед `add`: у Postgres немає `add constraint if not exists`, а
-- міграцію треба вміти дограти після падіння посередині.
alter table working_day_intervals
  drop constraint if exists working_day_intervals_no_overlap;

alter table working_day_intervals
  add constraint working_day_intervals_no_overlap
  exclude using gist (
    working_day_id with =,
    -- `[)`: кінець відрізка не належить йому. Інакше 10:00–14:00 і 14:00–18:00
    -- лічилися б перекриттям, хоч це звичайний робочий день без перерви.
    numrange(
      time_to_minutes(opens_at),
      time_to_minutes(closes_at),
      '[)'
    ) with &&
  );

-- Форма питає відрізки завжди разом із днем.
create index if not exists working_day_intervals_day_idx
  on working_day_intervals (working_day_id, opens_at);

alter table working_day_intervals enable row level security;
-- Policy немає навмисно: як і решту таблиць, графік читають із сервера під
-- service-role — і адмінка, і публічна форма.

-- Дзвіночок адмінці: змінений з іншого пристрою графік має підтягнутись сам.
drop trigger if exists working_day_intervals_ping on working_day_intervals;
create trigger working_day_intervals_ping
  after insert or update or delete on working_day_intervals
  for each statement execute function notify_change();

-- `working_days.opens_at`/`closes_at` лишаємо, але тепер це межі дня цілком —
-- найраніший початок і найпізніший кінець серед відрізків. Тримає їх тригер, а
-- не застосунок: писати відрізки можна з кількох місць, і кожне мусило б
-- пам'ятати про перерахунок.
--
-- Колонки не викидаємо, бо на них стоїть `working_days_hours_order` і за ними
-- зручно читати день без джойна там, де самі відрізки не потрібні.
create or replace function sync_working_day_hours() returns trigger as $$
declare
  target uuid := coalesce(new.working_day_id, old.working_day_id);
  lo time;
  hi time;
begin
  select min(opens_at), max(closes_at) into lo, hi
    from working_day_intervals where working_day_id = target;

  -- Останній відрізок прибрали: день лишається відкритим, але порожнім.
  -- Ставимо типові межі, щоб не порушити `closes_at > opens_at`; форма такий
  -- день не покаже, бо сітку часу вона будує з відрізків.
  update working_days
     set opens_at  = coalesce(lo, time '10:00'),
         closes_at = coalesce(hi, time '18:00')
   where id = target;

  return null;
end;
$$ language plpgsql;

drop trigger if exists working_day_intervals_sync on working_day_intervals;
create trigger working_day_intervals_sync
  after insert or update or delete on working_day_intervals
  for each row execute function sync_working_day_hours();
