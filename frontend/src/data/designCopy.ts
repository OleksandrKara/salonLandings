// Static marketing copy ported verbatim from the Cloud Design
// ("Russian Manicure Landing.dc.html") — headline, trust points, reviews, etc.
// Anything price-related is NOT here; that always comes live from the API.

import type { LandingVariantContent } from "@/types/api";
import nailartAbstractImg from "@/assets/work-nailart-abstract.jpg";
import redClassicImg from "@/assets/work-red-classic.jpg";
import yellowFloralImg from "@/assets/work-yellow-floral.jpg";
import reverseFrenchImg from "@/assets/work-reverse-french.jpg";
import gelOverlayImg from "@/assets/work-gel-overlay.jpg";
import milkyWhiteImg from "@/assets/work-milky-white.jpg";
import nudeBirdartImg from "@/assets/work-nude-birdart.jpg";
import almondFrenchImg from "@/assets/work-almond-french.jpg";
import pedicureImg from "@/assets/work-pedicure.jpg";
import mauveGlitterImg from "@/assets/work-mauve-glitter.jpg";
import gelExtensionsImg from "@/assets/work-gel-extensions.jpg";
import japanManiImg from "@/assets/work-japan-mani.jpg";

/** Every occurrence of "Russian" in this file's copy is the exact same branding word — a real
 * technique name in the industry ("Russian manicure" = precise dry-cuticle/e-file work, distinct
 * from "European manicure"'s softer cream-based cuticle care), but here it's used purely as this
 * business's marketing label for the one hard-gel service it offers. terminology: "european"
 * tests whether that label alone (not the underlying service) converts differently — a plain
 * find/replace is correct for that, since nothing about the described service actually changes.
 */
export function terminologize(text: string, terminology?: LandingVariantContent["terminology"]): string {
  return terminology === "european" ? text.replace(/Russian/g, "European") : text;
}

export const HEADLINE = "Russian Hard Gel Manicure in Downtown San Diego";
export const SUBHEAD = "Long-lasting, chip-free nails up to 4 weeks — trusted by 534+ local clients.";

export const CREDIBILITY_STATS = [
  { value: "4.7★", label: "113 Google reviews" },
  { value: "4 wks", label: "chip-free wear" },
  { value: "100%", label: "acrylic-free" },
];

export const TRUST_POINTS = [
  { no: "01", title: "No acrylics, ever", desc: "Hard gel & gel polish only — kinder to your natural nails." },
  { no: "02", title: "Russian cuticle work", desc: "Precise dry-cuticle technique for a clean, flawless finish." },
  {
    no: "03",
    title: "2-week guarantee",
    desc: "Not happy? We fix it free within 14 days — your satisfaction is covered.",
  },
  { no: "04", title: "Clean & hygienic", desc: "Sanitized tools and careful standards every single visit." },
];

export interface CarouselSlide {
  id: string;
  src: string;
  badge: string;
  caption: string;
  sub: string;
}

// First 5 slides render (and load) immediately; the rest only mount once the visitor taps
// "See More Photos" in ResultsCarousel — this is a paid-ads landing page, so the initial page
// load must not pay for all 12 photos when 5 is enough to show the carousel is real and full.
export const CAROUSEL_SLIDES: CarouselSlide[] = [
  { id: "slNailArt", src: nailartAbstractImg, badge: "Nail Art", caption: "Gel Nail Extension with Nail Art", sub: "Long-lasting length, custom design" },
  { id: "slRedClassic", src: redClassicImg, badge: "Manicure", caption: "Russian Hard Gel Manicure", sub: "Classic red, high-shine finish" },
  { id: "slYellowFloral", src: yellowFloralImg, badge: "Nail Art", caption: "Butter yellow with floral accent", sub: "Sculpted 3D nail art detail" },
  { id: "slReverseFrench", src: reverseFrenchImg, badge: "Design", caption: "Ombre Design", sub: "Soft nude-to-white gradient tips" },
  { id: "slGelOverlay", src: gelOverlayImg, badge: "Manicure", caption: "Gel-overlay manicure", sub: "Smooth, durable structured gel" },
  { id: "slMilkyWhite", src: milkyWhiteImg, badge: "Manicure", caption: "Russian Hard Gel Manicure", sub: "Soft, glossy, on-trend finish" },
  { id: "slNudeBirdart", src: nudeBirdartImg, badge: "Nail Art", caption: "Nude manicure with bird art", sub: "Delicate hand-painted detail" },
  { id: "slAlmondFrench", src: almondFrenchImg, badge: "Manicure", caption: "Russian Hard Gel Manicure", sub: "Classic white tip, natural base" },
  { id: "slPedicure", src: pedicureImg, badge: "Pedicure", caption: "Dry Russian Pedicure", sub: "Dry technique, no foot soak" },
  { id: "slMauveGlitter", src: mauveGlitterImg, badge: "Design", caption: "Russian Hard Gel Manicure", sub: "Subtle shimmer, gold glitter finish" },
  { id: "slGelExtensions", src: gelExtensionsImg, badge: "Nail Extensions", caption: "Gel nail extensions", sub: "Long-lasting sculpted length, floral art" },
  { id: "slJapanMani", src: japanManiImg, badge: "Manicure", caption: "Japanese Manicure", sub: "Clean, healthy, everyday finish" },
];

