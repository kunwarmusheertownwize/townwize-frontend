// File:townwize-frontend\src\App.jsx

import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { StrictMode } from "react";
import OfflineBanner from "./components/OfflineBanner";
//import Navbar from "./components/shared/Navbar";

function App() {
  return (
    <StrictMode>
      <Router>
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
