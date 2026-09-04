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
  /** Add a surcharge covering the card processing fee to online payments. */
  passCardFee?: boolean;
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

// --- Store / Products ---

/** A priced option for a product (e.g. "Sign — $20", "Sign + Bracket — $22.50"). */
export interface ProductVariant {
  id: string;
  name: string;
  description?: string;
  price: number;
}

export type ProductFieldType = "text" | "textarea" | "number" | "select" | "checkbox";

/** A custom input the admin defines per product (e.g. address digits, mounting). */
export interface ProductField {
  id: string;
  label: string;
  type: ProductFieldType;
  required?: boolean;
  /** Choices for `select` fields. */
  options?: string[];
  placeholder?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  published: boolean;
  pinned?: boolean;
  /** Whether the product can currently be purchased (separate from being listed). */
  available?: boolean;
  /** Add a surcharge covering the card processing fee to the customer's total. */
  passCardFee?: boolean;
  /** Collect a mailing address in the order form (required when enabled). */
  collectAddress?: boolean;
  variants: ProductVariant[];
  fields: ProductField[];
}

export interface MailingAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface ProductOrder {
  id: string;
  productId: string;
  productTitle: string;
  name: string;
  email: string;
  phone: string;
  /** Mailing address, present when the product has address collection enabled. */
  address?: MailingAddress;
  items: { optionId: string; name: string; quantity: number; price: number }[];
  /** Answers to the product's custom fields, captured at order time. */
  fields: { fieldId: string; label: string; value: string }[];
  total: number;
  paymentMethod: "stripe";
  paymentStatus: "pending" | "paid" | "failed";
  stripeSessionId?: string;
  refundStatus?: string;
  refundId?: string;
  refundedAt?: string;
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
  productsCount: number;
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

/** A named fundraising campaign donations can be earmarked for. */
export interface Fund {
  id: string;
  name: string;
  /** URL-safe identifier stored on each donation (e.g. "fire-boat"). */
  slug: string;
  description?: string;
  /** Fundraising target in dollars. Omit for open-ended funds. */
  goal?: number;
  /** Inactive funds are hidden from the donate page but keep their history. */
  active: boolean;
  /** Show a public progress page at /funds/[slug]. */
  showProgress?: boolean;
  createdAt: string;
}

export type DonationSource = "stripe" | "manual";
export type ManualPaymentMethod = "cash" | "check" | "other";

export interface Donation {
  id: string;
  amount: number;
  name: string;
  email: string;
  /** Fund slug; missing or "general" means the general fund. */
  fund?: string;
  paymentStatus: "pending" | "paid" | "failed";
  /** "stripe" for online gifts, "manual" for in-person gifts entered by an admin. */
  source?: DonationSource;
  paymentMethod?: ManualPaymentMethod;
  /** Free-form note for manual entries, e.g. check number. */
  note?: string;
  /** Email of the admin who recorded a manual donation. */
  enteredBy?: string;
  stripeSessionId?: string;
  /** ISO timestamp; for manual entries this is the date the gift was received. */
  createdAt: string;
}
