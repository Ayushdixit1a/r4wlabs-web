// Brand and contact details used across the site.
export const SITE = {
  email: 'r4wlabs@gmail.com',
  phone: '+91 85950 55726',
  whatsapp: '918595055726',
  instagram: 'https://www.instagram.com/r4w.labs/',
  whatsappMessage: 'Hi R4W LABS! I’d like to share a little about my business and see how you could help it grow. Could we talk?',
};

export const whatsappLink = (message = SITE.whatsappMessage) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
