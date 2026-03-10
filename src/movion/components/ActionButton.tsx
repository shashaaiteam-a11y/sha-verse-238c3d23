// Movion Action Button Component
import React from 'react';
import { cn } from '@/lib/utils';
import { useMovionStore } from '../store';
import { AnalyticsEventType } from '../types';

interface ActionButtonProps {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  type?: AnalyticsEventType;
  videoId?: string;
  payload?: any;
  onClick?: () => void;
  variant?: 'default' | 'pill' | 'ghost';
  className?: string;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  active = false,
  type,
  videoId,
  payload,
  onClick,
  variant = 'default',
  className = '',
  disabled = false
}) => {
  const { emitEvent } = useMovionStore();

  const handleClick = () => {
    if (disabled) return;
    
    if (type && videoId) {
      emitEvent({ type, videoId, payload });
    }
    onClick?.();
  };

  const baseStyles = "flex items-center justify-center transition-all active:scale-95";
  
  const variantStyles = {
    default: cn(
      "flex-col gap-1 p-2 rounded-xl",
      active ? "text-blue-600" : "text-[#030303] hover:bg-[#f2f2f2]"
    ),
    pill: cn(
      "gap-2 px-4 py-2 rounded-full font-bold text-sm",
      active ? "text-blue-600" : "text-[#030303]"
    ),
    ghost: cn(
      "p-2 rounded-full",
      active ? "text-blue-600" : "text-[#606060] hover:text-[#030303] hover:bg-[#f2f2f2]"
    )
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {icon}
      {label && <span className="text-xs font-bold">{label}</span>}
    </button>
  );
};

export default ActionButton;
