export type HolidayActivityLevel = "easy" | "moderate" | "active";
export type HolidayPriceMode = "on-request" | "from" | "fixed";
export type HolidayMediaRole = "thumbnail" | "hero" | "gallery" | "map" | "faq" | string;

export interface HolidayDuration {
  days: number;
  nights: number;
}

export interface HolidayPrice {
  mode: HolidayPriceMode;
  currency: string;
  amount: number | null;
  note?: string;
}

export interface HolidayItineraryDay {
  day: number;
  title: string;
  base?: string;
  overnight?: string;
  description: string;
  destinations: string[];
  attractions: string[];
  activities: string[];
}

export interface HolidayMediaItem {
  role: HolidayMediaRole;
  file: string;
  alt: string;
}

export interface HolidayMedia {
  alt: string;
  heroImage?: string;
  thumbnailImage?: string;
  images: HolidayMediaItem[];
}

export interface HolidayCTA {
  type: "enquiry" | string;
  label: string;
}

export interface HolidayPackage {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  duration: HolidayDuration;
  price: HolidayPrice;
  bestFor: string[];
  activityLevel: HolidayActivityLevel;
  seasonNote?: string;
  route: string[];
  destinations: string[];
  attractions: string[];
  activities: string[];
  itinerary: HolidayItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  customizable: boolean;
  cta: HolidayCTA;
  contentFile: string;
  media: HolidayMedia;
}

export interface HolidayCategory {
  slug: string;
  name: string;
  description: string;
  contentFile?: string;
  media?: HolidayMedia;
}
