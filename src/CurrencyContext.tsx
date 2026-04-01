import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  currencySymbol: string;
  setCurrencyByCountryCode: (countryCode: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencySymbol] = useState('₹'); // Default to India as requested

  const setCurrencyByCountryCode = (countryCode: string) => {
    // Force Rupees as requested: "The currency displayed will be Rupees, not Dollars."
    // setCurrencySymbol('₹'); 
  };

  return (
    <CurrencyContext.Provider value={{ currencySymbol, setCurrencyByCountryCode }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
