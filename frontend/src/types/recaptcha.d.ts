/**
 * TypeScript declarations for Google reCAPTCHA v3
 */

declare global {
  interface Window {
    grecaptcha: ReCaptchaV3Instance;
    onRecaptchaLoad?: () => void;
  }
}

interface ReCaptchaV3Instance {
  ready: (callback: () => void) => void;
  execute: (
    siteKey: string,
    options: { action: string }
  ) => Promise<string>;
  render: (
    container: string | HTMLElement,
    parameters: ReCaptchaRenderParameters
  ) => number;
}

interface ReCaptchaRenderParameters {
  sitekey: string;
  badge?: 'bottomright' | 'bottomleft' | 'inline';
  size?: 'invisible';
  tabindex?: number;
}

export interface RecaptchaError {
  code: string;
  message: string;
}

export {};
