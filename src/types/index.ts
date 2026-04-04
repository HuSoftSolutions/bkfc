export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  order: number;
  createdAt: string;
}

export interface Call {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  images?: string[];
  slug: string;
  pinned?: boolean;
  // Delayed disclosure fields
  status?: "pending" | "published";
  releaseAt?: string;
  source?: "manual" | "iar";
  rawPayload?: string;
}

export interface Officer {
  id: string;
  name: string;
  /** @deprecated Use ranks instead */
  title?: string;
  /** @deprecated Use ranks instead */
  rank?: string;
  ranks: string[];
  servingSince?: string;
  image?: string;
  order: number;
}

export interface Apparatus {
  id: string;
  name: string;
  designation: string;
  description: string;
  specs: string[];
  image: string;
  images?: string[];
  order: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image: string;
  date: string;
  published: boolean;
  pinned?: boolean;
}

export interface TicketOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  maxQuantity?: number;
  soldCount?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
  image: string;
  published: boolean;
  // Ticketing
  pinned?: boolean;
  ticketingEnabled?: boolean;
  payInPerson?: boolean;
  ticketOptions?: TicketOption[];
  registrationDeadline?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  items: { optionId: string; name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: "stripe" | "in-person";
  paymentStatus: "pending" | "paid" | "failed";
  stripeSessionId?: string;
  createdAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  recaptchaToken: string;
}

export interface HomePageFeedSettings {
  newsCount: number;
  eventsCount: number;
  callsCount: number;
}

export interface VolunteerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  message?: string;
  recaptchaToken: string;
}
