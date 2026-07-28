// File:townwize-frontend\src\App.jsx

import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { StrictMode, useState } from "react";
import OfflineBanner from "./components/OfflineBanner";
import SplashScreen from "./components/SplashScreen";
import ActiveRideResume from "./components/common/ActiveRideResume";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { isNative } from "./utils/platform";

function App() {
  const [splashDone, setSplashDone] = useState(!isNative());

  return (
    <StrictMode>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <Router>
        {/* ActiveRideResume navigates on mount; if it throws, the whole app
            would previously have gone blank before rendering anything. */}
        <ErrorBoundary>
          <ActiveRideResume />
        </ErrorBoundary>
        <OfflineBanner />
        <div className="min-h-screen flex flex-col bg-townwize-bgLight dark:bg-townwize-bgDark text-townwize-textPrimary dark:text-white transition-colors">

          <main className="flex-grow">
            {/* Last line of defence: any uncaught render error in any screen
                shows a recovery screen instead of a white page. */}
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </main>
        </div>
      </Router>
    </StrictMode>
  );
}

export default App;
