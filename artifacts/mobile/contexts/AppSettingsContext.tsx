import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '@/lib/query-client';

export interface AppSettings {
  primaryColor: string;
  primaryLightColor: string;
  secondaryColor: string;
  successColor: string;
  appName: string;
  appSlogan: string;
  appLogo: string;
  contactEmail: string;
  contactPhone: string;
  minPrice: string;
  maxPrice: string;
  urgentMultiplier: string;
  expressMultiplier: string;
  platformCommission: string;
  searchRadius: string;
  offerExpiry: string;
  locationInterval: string;
  enableSignature: string;
  maintenanceMode: string;
  maintenanceMessage: string;
}

const defaultSettings: AppSettings = {
  primaryColor: '#1E3A8A',
  primaryLightColor: '#3B82F6',
  secondaryColor: '#D97706',
  successColor: '#10B981',
  appName: 'FAYAGE',
  appSlogan: 'Transport rapide et fiable',
  appLogo: '',
  contactEmail: 'contact@fayage.ma',
  contactPhone: '+212 5XX-XXXXXX',
  minPrice: '50',
  maxPrice: '5000',
  urgentMultiplier: '1.5',
  expressMultiplier: '2',
  platformCommission: '10',
  searchRadius: '10',
  offerExpiry: '30',
  locationInterval: '15',
  enableSignature: 'true',
  maintenanceMode: 'false',
  maintenanceMessage: '',
};

interface AppSettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  refreshSettings: () => Promise<void>;
  checkMaintenance: () => Promise<void>;
  getColor: (key: 'primary' | 'primaryLight' | 'secondary' | 'success') => string;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const checkMaintenance = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL('/api/maintenance-status', apiUrl).toString());
      const data = await response.json();
      
      if (data.success) {
        setIsMaintenanceMode(data.maintenanceMode);
        setMaintenanceMessage(data.message || '');
      }
    } catch (error) {
      console.log('Could not check maintenance status');
    }
  };

  const fetchSettings = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL('/api/admin/settings', apiUrl).toString());
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      }
    } catch (error) {
      console.log('Using default settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkMaintenance();
    fetchSettings();
    
    const interval = setInterval(() => {
      checkMaintenance();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshSettings = async () => {
    setIsLoading(true);
    await fetchSettings();
    await checkMaintenance();
  };

  const getColor = (key: 'primary' | 'primaryLight' | 'secondary' | 'success'): string => {
    switch (key) {
      case 'primary':
        return settings.primaryColor || defaultSettings.primaryColor;
      case 'primaryLight':
        return settings.primaryLightColor || defaultSettings.primaryLightColor;
      case 'secondary':
        return settings.secondaryColor || defaultSettings.secondaryColor;
      case 'success':
        return settings.successColor || defaultSettings.successColor;
      default:
        return defaultSettings.primaryColor;
    }
  };

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading, isMaintenanceMode, maintenanceMessage, refreshSettings, checkMaintenance, getColor }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
