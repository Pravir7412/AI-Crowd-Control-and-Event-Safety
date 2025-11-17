import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  timestamp: string;
  location?: string;
  actions?: string[];
  mapLink?: string;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    
    setAlerts(prev => [newAlert, ...prev]);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{
      alerts,
      addAlert,
      dismissAlert,
      clearAllAlerts
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlertContext = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
};