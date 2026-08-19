import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, UserCheck, UserX, UserPlus, CreditCard, CalendarCheck, ArrowUpRight } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DashboardStats } from '../types';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
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
      <div className="border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">
            <span>IFC ACADEMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            لوحة التحكم الرئيسية
          </h1>
        </div>
      </div>

      {/* 3 Main Stat Cards */}
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
