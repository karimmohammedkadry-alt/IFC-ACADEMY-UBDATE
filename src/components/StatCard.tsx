import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  id: string;
  title: string;
  titleEn?: string;
  value: number | string;
  icon: LucideIcon;
  accentColor?: 'yellow' | 'emerald' | 'rose' | 'amber';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  titleEn,
  value,
  icon: Icon,
  accentColor = 'yellow',
  subtitle
}) => {
  const colorMap = {
    yellow: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-[#1f1f23] hover:border-yellow-400/50',
      glow: 'from-yellow-500/10 to-transparent',
      iconBg: 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400',
      textAccent: 'text-yellow-400'
    },
    emerald: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-[#1f1f23] hover:border-emerald-500/50',
      glow: 'from-emerald-500/10 to-transparent',
      iconBg: 'bg-emerald-400/10 border-emerald-400/25 text-emerald-400',
      textAccent: 'text-emerald-400'
    },
    rose: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-[#1f1f23] hover:border-rose-500/50',
      glow: 'from-rose-500/10 to-transparent',
      iconBg: 'bg-rose-400/10 border-rose-400/25 text-rose-400',
      textAccent: 'text-rose-400'
    },
    amber: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-[#1f1f23] hover:border-yellow-500/50',
      glow: 'from-yellow-500/10 to-transparent',
      iconBg: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
      textAccent: 'text-yellow-400'
    }
  };

  const style = colorMap[accentColor];

  return (
    <motion.div
      id={id}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`relative overflow-hidden rounded-2xl p-6 ${style.bg} border ${style.border} transition-all duration-300 shadow-xl shadow-black/40 group`}
    >
      {/* Subtle background radial glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${style.glow} rounded-full blur-2xl pointer-events-none`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          {titleEn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{titleEn}</span>
            </div>
          )}
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-sans">
              {value}
            </span>
            <span className="text-xs text-zinc-400 font-medium">لاعب</span>
          </div>

          {subtitle && (
            <p className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${style.iconBg} transition-transform group-hover:scale-105 duration-300`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>

      {/* Sport bottom bar line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
