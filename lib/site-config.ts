/**
 * Site-wide configuration.
 * To use a form: replace submitUrl with your Tally/Formspree/GitHub Issues URL.
 * To use email: "mailto:you@example.com?subject=Suggest+a+link"
 */
export const CONTACT_EMAIL = "contact@osspath.com"

export const SITE_CONFIG = {
  submitUrl: `mailto:${CONTACT_EMAIL}?subject=Suggest%20a%20link%20%E2%80%94%20OSSPath`,
} as const
