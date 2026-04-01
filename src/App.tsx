/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Search, FileText, User } from 'lucide-react';
import { Slot } from './types';
import { setupLeafletIcons } from './constants';
import Home from './components/Home';
import SlotDetails from './components/SlotDetails';
import BookingConfirmation from './components/BookingConfirmation';
import Bookings from './components/Bookings';
import MySlots from './components/MySlots';
import Profile from './components/Profile';
import Login from './components/Login';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './AuthContext';
import { CurrencyProvider } from './CurrencyContext';
import { LocationProvider } from './LocationContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [mainView, setMainView] = useState<'explore' | 'bookings' | 'myslots' | 'profile'>('explore');
  const [currentView, setCurrentView] = useState<'home' | 'details' | 'confirmation'>('home');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [hideNav, setHideNav] = useState(false);

  useEffect(() => {
    setupLeafletIcons();
  }, []);

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setCurrentView('details');
  };

  const handleBookNow = () => {
    setCurrentView('confirmation');
  };

  const handleNavigateToExplore = () => {
    setMainView('explore');
    setCurrentView('home');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <img 
            src="/img/logo-symb.svg" 
            alt="Loading..." 
            className="w-20 h-20 object-contain"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {mainView === 'explore' ? (
            <motion.div
              key="explore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <AnimatePresence mode="wait">
                {currentView === 'home' ? (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full w-full"
                  >
                    <Home onSelectSlot={handleSelectSlot} />
                  </motion.div>
                ) : currentView === 'details' ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full w-full"
                  >
                    {selectedSlot && (
                      <SlotDetails 
                        slot={selectedSlot} 
                        onBack={() => setCurrentView('home')} 
                        onBookNow={handleBookNow}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-full w-full"
                  >
                    {selectedSlot && (
                      <BookingConfirmation 
                        slot={selectedSlot} 
                        onBack={() => setCurrentView('details')} 
                        onSuccess={() => {
                          setMainView('bookings');
                          setCurrentView('home');
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : mainView === 'bookings' ? (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full w-full"
            >
              <Bookings setActiveTab={(tab: any) => setMainView(tab)} />
            </motion.div>
          ) : mainView === 'myslots' ? (
            <motion.div
              key="myslots"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full w-full"
            >
              <MySlots onFormToggle={setHideNav} />
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full w-full"
            >
              <Profile onSelectSlot={handleSelectSlot} initialView="main" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Bottom Navigation */}
      {!(mainView === 'explore' && currentView !== 'home') && !hideNav && (
        <Navigation activeTab={mainView} setActiveTab={(tab: any) => {
          setMainView(tab);
          if (tab === 'explore') setCurrentView('home');
        }} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <LocationProvider>
          <div className="h-screen bg-white overflow-hidden font-sans">
            <Toaster position="top-center" richColors />
            <AppContent />
          </div>
        </LocationProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