export const CAROUSEL_INITIAL_COUNT = 5;

export const WHY_CLIENTS_STAY = [
  "Long-lasting wear — up to 4 full weeks",
  "High-precision Russian manicure technique",
  "Natural nail-health first, no damage",
  "Clean, modern, calm salon experience",
  "Trusted by 534+ recurring local clients",
];

export interface Review {
  initial: string;
  name: string;
  date: string;
  stars: string;
  text: string;
}

export const REVIEWS: Review[] = [
  {
    initial: "J",
    name: "Jessica M.",
    date: "2 weeks ago",
    stars: "★★★★★",
    text: "Best Russian manicure I've had in San Diego. Cuticles were flawless and it's still perfect after 3 weeks — no chips at all.",
  },
  {
    initial: "A",
    name: "Alina R.",
    date: "1 month ago",
    stars: "★★★★★",
    text: "So clean and precise. No acrylic, just healthy natural nails with a gorgeous glossy finish. Downtown location is easy too.",
  },
  {
    initial: "D",
    name: "Daniela K.",
    date: "1 month ago",
    stars: "★★★★★",
    text: "Finally a place that does a true Russian manicure. Super hygienic, relaxing, and they even offered me tea. Booking again for sure.",
  },
];

export const MORE_REVIEWS: Review[] = [
  {
    initial: "M",
    name: "Marisol T.",
    date: "2 months ago",
    stars: "★★★★★",
    text: "The attention to detail is unreal. My nails have never looked this clean. Worth every penny of the first-visit price.",
  },
  {
    initial: "S",
    name: "Sophia L.",
    date: "2 months ago",
    stars: "★★★★★",
    text: "Booked from Instagram and it looked exactly like the photos. Lasted almost 4 weeks with zero lifting. Highly recommend.",
  },
  {
    initial: "V",
    name: "Valeria P.",
    date: "3 months ago",
    stars: "★★★★★",
    text: "Beautiful studio, spotless tools, and the most precise cuticle work I've seen. My new go-to in Downtown SD.",
  },
];

export const LOCATION = {
  name: "AK.LUX.NAILS",
  address: "1357 Seventh Ave, Ste C, San Diego, CA 92101",
  note: "Street parking available on 7th Ave · Open 7 days a week by appointment",
};

export const CANCELLATION_POLICY_TEXT = `We ask that you please reschedule or cancel at least 24 hours before your appointment, or you may be charged a cancellation fee of $25.00.

CANCELLATION & NO-SHOW
• Missed appointments or cancellations made with less than 24 hours' notice will incur a $25 fee.
• This policy helps us respect the time of our nail technicians and accommodate other clients waiting for an opening.

We understand that emergencies happen, and we will always do our best to accommodate when possible. Thank you for respecting our time and the time of our masters.

SERVICE SATISFACTION & NO REFUND
At AK.LUX.NAILS, we take great pride in the quality of our work and stand behind every service we provide. Please note:
• All services are non-refundable once completed.
• By booking, you agree that results are subjective and may vary based on personal preference.
• We strongly encourage clients to communicate their preferences during the appointment to ensure the desired result.

If you are not fully satisfied:
• You must notify us within 48 hours of your appointment.
• We offer a complimentary fix within 14 days.

Refunds will not be issued for dissatisfaction after the service has been completed.

IMPORTANT
Failure to contact us within the specified time frame or refusal of a correction appointment will void any service guarantee.

By booking an appointment, you agree to our cancellation and no-refund policy.

Warmly,
AK.LUX.NAILS`;

export const SMS_CONSENT_TEXT =
  "By checking this box, I agree to receive recurring automated marketing & appointment text messages (offers, promotions & reminders) from AK.LUX.NAILS at the number I provided. Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";
