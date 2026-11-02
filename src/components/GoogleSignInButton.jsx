import { useEffect, useRef } from "react";

const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";
let googleScriptPromise;
let initializedClientId = null;
let credentialHandler = null;

export const setGoogleCredentialHandler = (handler) => {
  credentialHandler = handler;
};

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Sign-In could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google Sign-In could not be loaded."));
    document.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
};

export default function GoogleSignInButton() {
  const buttonRoot = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let mounted = true;
    if (!clientId) {
      console.error("Google Sign-In is not configured: VITE_GOOGLE_CLIENT_ID is missing.");
      return undefined;
    }

    loadGoogleIdentityServices()
      .then((google) => {
        if (!mounted || !buttonRoot.current) return;
        if (initializedClientId !== clientId) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (!response?.credential) {
                console.error("Google did not return an ID token credential.");
                return;
              }
              Promise.resolve(credentialHandler?.(response.credential)).catch((error) => {
                console.error("Google authentication failed:", error);
              });
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          initializedClientId = clientId;
        }
        google.accounts.id.renderButton(buttonRoot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(buttonRoot.current.clientWidth || 320, 400),
        });
      })
      .catch((error) => console.error(error.message));

    return () => {
      mounted = false;
      if (buttonRoot.current) buttonRoot.current.replaceChildren();
    };
  }, [clientId]);

  return <div className="google-signin-host" ref={buttonRoot} aria-label="Continue with Google" />;
}
