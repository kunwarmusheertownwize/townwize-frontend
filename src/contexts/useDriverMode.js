//File: townwize-frontend\src\contexts\useDriverMode.js

import { useContext } from "react";
import { DriverModeContext } from "./DriverModeContextBase";

export const useDriverMode = () => {
  const ctx = useContext(DriverModeContext);
  if (!ctx) {
    throw new Error("useDriverMode must be used inside DriverModeProvider");
  }
  return ctx;
};
