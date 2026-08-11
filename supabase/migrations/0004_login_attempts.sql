-- Стеля перебору пароля адмінки.
--
-- Лічильник жив у пам'яті процесу, і на Vercel це означало «не жив»: кожен
-- холодний старт піднімає новий процес із порожньою Map, тож 8 спроб на 10
-- хвилин обнулялися разом із ним. Перебір ішов рівним темпом і ніколи не
-- впирався в межу.
--
-- Таблиця — спільна пам'ять для всіх процесів. Рядок один на ключ (`admin`),
-- тож ця таблиця не росте.

create table login_attempts (
  -- Ключ спроби. Зараз користувач один, тож і рядок один — але залишаємо
  -- текстовий ключ, щоб згодом можна було рахувати по IP чи по логіну.
  key        text primary key,
  count      integer not null default 0 check (count >= 0),
  -- Кінець поточного вікна: після нього лічильник починається спочатку.
  window_end timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table login_attempts enable row level security;

/**
 * Зареєструвати спробу входу й сказати, чи вона за межею ліміту.
 *
 * Уся логіка в SQL, а не в застосунку, бо «прочитати → порахувати → записати»
 * двома запитами дає гонку: паралельні спроби читають те саме число і кожна
 * пише свою одиницю. `insert … on conflict … do update` виконується атомарно,
 * тож рахунок не губиться навіть коли по адмінці стукають у багато потоків.
 *
 * `security definer` — щоб функцію можна було викликати, не відкриваючи саму
 * таблицю: RLS на ній лишається без policy, як і на решті таблиць.
 */
create or replace function register_login_attempt(
  attempt_key text,
  max_attempts integer,
  window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into login_attempts (key, count, window_end, updated_at)
  values (attempt_key, 1, now() + make_interval(secs => window_seconds), now())
  on conflict (key) do update
    set
      -- Вікно скінчилося — починаємо відлік заново, інакше додаємо спробу.
      count = case
        when login_attempts.window_end < now() then 1
        else login_attempts.count + 1
      end,
      window_end = case
        when login_attempts.window_end < now()
          then now() + make_interval(secs => window_seconds)
        else login_attempts.window_end
      end,
      updated_at = now()
  returning count into current_count;

  return current_count > max_attempts;
end;
$$;
