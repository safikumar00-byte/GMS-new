import React from 'react';
import { MemberStatus, PaymentStatus } from '../../types';

interface StatusBadgeProps {
  status: MemberStatus | PaymentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = String(status || '').toUpperCase();

  let dotColor = 'bg-neutral-400';
  let textColor = 'text-[#1c1917] dark:text-[#a6a09b]';
  let borderColor = 'border-[#d6d3d1] dark:border-[#44403b]';
  let bgColor = 'bg-transparent';

  if (norm === 'ACTIVE') {
    dotColor = 'bg-emerald-600 dark:bg-emerald-500';
    textColor = 'text-emerald-800 dark:text-emerald-400';
    borderColor = 'border-emerald-300 dark:border-emerald-800';
  } else if (norm === 'PAYMENT PENDING' || norm === 'PARTIAL' || norm === 'PENDING') {
    dotColor = 'bg-[#e17100]';
    textColor = 'text-[#e17100]';
    borderColor = 'border-[#e17100]/40';
  } else if (norm === 'EXPIRING SOON' || norm === 'EXPIRING') {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-700 dark:text-amber-400';
    borderColor = 'border-amber-300 dark:border-amber-800';
  } else if (norm === 'EXPIRED') {
    dotColor = 'bg-[#e7000b] dark:bg-[#c10007]';
    textColor = 'text-[#e7000b] dark:text-[#f87171]';
    borderColor = 'border-[#e7000b]/40';
  } else if (norm === 'PAID') {
    dotColor = 'bg-emerald-600 dark:bg-emerald-500';
    textColor = 'text-emerald-800 dark:text-emerald-400';
    borderColor = 'border-emerald-300 dark:border-emerald-800';
  } else if (norm === 'REFUNDED') {
    dotColor = 'bg-neutral-500';
    textColor = 'text-neutral-600 dark:text-neutral-400';
    borderColor = 'border-neutral-300 dark:border-neutral-700';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold border ${borderColor} ${bgColor} ${textColor} ${padding} rounded-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-none ${dotColor} inline-block`} />
      <span>{norm}</span>
    </span>
  );
};
