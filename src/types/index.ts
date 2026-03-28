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
}

export interface Officer {
  id: string;
  name: string;
  title: string;
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
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  recaptchaToken: string;
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
