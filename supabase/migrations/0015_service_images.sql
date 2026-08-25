-- Фото послуги — керується з адмінки, а не файлом у репозиторії.
--
-- До цієї міграції картка послуги на лендінгу брала знімок за категорією:
-- `/images/services/{category}.jpg`. Це означало, що всі послуги однієї
-- категорії виглядають однаково, а щоб замінити фото — треба комміт і
-- деплой. Майстриня ж міняє прайс частіше, ніж виходить реліз.
--
-- Колонка nullable навмисно: порожньо = «показуй фото категорії», тобто
-- рівно та поведінка, що була досі. Отже наявні рядки міняти не треба, а
-- вітрина не ламається, поки жодне фото ще не завантажене.
alter table services add column if not exists image_url text;

-- — Сховище для фото —
--
-- Публічний bucket: посилання на файл лежить прямо в HTML лендінгу, тож
-- підписані URL тут були б і зайвою роботою, і зайвим кешем. Приватного в
-- цих знімках нічого немає — це той самий контент, що й раніше лежав у
-- /public.
--
-- Ліміт 5 МБ і білий список типів — на рівні сховища, а не лише форми:
-- завантаження йде під service-role ключем, і єдина справжня межа має бути
-- там, куди не дотягнеться помилка в коді.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
