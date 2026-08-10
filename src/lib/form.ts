/**
 * Спільний вигляд полів вводу — і в адмінці, і у формі запису на лендінгу.
 *
 * Раніше цей рядок був скопійований у п'яти компонентах, тому баг зі шириною
 * довелося ловити п'ять разів. Тепер джерело одне.
 *
 * `min-w-0` і `max-w-full` тут не про запас: Safari дає полям
 * `datetime-local` і `date` власну внутрішню ширину, ширшу за екран телефона,
 * і `w-full` її не перебиває — поле розпирало нижній лист і зсувало форму
 * вбік. Те саме стосується будь-якого поля всередині grid-колонки, де
 * елемент за замовчуванням має `min-width: auto`.
 */
export const INPUT_CLS =
  "mt-2 block min-h-[52px] w-full min-w-0 max-w-full rounded-2xl border border-line bg-canvas px-4 text-[16px] " +
  "transition-colors duration-200 focus:border-ink focus:outline-none";
