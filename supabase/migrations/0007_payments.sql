-- Оплата через monobank-еквайринг.
--
-- Рахунок — окрема сутність, а не поле `paid boolean` у записі. Причин три:
--
--  1. Рахунків на один запис буває кілька: перший протермінувався, клієнтка
--     попросила виставити новий. Поле зберегло б лише останній, а історія
--     «скільки разів виставляли й чому не вийшло» зникла б.
--  2. У рахунку є власний життєвий цикл (created → processing → success),
--     який рухає банк вебхуком, а не майстриня руками.
--  3. Платити можна і за процедуру, і за набір — дві різні таблиці. Спільна
--     таблиця оплат не змушує дублювати поля в обох.
--
-- Гроші тут не зберігаються й не проводяться: ми лише тримаємо посилання на
-- рахунок у банку та його останній відомий стан. Джерело правди — monobank.

create table payments (
  id          uuid primary key default gen_random_uuid(),

  -- За що платять. Рівно одне з двох посилань заповнене — див. check нижче.
  -- on delete cascade: рахунок без запису осиротів би, а історія оплат за
  -- видаленим записом нікому не потрібна.
  appointment_id uuid references appointments(id) on delete cascade,
  kit_order_id   uuid references kit_orders(id)   on delete cascade,

  -- Ідентифікатор рахунку в monobank. Приходить у відповіді на створення й
  -- далі є ключем, за яким банк присилає вебхуки.
  invoice_id  text not null unique,
  -- Сторінка оплати. З неї ж робиться QR — окремо картинку не зберігаємо,
  -- бо вона повністю виводиться з цього рядка.
  page_url    text not null,

  -- Копійки, як їх розуміє monobank: 2200 ₴ = 220000. Зберігаємо саме те,
  -- що відправили в банк, — інакше при звірці довелося б угадувати округлення.
  amount      integer not null check (amount > 0),
  ccy         integer not null default 980,

  -- Останній відомий стан. Список — з документації monobank; 'created' стоїть
  -- одразу після створення, решту приносить вебхук.
  status      text not null default 'created'
              check (status in ('created', 'processing', 'hold', 'success',
                                'failure', 'reversed', 'expired')),
  -- Чому не вдалося: банк дає код і людський опис. Обидва показуємо в адмінці,
  -- щоб майстриня розуміла, це відмова банку чи клієнтка передумала.
  failure_reason text,
  err_code       text,

  -- Коли рахунок перестає діяти. Показуємо в адмінці, щоб не надсилати
  -- клієнтці протермінований QR.
  expires_at  timestamptz,
  -- Момент успішної оплати — для аналітики й звірки. null, поки не оплачено.
  paid_at     timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Рахунок платиться або за процедуру, або за набір — але не за обидва
-- відразу й не «ні за що». Без цього обмеження осиротілий рядок було б видно
-- лише при читанні, а не при вставці.
alter table payments add constraint payments_one_target check (
  (appointment_id is not null and kit_order_id is null) or
  (appointment_id is null and kit_order_id is not null)
);

-- Пошук «які рахунки в цього запису» — головний запит екрана.
create index payments_appointment_idx on payments(appointment_id)
  where appointment_id is not null;
create index payments_kit_order_idx on payments(kit_order_id)
  where kit_order_id is not null;

-- Вебхук приходить із invoice_id і має знайти рядок за один пошук.
-- Окремий індекс не потрібен: unique вище вже його створив.

alter table payments enable row level security;

-- Policy немає — як і в решті таблиць: доступ лише з сервера під service-role.
-- У рядках лежить сума й посилання на оплату, тож анонімного читання бути не
-- може навіть попри те, що персональних даних тут немає.

-- Оновлення `updated_at` при кожній зміні: вебхуки приходять кілька разів на
-- рахунок, і без цього не видно, коли банк озвався востаннє.
create or replace function touch_payments_updated_at() returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger payments_touch_updated_at
  before update on payments
  for each row execute function touch_payments_updated_at();

-- Дзвіночок в адмінку: оплата приходить вебхуком, коли ніхто нічого не
-- натискав, — саме той випадок, заради якого існує 0003_realtime.
create trigger payments_ping
  after insert or update or delete on payments
  for each statement execute function notify_change();
