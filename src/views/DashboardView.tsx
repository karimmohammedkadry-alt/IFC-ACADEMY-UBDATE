import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, UserCheck, UserX, UserPlus, CreditCard, CalendarCheck, TrendingUp, DollarSign, Eye, EyeOff, WalletCards } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DashboardStats, FinancialOverviewStats } from '../types';
import { api } from '../services/api';
import { NavTab } from '../components/Navbar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAddPlayer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAddPlayer }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    activePlayers: 0,
    inactivePlayers: 0,
    paidThisMonth: 0,
    unpaidThisMonth: 0,
    attendanceTodayCount: 0
  });
  const [financialStats, setFinancialStats] = useState<FinancialOverviewStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalSalaries: 0,
    netBalance: 0,
    paymentsCount: 0,
    transactionsCount: 0
  });
  const [showRevenue, setShowRevenue] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [dashData, finData] = await Promise.all([
          api.getDashboardStats(),
          api.getFinancialStats()
        ]);
        setStats(dashData);
        setFinancialStats(finData);
      } catch (e) {
        console.error('Failed to load dashboard stats', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="border-b border-[#1f1f23] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">
            <span>IFC ACADEMY • لوحة التحكم</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            نظرة عامة على الأكاديمية
          </h1>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddPlayer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition-all shadow-lg shadow-yellow-400/10 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة لاعب جديد</span>
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-zinc-200 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <CalendarCheck className="w-4 h-4 text-yellow-400" />
            <span>تسجيل الحضور</span>
          </button>
        </div>
      </div>

      {/* Financial Quick Cards with Eye Privacy Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">إجمالي الإيرادات</span>
              <button
                type="button"
                onClick={() => setShowRevenue(!showRevenue)}
                className="text-zinc-400 hover:text-yellow-400 transition-colors p-1 rounded-md hover:bg-zinc-800/50 cursor-pointer"
                title={showRevenue ? "إخفاء الإيرادات" : "إظهار الإيرادات"}
              >
                {showRevenue ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              {isLoading ? '-' : (showRevenue ? `${financialStats.totalRevenue.toLocaleString()} ` : '•••••• ')}
              <span className="text-sm font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">إجمالي الاشتراكات والمداخيل المحصلة</p>
        </div>

        {/* Net Treasury Card */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">صافي الخزينة (الرصيد)</span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-zinc-400 hover:text-yellow-400 transition-colors p-1 rounded-md hover:bg-zinc-800/50 cursor-pointer"
                title={showBalance ? "إخفاء الرصيد" : "إظهار الرصيد"}
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-3xl font-black tracking-tight ${financialStats.netBalance >= 0 ? 'text-yellow-400' : 'text-rose-500'}`}>
              {isLoading ? '-' : (showBalance ? `${financialStats.netBalance.toLocaleString()} ` : '•••••• ')}
              <span className="text-sm font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">الإيرادات بعد خصم المصروفات والرواتب</p>
        </div>
      </div>

      {/* 3 Main Player Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Players */}
        <StatCard
          id="stat-total-players"
          title="إجمالي اللاعبين"
          value={isLoading ? '-' : stats.totalPlayers}
          icon={Users}
          accentColor="yellow"
          subtitle="جميع اللاعبين المسجلين في الأكاديمية"
        />

        {/* Card 2: Active Players */}
        <StatCard
          id="stat-active-players"
          title="اللاعبين النشطين"
          value={isLoading ? '-' : stats.activePlayers}
          icon={UserCheck}
          accentColor="emerald"
          subtitle="الملتزمين بالتدريب والاشتراك"
        />

        {/* Card 3: Inactive Players */}
        <StatCard
          id="stat-inactive-players"
          title="اللاعبين غير النشطين"
          value={isLoading ? '-' : stats.inactivePlayers}
          icon={UserX}
          accentColor="rose"
          subtitle="المتوقفين أو المؤجلين مؤقتاً"
        />
      </div>
    </div>
  );
};
