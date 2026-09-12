import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  isAccent?: boolean;
  isDestructive?: boolean;
  isWarning?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  isAccent = false,
  isDestructive = false,
  isWarning = false,
  className = '',
  onClick,
}) => {
  let accentBorder = 'border-[#d6d3d1] dark:border-[#44403b]';
  let valueColor = 'text-[#171717] dark:text-[#f5f5f5]';

  if (isAccent) {
    accentBorder = 'border-[#e17100]';
    valueColor = 'text-[#e17100]';
  } else if (isDestructive) {
    valueColor = 'text-[#e7000b] dark:text-[#f87171]';
  } else if (isWarning) {
    valueColor = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-[#f5f5f5] dark:bg-[#171717] border ${accentBorder} rounded-none flex flex-col justify-between transition-colors ${
        onClick ? 'cursor-pointer hover:border-[#e17100]' : ''
      } ${className}`}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#a8a29e] mb-2 font-medium">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>
        {value}
      </div>
      {subValue && (
        <div className="mt-2 text-[10px] font-mono uppercase tracking-wide text-[#78716c] dark:text-[#a8a29e]">
          {subValue}
        </div>
      )}
    </div>
  );
};
