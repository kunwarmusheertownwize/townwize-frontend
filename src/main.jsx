// File: townwize-frontend\src\main.jsx
// Force remove dark class before anything renders (default to light mode)
//document.documentElement.classList.remove('dark');

import { StrictMode } from 'react';
console.log("🌐 Starting BT Rides app...");
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext"; 
import "./i18n";

// ✅ Capacitor WebView SPA navigation fix
if (window.Capacitor && window.Capacitor.Plugins && !window.history.pushState._patched) {
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;

  const notify = () => {
    const evt = new Event('popstate');
    window.dispatchEvent(evt);
  };

  window.history.pushState = function () {
    const result = originalPush.apply(this, arguments);
    notify();
    return result;
  };

  window.history.replaceState = function () {
    const result = originalReplace.apply(this, arguments);
    notify();
    return result;
  };
  window.history.pushState._patched = true;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <ToastContainer position="bottom-center" autoClose={3000} />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
);

