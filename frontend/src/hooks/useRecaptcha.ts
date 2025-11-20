/**
 * Custom hook for Google reCAPTCHA v3 integration
 */

import { useState, useEffect, useCallback } from 'react';

// reCAPTCHA site key from environment variable
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

interface UseRecaptchaReturn {
  executeRecaptcha: (action: string) => Promise<string>;
  isLoaded: boolean;
  error: string | null;
}

/**
 * Hook for executing reCAPTCHA v3
 * Handles script loading, readiness, and token generation
 */
export const useRecaptcha = (): UseRecaptchaReturn => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if reCAPTCHA is already loaded
  useEffect(() => {
    const checkRecaptcha = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsLoaded(true);
          setError(null);
        });
      }
    };

    // Check immediately
    checkRecaptcha();

    // If not loaded, wait for the callback
    const existingCallback = window.onRecaptchaLoad;
    window.onRecaptchaLoad = () => {
      if (existingCallback) {
        existingCallback();
      }
      checkRecaptcha();
    };

    // Load the script dynamically if not already present
    const existingScript = document.querySelector(
      `script[src*="recaptcha/api.js"]`
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}&onload=onRecaptchaLoad`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        setError('reCAPTCHA yuklenmedi. Lutfen sayfayi yenileyin.');
        setIsLoaded(false);
      };

      document.head.appendChild(script);
    } else {
      // Script exists, check if it's already loaded
      checkRecaptcha();
    }

    return () => {
      // Clean up the callback on unmount
      if (window.onRecaptchaLoad === checkRecaptcha) {
        window.onRecaptchaLoad = existingCallback;
      }
    };
  }, []);

  /**
   * Execute reCAPTCHA and get a token
   * @param action - The action name for reCAPTCHA (e.g., 'register', 'login')
   * @returns Promise that resolves with the reCAPTCHA token
   */
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Check if reCAPTCHA is available
        if (!window.grecaptcha) {
          const errorMessage = 'reCAPTCHA yuklenmedi. Lutfen sayfayi yenileyin.';
          setError(errorMessage);
          reject(new Error(errorMessage));
          return;
        }

        // Execute reCAPTCHA
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(RECAPTCHA_SITE_KEY, { action })
            .then((token: string) => {
              setError(null);
              resolve(token);
            })
            .catch((err: Error) => {
              const errorMessage = 'reCAPTCHA dogrulamasi basarisiz oldu. Lutfen tekrar deneyin.';
              setError(errorMessage);
              reject(new Error(errorMessage));
            });
        });
      });
    },
    []
  );

  return {
    executeRecaptcha,
    isLoaded,
    error,
  };
};

export default useRecaptcha;
