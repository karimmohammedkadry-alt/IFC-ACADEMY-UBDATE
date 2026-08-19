import React from 'react';
import { PlayerStatus, SubscriptionStatus, AttendanceStatus, PaymentMethod } from '../types';

interface StatusBadgeProps {
  status: PlayerStatus | SubscriptionStatus | AttendanceStatus | string;
  type?: 'player' | 'subscription' | 'attendance' | 'group' | 'paymentMethod';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'player', className = '' }) => {
  let badgeStyle = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let dotStyle = 'bg-zinc-400';
  let label = status;

  if (type === 'player') {
    if (status === 'Active' || status === 'نشط') {
      badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      dotStyle = 'bg-emerald-400 animate-pulse';
      label = 'نشط (Active)';
    } else {
      badgeStyle = 'bg-zinc-800/80 text-zinc-400 border-zinc-700';
      dotStyle = 'bg-zinc-500';
      label = 'غير نشط (Inactive)';
    }
  } else if (type === 'subscription') {
    if (status === 'Paid' || status === 'مدفوع') {
      badgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      dotStyle = 'bg-emerald-400';
      label = 'ساري / مدفوع';
    } else if (status === 'ExpiringSoon' || status === 'أوشك على الانتهاء' || status === 'قريب من الانتهاء') {
      badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20';
      dotStyle = 'bg-amber-400 animate-ping';
      label = 'أوشك على الانتهاء (≤ 3 أيام)';
    } else if (status === 'Unpaid' || status === 'غير مدفوع') {
      badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      dotStyle = 'bg-rose-400';
      label = 'غير مدفوع (Unpaid)';
    } else if (status === 'Expired' || status === 'منتهي') {
      badgeStyle = 'bg-red-500/20 text-red-300 border-red-500/40';
      dotStyle = 'bg-red-500';
      label = 'منتهي (Expired)';
    }
  } else if (type === 'attendance') {
    if (status === 'Present' || status === 'حاضر') {
      badgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      dotStyle = 'bg-emerald-400';
      label = 'حاضر (Present)';
    } else {
      badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      dotStyle = 'bg-rose-400';
      label = 'غائب (Absent)';
    }
  } else if (type === 'group') {
    if (status === 'براعم') {
      badgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      dotStyle = 'bg-amber-400';
      label = 'براعم';
    } else if (status === 'ناشئين') {
      badgeStyle = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
      dotStyle = 'bg-yellow-400';
      label = 'ناشئين';
    } else if (status === 'شباب') {
      badgeStyle = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
      dotStyle = 'bg-orange-400';
      label = 'شباب';
    }
  } else if (type === 'paymentMethod') {
    if (status === 'Cash') {
      badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      label = 'كاش (Cash)';
    } else if (status === 'Wallet') {
      badgeStyle = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      label = 'محفظة (Wallet)';
    } else if (status === 'InstaPay') {
      badgeStyle = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      label = 'إنستاباي (InstaPay)';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle} ${className} whitespace-nowrap`}
    >
      {type !== 'paymentMethod' && <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />}
      <span>{label}</span>
    </span>
  );
};
