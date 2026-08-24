-- Години роботи в межах робочого дня.
--
-- У 0008 день описувався трьома проміжками (`slots`: ранок/день/вечір). Це
-- давало орієнтир, але не розклад: «вечір» — це і 16:00, і 19:30, тож точний
-- час усе одно узгоджувався листуванням, заради скорочення якого графік і
-- заводили.
--
-- Тепер день має початок і кінець, а проміжки рахуються з них — див.
-- `slotsFromHours` у src/lib/schedule.ts. Одне джерело правди: години й
-- проміжки більше не можуть розійтися, бо другого немає в базі.
--
-- Дані з `slots` переносимо, а не викидаємо: на момент міграції графік уже міг
-- бути заведений. Межі беремо крайні серед відмічених проміжків (ранок 9,
-- день 12, вечір 16 — початок; 12/16/20 — кінець), що дає той самий робочий
-- день, який майстриня вже бачила.

alter table working_days
  add column opens_at  time,
  add column closes_at time;

update working_days set
  opens_at = case
    when 'morning' = any (slots) then time '09:00'
    when 'day'     = any (slots) then time '12:00'
    else time '16:00'
  end,
  closes_at = case
    when 'evening' = any (slots) then time '20:00'
    when 'day'     = any (slots) then time '16:00'
    else time '12:00'
  end;

alter table working_days
  alter column opens_at  set not null,
  alter column closes_at set not null,
  alter column opens_at  set default time '09:00',
  alter column closes_at set default time '20:00';

-- Кінець строго пізніше початку: 14:00–14:00 це не робочий день нульової
-- довжини, а помилка вводу, і в базу вона потрапити не має.
alter table working_days
  add constraint working_days_hours_order check (closes_at > opens_at);

-- `slots` більше не джерело правди — проміжки рахуються з годин на читанні.
-- Колонку прибираємо разом з її констрейнтом (0009), щоб не лишити в схемі
-- поле, яке ніхто не пише, але всі бачать і можуть спробувати прочитати.
alter table working_days drop constraint if exists working_days_slots_check;
alter table working_days drop column slots;

