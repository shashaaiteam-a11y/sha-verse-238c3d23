import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate } from 'react-router-dom';

interface MobileContextType {
  isOnline: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isCapacitor: boolean;
  orientation: 'portrait' | 'landscape';
  hapticFeedback: (style?: ImpactStyle) => void;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

const getScreenSize = (width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
  if (width < 375) return 'xs';
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  return 'xl';
};

export const MobileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  
  const isCapacitor = typeof window !== 'undefined' && 
    (window as any).Capacitor !== undefined;

  useEffect(() => {
    // Initialize Capacitor plugins
    const initCapacitor = async () => {
      if (isCapacitor) {
        try {
          // Hide splash screen after app loads
          await SplashScreen.hide();
          
          // Set status bar style
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#2563eb' });
        } catch (error) {
          console.log('Capacitor plugins not available:', error);
        }
      }
    };

    initCapacitor();

    // Network status listener
    const setupNetworkListener = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);

        Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
        });
      } catch (error) {
        // Fallback for web
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
      }
    };

    setupNetworkListener();

    // Screen size detection
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setOrientation(height > width ? 'portrait' : 'landscape');
      setScreenSize(getScreenSize(width));
    };

    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);

    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
      Network.removeAllListeners();
    };
  }, [isCapacitor]);

  // Redirect to offline page when connection is lost
  useEffect(() => {
    if (!isOnline && window.location.pathname !== '/offline') {
      // Store current path for redirect after reconnection
      sessionStorage.setItem('offline_redirect', window.location.pathname);
    }
  }, [isOnline]);

  const hapticFeedback = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (isCapacitor) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptics not available');
      }
    }
  };

  return (
    <MobileContext.Provider value={{
      isOnline,
      isMobile,
      isTablet,
      isCapacitor,
      orientation,
      hapticFeedback,
      screenSize,
    }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
};
