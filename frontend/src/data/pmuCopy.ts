// Real data, sourced 2026-08-19: reviews pasted from Google by the business owner. Address
// corrected by the owner 2026-08-19 (studio operates from the same location as AK.LUX.NAILS, not
// pmu-annakara.com's own listed University Ave address); no phone number shown on this page per
// the owner's own request. See docs/multi-tenant-akpmu-design.md.

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
