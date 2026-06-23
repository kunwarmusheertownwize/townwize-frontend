import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onSuccess, label = "continue_with" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const initButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onSuccess(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        text: label,
        size: "large",
        width: containerRef.current.offsetWidth || 380,
      });
    };

    if (window.google?.accounts?.id) {
      initButton();
    } else {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi"]');
      if (existing) {
        existing.addEventListener("load", initButton);
        return () => existing.removeEventListener("load", initButton);
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initButton;
      document.head.appendChild(script);
    }

    return () => {
      window.google?.accounts?.id?.cancel?.();
    };
  }, [onSuccess, label]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="w-full flex justify-center" />;
}
