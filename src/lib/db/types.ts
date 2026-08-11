/**
 * Форма рядків у Postgres — дзеркало supabase/migrations.
 *
 * Написано вручну, а не згенеровано `supabase gen types`: схема невелика, а
 * ручний файл не тягне за собою CLI в тулчейн. Змінюючи міграцію, правте і тут.
 */

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
