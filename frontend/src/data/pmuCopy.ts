// Real data, sourced 2026-08-19: reviews pasted from Google by the business owner. Address
// corrected by the owner 2026-08-19 (studio operates from the same location as AK.LUX.NAILS, not
// pmu-annakara.com's own listed University Ave address); no phone number shown on this page per
// the owner's own request. See docs/multi-tenant-akpmu-design.md.

import gallery1 from "@/assets/pmu/gallery/gallery-1.jpg";
import gallery2 from "@/assets/pmu/gallery/gallery-2.jpg";
import gallery3 from "@/assets/pmu/gallery/gallery-3.jpg";
import gallery4 from "@/assets/pmu/gallery/gallery-4.jpg";
import gallery5 from "@/assets/pmu/gallery/gallery-5.jpg";
import gallery6 from "@/assets/pmu/gallery/gallery-6.jpg";
import gallery7 from "@/assets/pmu/gallery/gallery-7.jpg";

export const PMU_LOCATION = {
  name: "Anna Kara's Beauty PMU Studio",
  address: "1357 Seventh Ave, Ste C, San Diego, CA 92101",
};

export const PMU_RATING = {
  score: 4.9,
  count: 141,
};

export interface PmuReview {
  name: string;
  initial: string;
  date: string;
  stars: string;
  text: string;
}

// Only reviews that credit Anna Kara herself — this page is her Brows work specifically, so a
// review crediting a different artist (Anastasiia, Nikki) stays out of the rotation here even
// though it's real 5-star praise for the studio overall.
export const PMU_REVIEWS: PmuReview[] = [
  {
    name: "Lauren Chaikin",
    initial: "L",
    date: "2 weeks ago",
    stars: "★★★★★",
    text: "I cannot recommend Anna highly enough! She did my permanent makeup, including both my eyeliner and eyebrows, and I couldn't be happier with the results. From start to finish, she was incredibly patient, meticulous, and made sure every detail was perfect. The final results are absolutely perfect — my eyebrows look so natural, beautifully shaped, and exactly what I was hoping for.",
  },
  {
    name: "Ms. M",
    initial: "M",
    date: "9 months ago",
    stars: "★★★★★",
    text: "I knew I could trust Anna 100% with such a delicate procedure. She has a great aesthetic vision, superb attention to detail, and an impeccable technique. Anna really does have a unique talent of making you look and feel more beautiful — the results are amazing and worth every penny. I highly recommend.",
  },
  {
    name: "Sheena Hinds",
    initial: "S",
    date: "10 months ago",
    stars: "★★★★★",
    text: "Wow! Just wow! The most incredible experience from start to finish! Anna is an absolute perfectionist, and she took her time with my procedures. There is no way to convey the time, focus and effort that Anna put in to achieving the perfect result and making sure I was happy. 10/10 I will be returning and 10/10 I recommend Anna.",
  },
];

export interface PmuGallerySlide {
  id: string;
  src: string;
  badge: string;
  caption: string;
  sub: string;
}

// Sourced 2026-08-19 from pmu-annakara.com/realistic-nano-hairstrokes/ as placeholder gallery
// content — real client photos, but a temporary set until the owner supplies a curated batch.
export const PMU_GALLERY_SLIDES: PmuGallerySlide[] = [
  { id: "pgNanoSplit", src: gallery1, badge: "Nano Hairstrokes", caption: "Before & After — Healed Result", sub: "Hand-drawn, hair-like strokes" },
  { id: "pgNaturalArch", src: gallery2, badge: "Nano Hairstrokes", caption: "Natural Hairstroke Brows", sub: "Soft, symmetrical arch" },
  { id: "pgFullFace", src: gallery3, badge: "Nano Hairstrokes", caption: "Fuller, Defined Brows", sub: "Healed result, natural finish" },
  { id: "pgBrandedSplit1", src: gallery4, badge: "Nano Hairstrokes", caption: "Before & After", sub: "Anna Kara's Beauty PMU Studio" },
  { id: "pgBrandedSplit2", src: gallery5, badge: "Nano Hairstrokes", caption: "Before & After — Healed", sub: "Anna Kara's Beauty PMU Studio" },
  { id: "pgMacroDetail1", src: gallery6, badge: "Detail", caption: "Hair-by-Hair Detail", sub: "Anna Kara's Beauty PMU Studio" },
  { id: "pgMacroDetail2", src: gallery7, badge: "Detail", caption: "Stroke-by-Stroke Precision", sub: "Close-up of the hairstroke technique" },
];

export const PMU_GALLERY_INITIAL_COUNT = 5;

// Same legal shape as designCopy.ts's SMS_CONSENT_TEXT, business name swapped for PMU. No
// cancellation-policy step exists on this page (or its equivalent consent card) — the owner
// asked to drop it for PMU, so ConfirmStep.tsx's cancelCard pattern is intentionally not mirrored.
//
// Names the legal entity ("Anna Kara's Brow Studio LLC" — matches the name on file with Twilio
// for this toll-free number, +18339125558), not the "Anna Kara's Beauty PMU Studio" trade name
// used everywhere else on this page (header, footer, gallery, page title). A toll-free
// verification for this number was rejected 2026-08-28 for reason 30506 ("Opt-Ins Must Clearly
// Reflect the End Business") — the opt-in shown to customers didn't match the registered legal
// name at all, so a reviewer couldn't connect the two. Keep this string's business name in sync
// with whatever's actually on file with Twilio; the rest of the site's PMU-branded copy is
// deliberately untouched (the owner only wants the legal name where it's compliance-relevant).
//
// Marketing-only wording, no mention of reminders/confirmations — same fix already applied (and
// later deliberately reverted, on an already-approved number with the owner accepting the
// re-review risk) to mani's own SMS_CONSENT_TEXT in PR #59/#61. This checkbox has only ever
// gated MARKETING-class sends (see salaryReview's TwilioSmsService); appointment reminders are
// sent natively by Square regardless of this checkbox. Twilio's toll-free review rejects a single
// opt-in that promises both transactional and marketing content under one consent (reason 30504,
// "Single Opt-In for Multiple Use Cases Is Not Allowed") — not one of this rejection's three
// listed reasons, but worth fixing now while this text is already being touched for resubmission,
// rather than risking a fourth rejection reason on the next review.
export const PMU_SMS_CONSENT_TEXT =
  "By checking this box, I agree to receive recurring automated marketing text messages from Anna Kara's Brow Studio LLC — occasional discounts and first access to newly opened appointment slots — at the number provided. Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";
