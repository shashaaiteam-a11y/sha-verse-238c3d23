import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OfflinePage = () => {
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  const checkConnection = async () => {
    setIsChecking(true);
    
    // Wait a bit for connection check
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (navigator.onLine) {
      const redirectPath = sessionStorage.getItem('offline_redirect') || '/';
      sessionStorage.removeItem('offline_redirect');
      navigate(redirectPath);
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    const handleOnline = () => {
      const redirectPath = sessionStorage.getItem('offline_redirect') || '/';
      sessionStorage.removeItem('offline_redirect');
      navigate(redirectPath);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-6 text-center safe-all">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        It looks like you've lost your internet connection. Please check your network settings and try again.
      </p>
      
      <Button 
        onClick={checkConnection}
        disabled={isChecking}
        className="gap-2 touch-target-lg"
        size="lg"
      >
        <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking...' : 'Try Again'}
      </Button>
      
      <p className="text-xs text-muted-foreground mt-8">
        The app will automatically reconnect when your connection is restored.
      </p>
    </div>
  );
};

export default OfflinePage;
