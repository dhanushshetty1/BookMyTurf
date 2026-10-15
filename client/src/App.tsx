import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar/Navbar';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Turfs from './pages/Turfs/Turfs';
import TurfDetails from './pages/TurfDetails/TurfDetails';
import About from './pages/About/About';
import BookingSuccess from './pages/BookingSuccess';
import Dashboard from './pages/Dashboard/Dashboard';
import OwnerTurfs from './pages/owner/OwnerTurfs/OwnerTurfs';

import { ThemeProvider } from './context/ThemeContext';
import LoadingScreen from './components/common/LoadingScreen';
import Onboarding from './components/onboarding/Onboarding';

const STORAGE_KEY = "bookmyturf:onboarding-complete";

function App() {
  const [phase, setPhase] = useState<'splash' | 'onboarding' | 'app'>('splash');

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY) === "true";
    
    // Simulate initial loading/splash duration
    const timer = setTimeout(() => {
      if (hasCompletedOnboarding) {
        setPhase('app');
      } else {
        setPhase('onboarding');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setPhase('app');
  };

  return (
    <ThemeProvider>
      <AnimatePresence mode="wait">
        {phase === 'splash' && (
          <LoadingScreen key="splash" />
        )}
        
        {phase === 'onboarding' && (
          <Onboarding key="onboarding" onComplete={handleOnboardingComplete} />
        )}

        {phase === 'app' && (
          <Router key="app-router">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/turfs" element={<Turfs />} />
              <Route path="/turfs/:id" element={<TurfDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/owner" element={<OwnerTurfs />} />
            </Routes>
          </Router>
        )}
      </AnimatePresence>
    </ThemeProvider>
  );
}

export default App;
