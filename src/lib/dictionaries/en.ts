import type { Dictionary } from "../dictionary.ts";

/**
 * Англійська версія сайту.
 *
 * Переклад змістовий, а не послівний: українські формулювання побудовані на
 * зворотах, які англійською читаються штучно («повертаємо тілу свіжість»),
 * тому кожен блок переписаний так, як його написав би англомовний копірайтер
 * тієї ж студії. Факти, ціни й медичні формулювання (протипокази, терміни
 * носіння) передані точно — це не місце для вільного переказу.
 *
 * `satisfies Dictionary` замість анотації типу: перевіряє повноту ключів, але
 * лишає літеральні типи, тож автодоповнення в компонентах працює.
 */
export const en = {
  a11y: {
    breadcrumbs: "Breadcrumb",
    videoAlt: "A lymphatic drainage taping session in the studio",
    pauseVideo: "Pause video",
    playVideo: "Play video",
    skipToContent: "Skip to content",
  },
  meta: {
    business: "A studio for aesthetic and lymphatic drainage taping of face and body.",
    home: {
      title: "Kotova Taping — aesthetic taping studio in Lviv and Kyiv",
      description:
        "Aesthetic and lymphatic drainage taping for face and body in Lviv " +
        "and Kyiv. Applications designed for you, hypoallergenic materials, " +
        "visible results after the first session.",
    },
    ogTitle: "Kotova Taping — aesthetic taping studio",
  },
  categories: {
    muscle: { label: "Muscle support" },
    neuro: { label: "Neurological" },
    "lymph-body": { label: "Body lymphatic drainage" },
    "lymph-face": { label: "Facial lymphatic drainage" },
    "face-modeling": { label: "Face contouring" },
    sets: { label: "Courses" },
  },
  cities: {
    // Адреси транслітеровані, а не перекладені: за перекладеною назвою вулиці
    // таксі й карти нічого не знайдуть.
    lviv: { city: "Lviv", address: "204b Zelena St." },
    kyiv: { city: "Kyiv", address: "67A Beresteiskyi Ave." },
  },
  form: {
    close2: "Close",
    pickDateFirst: "Choose a date first and I will show the free times.",
    noHours: "There are no free times left on that day. Please pick another date.",
    detailsHint:
      "Optional — but if you fill this in I can work out the materials right " +
      "away, and we will not need to sort it out by message.",
    notChosen: "Not chosen",
    channelHints: {
      telegram: "If you have no handle, I will call the number from the form.",
      instagram: "I will find you by your handle to confirm the booking.",
      phone: "I will call the number you entered above.",
    },
    handleLabels: {
      telegram: "Telegram handle",
      instagram: "Instagram handle",
    },
    heading: "Send a request",
    close: "Close",
    chooseService: "Choose a service",
    chooseCity: "Choose a studio",
    name: "Name",
    phone: "Phone",
    phoneHint: "Needed to confirm your appointment",
    service: "Service",
    location: "Studio",
    date: "Preferred date",
    time: "Time",
    timeHint: "Pick a time that suits you.",
    /** Підпис під сіткою, коли частину годин уже зайнято. */
    timeSomeBusy: "Greyed-out hours are already booked.",
    /** Для читача екрана — сама лише сірість про зайнятість не скаже. */
    timeBusyLabel: "{time} — booked",
    /** День відкритий, але всі його години вже розібрані. */
    allBusy: "Every hour on this day is booked. Please pick another date.",
    timeHours: "On this day I work {hours}.",
    contactTitle: "How to reach you",
    contactHint: "I will send a confirmation with the details.",
    detailsTitle: "Treatment details",
    tapeColor: "Tape colour",
    height: "Height, cm",
    measurements: "Measurements",
    measurementsHint: "For example: waist 68, hips 95.",
    contraTitle: "Contraindications",
    contraHint:
      "Tick anything that applies to you. This is not a refusal — we will " +
      "simply talk it through before your visit rather than after it.",
    note: "Comment (optional)",
    consent:
      "I consent to my personal data being processed for this booking.",
    submit: "Send request",
    submitting: "Sending…",
    sentTitle: "Request sent",
    urgent: "If it is urgent, message me directly:",
    channels: {
      telegram: "Telegram",
      instagram: "Instagram",
      phone: "Phone",
    },
    contraindications: {
      pregnancy: "Pregnancy or breastfeeding",
      oncology: "Cancer",
      thrombosis: "Acute thrombosis, thrombophlebitis or varicose veins",
      acute: "Acute inflammation or fever",
      skin: "Damaged skin or a skin condition in the treatment area",
      allergy: "Allergy to acrylic or adhesive bases",
    },
  },
  services: {
    from: "from",
    label: "Services",
    title: "Applications built around your concern, not a template",
    tabs: "Service categories",
    book: "Book",
    bookAria: "Book “{service}”",
    more: "More about {category}",
  },
  kits: {
    prev: "Previous",
    next: "Next",
    orderTitle: "Order a kit",
  },
  gallery: {
    open: "Open photo",
    close: "Close",
    prev: "Previous photo",
    next: "Next photo",
  },
  gallerySection: {
    label: "Our work",
    title: "What it looks like in practice",
    items: {
      "sample-1": {
        alt: "Fan application in a skin tone across the cheek and cheekbone",
        caption: "Cheek lymphatic drainage",
      },
      "sample-2": {
        alt: "Green and yellow mesh application on the neck and shoulder",
        caption: "Neurological",
      },
      "sample-3": {
        alt: "Red and blue cross taping across the abdomen",
        caption: "Abdomen — single",
      },
      "sample-4": {
        alt: "Lymphatic drainage mesh on the abdomen and side",
        caption: "Abdomen — double",
      },
      "sample-5": {
        alt: "Fanned strips of skin-tone tape on the buttocks",
        caption: "Buttocks",
      },
      "sample-6": {
        alt: "White fan application on the chest and décolleté",
        caption: "Chest",
      },
      "sample-7": {
        alt: "Tape around the mouth and patches under the eyes",
        caption: "Lip lines",
      },
    },
  },
  pages: {
    home: "Home",
    services: {
      eyebrow: "Services & prices",
      title: "Face and body taping — every direction",
      lead:
        "Six areas of work: from lymphatic drainage and facial contouring to " +
        "muscle and neurological support. In every case the application is " +
        "chosen for your concern — below are the prices and a description of " +
        "each group, so there is something to start the conversation from.",
      mediaAlt: "Lymphatic drainage tape application on the face and neck",
      mediaCaption:
        "The application is chosen in the room, after an assessment — not from a price list.",
      countLabel: "Services listed",
      priceLabel: "Prices from",
      priceFloor: "starting price",
      officesLabel: "Studios",
      groupsLabel: "Directions",
      groupsTitle: "Six areas of work — choose your concern",
      citiesTitle: "Two studios",
      serviceForms: { one: "service", many: "services" },
      officeForms: { one: "studio", many: "studios" },
    },
    category: {
      countLabel: "Treatments in this group",
      wearLabel: "The tape stays on",
      wearCaption: "wear time",
      priceLabel: "Prices",
      priceTitle: "{category}: prices",
      priceNote:
        "The price depends on the area and the amount of work. “From” means " +
        "the final figure is set in the room after an assessment — no " +
        "surprises once the treatment is done.",
      whereTitle: "Where to book",
      othersLabel: "Other directions",
      othersTitle: "What else I work with",
      mediaAlt: "{category} — tape application",
    },
    city: {
      hours: "Mon–Sat, 10:00–19:00",
      byAppointment: "by appointment",
      emailLabel: "Email",
      studioLabel: "Studio",
      findUs: "How to find us {locative}",
      write: "Message me",
      whatWeDo: "What you can book {locative}",
      samePrice:
        "Both studios work from the same price list and the same range of treatments.",
      pricesLink: "Prices & details",
      otherStudio: "The other studio",
      otherTitle: "Is the other city easier for you?",
      otherText:
        "I work there from the same price list and with the same approach — " +
        "the application follows your concern, not a template.",
      metaTitle: "Taping {locative}",
      heroTitle: "Aesthetic taping {locative}",
      mediaAlt: "Tape being applied in the studio",
      mediaCaption: "{address} — by appointment",
      addressLabel: "Address",
      hoursLabel: "Hours",
      phoneLabel: "Phone",
    },
  },
  errors: {
    name: "Please enter your name — at least 2 characters.",
    phone: "Enter a phone number — 0XX XXX XX XX or +380 XX XXX XX XX.",
    service: "Choose a service from the list.",
    location: "Choose a studio from the list.",
    date: "Choose a preferred date.",
    dateNone: "There are no open dates for this studio yet.",
    dateTaken: "That date is no longer available — please pick another one.",
    channel: "Choose how you would like to be contacted.",
    handle: "Enter your handle so I can find you and write.",
    handleFormat:
      "A handle uses Latin letters, digits, a dot and an underscore.",
    height: "Height in centimetres, for example 168.",
    time: "Choose a time.",
    timeTaken: "That time is no longer available — please pick another one.",
    timeBusy:
      "That hour is already booked. Please pick another one — the free hours are selectable.",
    consent: "Without consent to process your data I cannot accept the request.",
    check: "Please check the highlighted fields.",
    tooMany:
      "You have already sent several requests. I will be in touch shortly — " +
      "if it is urgent, message me on Telegram or Instagram.",
    failed:
      "The request could not be sent. Please message me on Telegram or " +
      "Instagram and I will reply right away.",
    sent: "Request received. I will contact you shortly to confirm the time.",
    sentFlagged:
      "Request received. You flagged a condition we need to discuss before " +
      "the treatment — I will write to you to go through the details.",
  },
  kitForm: {
    faceColorNote: "White tape is used on the face.",
    /**
     * Ключ — українське значення з `intake.ts`: воно йде в базу й у
     * повідомлення майстрині, тож перекладається лише підпис на екрані.
     */
    tapeColors: {
      "Бежевий": "Beige",
      "Чорний": "Black",
      "Білий": "White",
      "Синій": "Blue",
      "Рожевий": "Pink",
      "Блакитний": "Light blue",
      "Зелений": "Green",
      "На ваш розсуд": "Your choice",
    },
    delivery: "Delivery",
    deliveryTo: "Where to send it",
    sectionLabel: "Home taping",
    sectionTitle: "A kit for taping at home",
    sectionText:
      "A ready kit with tape cut for your area and a video guide: how to " +
      "apply it, how to remove it, which exercises to add. Sent by post — " +
      "within Ukraine and abroad.",
    orderCta: "Order a kit",
    orDirect: "or message me directly",
    orderAria: "Order the “{kit}” kit",
    kitLabel: "Kit",
    close: "Close",
    name: "Name",
    phone: "Phone",
    instagram: "Instagram handle",
    telegram: "Telegram handle",
    tapeColor: "Tape colour",
    measurements: "Your measurements, cm",
    measurementsHint:
      "Needed so the tape is cut for your face. I will talk you through what " +
      "to measure in chat if you are unsure.",
    measurementsPlaceholder: "For example: forehead width 14, face length 19",
    country: "Country",
    countryDefault: "Ukraine",
    countryHint:
      "For delivery abroad I will work out the cost separately and tell you before payment.",
    city: "City",
    cityHint:
      "I will take the exact address and pickup point in chat once the order is confirmed.",
    note: "Comment (optional)",
    submit: "Order the kit",
    submitting: "Sending…",
    sentTitle: "Order received",
    urgent: "If it is urgent, message me directly:",
  },
  calendar: {
    noDates:
      "There are no free dates in the near future. Message me on Telegram or " +
      "Instagram and we will find a time.",
    chosen: "Chosen",
    hint: "Available dates are highlighted — pick one that suits you.",
    pickLocation: "Choose a studio and I will show the dates open there.",
    // Тиждень усе одно починається з понеділка — це графік студії, а не
    // культурна умовність, тож порядок однаковий в обох мовах.
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    prevMonth: "Previous month",
    nextMonth: "Next month",
    pickDate: "Choose a date",
    unavailable: "unavailable",
  },
  nav: {
    services: "Services",
    about: "About",
    results: "Results",
    faq: "FAQ",
    booking: "Book",
    menuLabel: "Main menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    socials: "Social media",
    contacts: "Contacts",
    offices: "Studios",
    languageLabel: "Site language",
  },
  hero: {
    eyebrow: "Aesthetic taping",
    title: "Bring back a fresher look — without injections",
    text:
      "Lymphatic drainage and lifting applications, designed around your " +
      "specific concern. Hypoallergenic tape, visible results after the very " +
      "first session.",
    book: "Book a session",
    prices: "Services & prices",
    caption: "The tape keeps working 24 hours a day — even while you sleep.",
  },
  pitch: {
    label: "Why taping",
    title: "A gentle method with predictable results",
    cta: "Book a consultation",
    points: [
      {
        title: "No injections",
        text: "We work with the body's own resources — lymph flow and muscle tone.",
      },
      {
        title: "Hypoallergenic materials",
        text: "A cotton base with acrylic adhesive, safe for sensitive skin.",
      },
      {
        title: "The effect builds up",
        text: "Each session builds on the last, which is why a course holds.",
      },
    ],
  },
  about: {
    label: "About me",
    title: "I treat the face as one system, not a set of wrinkles",
    portraitAlt: "Contouring tape application on the lower third of the face",
    paragraphs: [
      "Taping is not about sticking on a strip. It is work with lymph flow, " +
        "muscle tone and fascia. Before the first session we go through your " +
        "history: swelling, sleep, daily strain, previous treatments.",
      "From there I build an application designed for you, and show you how " +
        "to hold the result at home between visits.",
    ],
    facts: [
      { value: "6", label: "years in practice" },
      { value: "900+", label: "sessions carried out" },
      { value: "4", label: "professional certifications" },
    ],
  },
  results: {
    label: "Results",
    title: "Before and after — published with clients' consent",
    prev: "Previous",
    next: "Next",
    photos: {
      neck: "Chin and neck before and after a course of taping",
      "face-profile": "Jawline in profile before and after taping",
      belly: "Abdomen before and after lymphatic drainage taping",
      "legs-back": "Back of the thighs before and after taping",
      "legs-side": "Calves before and after lymphatic drainage taping",
    },
    steps: [
      {
        n: "01",
        title: "Consultation",
        text: "We go through your concern, contraindications and expectations.",
      },
      {
        n: "02",
        title: "Application plan",
        text: "I design the application around your anatomy and your goal.",
      },
      {
        n: "03",
        title: "Session",
        text: "I apply the tape and show you how to wear and remove it.",
      },
      {
        n: "04",
        title: "Aftercare",
        text: "Home guidance and a plan for the visits that follow.",
      },
    ],
  },
  testimonials: {
    label: "Reviews",
    title: "What clients say after a course",
    items: [
      {
        quote:
          "I came in with swelling that had not gone down in years. After the " +
          "fourth session I saw my cheekbones for the first time.",
        author: "Iryna",
        detail: "face course",
      },
      {
        quote:
          "What struck me most was the half hour of questions about sleep and " +
          "daily strain before any tape went on.",
        author: "Mariia",
        detail: "facial lymphatic drainage",
      },
      {
        quote:
          "By evening my legs felt like logs. After the course the difference " +
          "was obvious — my husband noticed before I did.",
        author: "Oksana",
        detail: "body course",
      },
    ],
  },
  faq: {
    label: "FAQ",
    title: "What to know before your first session",
    items: [
      {
        q: "How long is the tape worn?",
        a:
          "Facial contouring tape — 7 to 48 hours. Lymphatic drainage tape — 7 " +
          "to 16 days. Supportive tape — 3 to 5 days.",
      },
      {
        q: "Are there any contraindications?",
        a:
          "There are absolute and relative contraindications. Absolute: cancer " +
          "and varicose veins (at the application site), and autoimmune " +
          "conditions such as thyroiditis. Relative: acute respiratory " +
          "infection, moles and papillomas (which are never taped over), and " +
          "broken skin. That is the full list after 50 years of research into " +
          "this method.",
      },
      {
        q: "Can I shower with the tape on?",
        a:
          "You can shower, but do not soak the tape under a direct stream of " +
          "hot water. The tape is water-resistant, yet prolonged contact with " +
          "water (a pool, a bath, a direct shower stream) and anything that " +
          "exfoliates — sauna, peeling, hot tub — will make it peel off early.",
      },
      {
        q: "How do I prepare for the session?",
        a:
          "Do not apply moisturiser or oil to the area, take a shower, avoid " +
          "damaging the skin where the tape will go, and exfoliate the area. " +
          "If you cannot manage some of this, do not worry — we will prepare " +
          "the skin before the application.",
      },
      {
        q: "How do I choose the right abdominal taping?",
        a:
          "The treatment is called abdominal lymphatic drainage. There are two " +
          "versions: single — one 5 cm strip per side, cut into fine ribbons; " +
          "double — two 5 cm strips at the front and back, wrapping the whole " +
          "torso.",
      },
      {
        q: "How do I choose the right leg taping?",
        a:
          "There are two lengths: to the knee (thighs 1 and 2) and to the foot " +
          "(legs 1 and 2). And two densities: double — two 5 cm strips per leg; " +
          "single — one 5 cm strip per leg.",
      },
      {
        q: "How do I choose the right arm taping?",
        a:
          "There are two lengths: to the elbow (arms 1) and to the wrist (arms " +
          "2). And two densities: double — two 5 cm strips per arm; single — " +
          "one 5 cm strip per arm.",
      },
      {
        q: "How do I choose the right taping for the buttocks?",
        a:
          "This area is covered by the leg applications (thighs 2 double and " +
          "legs 2 double) — the length of tape and the weave make the result " +
          "last far longer than taping the buttocks alone. As a separate " +
          "treatment the buttocks come in three sizes: S / M / L.",
      },
    ],
  },
  booking: {
    label: "Booking",
    title: "Send a request and we will find a time that suits you",
    text:
      "This is not instant booking: I review every request personally and " +
      "call you to confirm the date and answer your questions.",
    cta: "Book a session",
  },
  footer: {
    tagline: "An aesthetic taping studio. By appointment only.",
    services: "Services",
    offices: "Studios",
  },
} satisfies Dictionary;
