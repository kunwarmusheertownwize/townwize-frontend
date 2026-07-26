// File:townwize-frontend\src\App.jsx

import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { StrictMode, useState } from "react";
import OfflineBanner from "./components/OfflineBanner";
import SplashScreen from "./components/SplashScreen";
import ActiveRideResume from "./components/common/ActiveRideResume";
import { isNative } from "./utils/platform";

function App() {
  const [splashDone, setSplashDone] = useState(!isNative());

  return (
    <StrictMode>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <Router>
        <ActiveRideResume />
        <OfflineBanner />
        <div className="min-h-screen flex flex-col bg-townwize-bgLight dark:bg-townwize-bgDark text-townwize-textPrimary dark:text-white transition-colors">

          <main className="flex-grow">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </StrictMode>
  );
}

export default App;