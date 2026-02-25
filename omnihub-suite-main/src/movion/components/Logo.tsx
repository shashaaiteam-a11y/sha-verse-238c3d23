// Movion Logo Component
import React from 'react';
import { PlayCircle } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-pink-600 rounded-lg transform rotate-12 shadow-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <PlayCircle 
          size={size * 0.65} 
          className="text-white drop-shadow-md" 
          fill="currentColor"
        />
      </div>
    </div>
  );
};

export default Logo;
