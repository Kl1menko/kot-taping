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
 *
 * Але самих цих обмежень мало. На iOS `date` і `datetime-local` малюються
 * нативним віджетом, чия власна ширина йде від `-webkit-appearance` в UA-стилях,
 * а не від бокс-моделі: бокс ми звузили, а віджет усередині лишався широким і
 * вилазив за рамку. Тому `appearance-none` — не косметика, а єдиний спосіб
 * віддати ширину нашому боксу.
 *
 * Висоту тут навмисно тримає `min-h`, а не `h`: цей же рядок носять textarea,
 * які доростають власним `min-h-[…]` і `resize-y`, — фіксована `h` їх би
 * сплющила.
 */
export const INPUT_CLS =
  "mt-2 block min-h-[52px] w-full min-w-0 max-w-full appearance-none rounded-2xl border border-line bg-canvas px-4 text-[16px] " +
  "transition-colors duration-200 focus:border-ink focus:outline-none";

/**
 * Додаток для `date` / `datetime-local` / `time`.
 *
 * Після `appearance-none` нативний віджет більше не центрує текст сам, а
 * поле лишається одноряд­ковим — тому саме тут можна дати явну висоту й
 * вирівняти вміст. `[&::-webkit-date-and-time-value]:text-left` прибирає
 * характерне сафарівське центрування значення всередині поля.
 */
export const DATE_INPUT_CLS =
  "h-[52px] py-0 [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left " +
  "[&::-webkit-calendar-picker-indicator]:ml-auto";
