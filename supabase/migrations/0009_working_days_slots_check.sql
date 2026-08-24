-- Лагодить check на `working_days.slots` із міграції 0008.
--
-- Там стояв `array_length(slots, 1) between 1 and 3`. На порожньому масиві
-- `array_length` повертає NULL, а не 0, тож вираз давав NULL — а check-констрейнт
-- відкидає рядок лише на false. Порожній `slots` проходив наскрізь і створював
-- «робочий день, у який не можна записатись»: у формі запису такий день
-- виглядав доступним, але жодного проміжку не пропонував.
--
-- `cardinality` рахує порожній масив як 0 і закриває дірку.
--
-- Ця міграція окрема, а не правка 0008: у бази, де 0008 уже виконана,
-- констрейнт треба саме замінити.

-- Прибираємо ті, що вже встигли лягти, — інакше констрейнт не створиться.
delete from working_days where cardinality(slots) = 0;

-- Старий констрейнт скидаємо за пошуком, а не за іменем: у 0008 він
-- оголошений inline і ім'я йому дав Postgres. За замовчуванням це
-- `working_days_slots_check`, але покладатися на це не варто — база могла
-- прийти і з іншим іменем.
do $$
declare
  name text;
begin
  for name in
    select conname from pg_constraint
     where conrelid = 'working_days'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%slots%'
  loop
    execute format('alter table working_days drop constraint %I', name);
  end loop;
end;
$$;

alter table working_days add constraint working_days_slots_check
  check (
    cardinality(slots) between 1 and 3
    and slots <@ array['morning', 'day', 'evening']
  );
