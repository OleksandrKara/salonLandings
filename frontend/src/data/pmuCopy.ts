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

// Same figures as the PMU site's own reviews block (pmu-annakara-home Testimonials.tsx, owner
// SEO/GEO audit 2026-09-24): Google 4.9 / 144.
export const PMU_RATING = {
  score: 4.9,
  count: 144,
};

export interface PmuReview {
  name: string;
  /** Exact date as Google shows it (from the PMU site's review widget), never "N months ago". */
  date: string;
  text: string;
  /** Reviewer's real Google profile photo; letter avatar when they have none. */
  profileImage?: string;
}

// Only reviews that credit Anna Kara herself — this page is her Brows work specifically, so a
// review crediting a different artist (Anastasiia, Nikki) stays out of the rotation here even
// though it's real 5-star praise for the studio overall.
// Real Google reviews, verbatim, same source and dates as the PMU site (pmu-annakara-home
// components/Testimonials.tsx, from pmu-annakara.com's live review widget). Updated 2026-09-30.
export const PMU_REVIEWS: PmuReview[] = [
  {
    name: "Lauren Chaikin",
    date: "August 16, 2026",
    profileImage: "/images/pmu-reviews/lauren-chaikin.png",
    text: "I cannot recommend Anna highly enough! She did my permanent makeup, including both my eyeliner and eyebrows, and I couldn't be happier with the results. From start to finish, she was incredibly patient, meticulous, and made sure every detail was perfect. She took her time to ensure everything was precise and exactly right, and I always felt comfortable and well cared for throughout the entire process.\n\nThe final results are absolutely perfect — my eyeliner and eyebrows look so natural, beautifully shaped, and exactly what I was hoping for. Anna is truly talented, has an amazing eye for detail, and takes great pride in her work. If you're considering permanent makeup, I wholeheartedly recommend Anna. She exceeded all of my expectations, and I would absolutely trust her again!",
  },
  {
    name: "Karina Tikhutina",
    date: "May 16, 2026",
    text: "I recently had a lip blush (permanent lip makeup) done, and I couldn't be happier with the result. The contour is beautifully defined, and the color matches my natural shade perfectly — exactly what I was hoping for.\n\nI'm truly grateful to Anna for her professionalism, precision, and attention to detail. She made me feel comfortable throughout the entire process, and her work is incredibly аккуратное and high-quality.\n\nNow I catch myself admiring my lips all the time — they look so natural yet enhanced. It's such a confidence boost! I highly recommend Anna to anyone looking for subtle, elegant, and flawless results. She truly has an amazing eye for beauty and a very gentle touch.",
  },
  {
    name: "Maja Ceranic",
    date: "January 26, 2026",
    profileImage: "/images/pmu-reviews/maja-ceranic.png",
    text: "Anna is an expert in eyebrows and permanent make up. She is so talented and gives you that beautiful and natural look. Will always come back to her treatments.",
  },
  {
    name: "Ms. M",
    date: "November 12, 2025",
    profileImage: "/images/pmu-reviews/ms-m.png",
    text: "Getting a permanent eyeliner done can be pretty intimidating, not just because it's, well, pretty permanent (can last 5+ years), but also due to its proximity to eyes. I knew I could trust Anna 100% with such a delicate procedure. She has a great aesthetic vision, superb attention to detail, and an impeccable technique. Anna really does have a unique talent of making you look and feel more beautiful, she is very patient and also a wonderful person. I absolutely love my eyeliner, and I am so glad I finally had the courage to get it done. There was minimal pain, and I always felt like I was in good hands. The results are amazing and worth every penny. I highly recommend.",
  },
  {
    name: "Sheena Hinds",
    date: "October 17, 2025",
    profileImage: "/images/pmu-reviews/sheena-hinds.png",
    text: "Wow! Just wow! The most incredible experience from start to finish! Anna is an absolute perfectionist, and she took her time with my procedures (lip neutralization & intimate tattoing) I was nervous initially about finally having my intimate tattoing done, but I could not have picked a better Artist. There is no way to convey the time, focus and effort that Anna put in to achieving the perfect result and making sure I was happy. 10/10 I will be returning and 10/10 I recommend Anna for any permanent makeup you may be interested in getting. She is the best!",
  },
  {
    name: "Катерина Фришко",
    date: "August 2, 2025",
    profileImage: "/images/pmu-reviews/katerina-frishko.png",
    text: "excellent craftsmen, the best service in the city! I recommend!🩷🩷🩷",
  },
  {
    name: "Natasha D",
    date: "June 16, 2025",
    profileImage: "/images/pmu-reviews/natasha-d.png",
    text: "Big thanks to Anna for camouflaging my scar so beautifully! The results are amazing — you can barely see it now. Her salon is super clean and cozy, and she's so kind and easy to talk to. Highly recommend!",
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
//
// Resubmitted 2026-09-09 after the above fix, then rejected again 2026-09-10 for a *different*
// reason: 30488 ("Doing Business As (DBA) Name Must Be Accurately Provided") — this text now
// correctly named the legal entity, but the submission's own `doing_business_as` field was left
// blank, so the reviewer still couldn't connect "Anna Kara's Brow Studio LLC" (this text, and the
// name on file) to "Anna Kara's Beauty PMU Studio" (everywhere else on the site, including the
// opt-in screenshot itself). Fixed by setting `doing_business_as` on the existing verification
// (SID HH37077b216e9ff29ddd394ccb52fff503, via POST .../Tollfree/Verifications/{sid}) to "Anna
// Kara's Beauty PMU Studio" rather than touching this text again — the mismatch was in the filing
// metadata, not the copy shown to customers. Back to PENDING_REVIEW as of 2026-09-10.
export const PMU_SMS_CONSENT_TEXT =
  "By checking this box, I agree to receive recurring automated marketing text messages from Anna Kara's Brow Studio LLC — occasional discounts and first access to newly opened appointment slots — at the number provided. Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";
