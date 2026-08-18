/**
 * Форма рядків у Postgres — дзеркало supabase/migrations.
 *
 * Написано вручну, а не згенеровано `supabase gen types`: схема невелика, а
 * ручний файл не тягне за собою CLI в тулчейн. Змінюючи міграцію, правте і тут.
 */

import type { ContactChannel, PreferredTime } from "@/lib/intake";
import type { KitOrderStatus, KitZone } from "@/lib/kits";
import type { PaymentStatus } from "@/lib/payments";

export type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price: number;
  price_from: boolean;
  wear: string | null;
  badge: string | null;
  category: string;
  tone: "sand" | "clay" | "blush";
  duration_min: number;
  sort: number;
  is_active: boolean;
  created_at: string;
};

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type LocationRow = {
  id: string;
  slug: string;
  city: string;
  address: string;
  phone: string | null;
  sort: number;
  is_active: boolean;
  created_at: string;
};

export type AppointmentStatus = "planned" | "done" | "cancelled" | "no_show";

export type AppointmentRow = {
  id: string;
  client_id: string;
  service_id: string;
  location_id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: AppointmentStatus;
  note: string | null;
  source: "manual" | "site";
  created_at: string;
};

export type RequestStatus = "new" | "converted" | "declined";

export type RequestRow = {
  id: string;
  name: string;
  phone: string;
  service_slug: string;
  /** Бажаний кабінет; null — «будь-який». */
  location_slug: string | null;
  preferred_date: string | null;
  note: string | null;
  status: RequestStatus;
  appointment_id: string | null;
  created_at: string;

  // — Анкета запису, міграція 0005 —
  /** Куди писати підтвердження. Телефон є завжди, канал каже — куди саме. */
  contact_channel: ContactChannel;
  /** Нік без «@»; null для каналу 'phone'. */
  contact_handle: string | null;
  /** Орієнтир пацієнта. Точний час ставить майстриня в календарі. */
  preferred_time: PreferredTime | null;
  tape_color: string | null;
  height_cm: number | null;
  /** Вільний текст: об'єми пишуть як завгодно, читає їх людина. */
  measurements: string | null;
  /** Відмічені протипоказання. Не порожньо — заявка потребує узгодження. */
  contraindications: string[];
  /** Коли дано згоду на обробку даних; null — згоди не було. */
  consent_at: string | null;
};

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  sort: number;
  is_published: boolean;
  created_at: string;
};

export type TestimonialRow = {
  id: string;
  quote: string;
  author: string;
  detail: string | null;
  sort: number;
  is_published: boolean;
  created_at: string;
};

export type ResultRow = {
  id: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  sort: number;
  is_published: boolean;
  created_at: string;
};

/** Каталог наборів для самотейпування — міграція 0006. */
export type KitRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price: number;
  price_from: boolean;
  zone: KitZone;
  /** Обличчя тейпується лише білим, тож вибору кольору там немає. */
  allows_color: boolean;
  needs_measurements: boolean;
  sort: number;
  is_active: boolean;
  created_at: string;
};

/** Замовлення набору — міграція 0006. */
export type KitOrderRow = {
  id: string;
  /** Slug, а не FK: замовлення переживає зняття набору з продажу. */
  kit_slug: string;
  name: string;
  phone: string;
  contact_channel: ContactChannel;
  contact_handle: string | null;
  /** Лише для наборів на шию; для обличчя null — тейп білий. */
  tape_color: string | null;
  measurements: string | null;
  city: string;
  country: string;
  note: string | null;
  status: KitOrderStatus;
  /** Накладна для відстеження — з'являється на відправленні. */
  tracking: string | null;
  consent_at: string | null;
  created_at: string;
};

/**
 * Рахунок на оплату — міграція 0007.
 *
 * Заповнене рівно одне з двох посилань: рахунок або за процедуру, або за
 * набір. Це гарантує `check` у міграції, тож на читанні можна не боятися
 * рядка, який не веде нікуди.
 */
export type PaymentRow = {
  id: string;
  appointment_id: string | null;
  kit_order_id: string | null;
  invoice_id: string;
  page_url: string;
  /** Копійки, як їх розуміє monobank. */
  amount: number;
  ccy: number;
  status: PaymentStatus;
  failure_reason: string | null;
  err_code: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Лічильник спроб входу — міграція 0004. Рядок один на ключ. */
export type LoginAttemptRow = {
  key: string;
  count: number;
  window_end: string;
  updated_at: string;
};

/** Мапа для типізації `supabase.from(...)`. */
export type Database = {
  public: {
    Tables: {
      services: Table<ServiceRow>;
      locations: Table<LocationRow>;
      clients: Table<ClientRow>;
      appointments: Table<AppointmentRow>;
      requests: Table<RequestRow>;
      faq_items: Table<FaqRow>;
      testimonials: Table<TestimonialRow>;
      results: Table<ResultRow>;
      kits: Table<KitRow>;
      kit_orders: Table<KitOrderRow>;
      payments: Table<PaymentRow>;
      /**
       * Ключ тут `key`, а не `id`, тож шаблон `Table<>` не підходить.
       * Пишемо напряму — до таблиці ми і так ходимо лише через RPC.
       */
      login_attempts: {
        Row: LoginAttemptRow;
        Insert: Partial<LoginAttemptRow> & { key: string };
        Update: Partial<LoginAttemptRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** Міграція 0004: атомарний лічильник спроб входу. */
      register_login_attempt: {
        Args: {
          attempt_key: string;
          max_attempts: number;
          window_seconds: number;
        };
        /** true — спроба вже за межею ліміту. */
        Returns: boolean;
      };
    };
    Enums: {
      appointment_status: AppointmentStatus;
      request_status: RequestStatus;
      contact_channel: ContactChannel;
      kit_order_status: KitOrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Поля з `default` у БД не обов'язкові на вставці, а `id`/`created_at` взагалі
 * не мають приходити з коду — звідси Insert як частковий Row без них.
 */
type Table<Row extends { id: string; created_at: string }> = {
  Row: Row;
  Insert: Partial<Omit<Row, "id" | "created_at">> & { id?: string };
  Update: Partial<Omit<Row, "id" | "created_at">>;
  Relationships: [];
};
