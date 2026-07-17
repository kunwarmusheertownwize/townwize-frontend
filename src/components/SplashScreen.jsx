import { useEffect, useState } from "react";
import { isNative } from "../utils/platform";

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("enter"); // "enter" | "exit"

  useEffect(() => {
    if (isNative()) {
      import("@capacitor/splash-screen").then(({ SplashScreen: CapSplash }) => {
        CapSplash.hide({ fadeOutDuration: 0 });
      });
    }

    // Match this to the GIF duration — currently 2.5s play + 0.5s fade
    const exitTimer = setTimeout(() => setPhase("exit"), 2500);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#08110F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation:
          phase === "exit"
            ? "tw-splash-out 0.5s ease forwards"
            : undefined,
      }}
    >
      <img
        src={import.meta.env.VITE_APP_ROLE === "driver" ? "/images/splash-wizer.gif" : "/images/splash-animated.gif"}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />

      <style>{`
        @keyframes tw-splash-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
