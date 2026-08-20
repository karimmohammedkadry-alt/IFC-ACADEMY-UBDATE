import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarCheck,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  AlertCircle,
  Clock,
  DollarSign,
  History,
  UserCheck
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { api } from '../services/api';

export type NavTab = 'dashboard' | 'players' | 'payments' | 'financial' | 'coaches' | 'attendance' | 'activity-logs' | 'settings' | 'player-profile';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSelectPlayer?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onSelectPlayer }) => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load real notifications
  useEffect(() => {
    let isMounted = true;
    const loadNotifs = async () => {
      try {
        const list = await api.getNotifications();
        if (isMounted && Array.isArray(list)) {
          setNotifications(list);
        }
      } catch (e) {
        // Silently preserve current notifications during transient fetch issues
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'الرئيسية', shortLabel: 'الرئيسية', icon: LayoutDashboard },
    { id: 'players' as NavTab, label: 'اللاعبين', shortLabel: 'اللاعبين', icon: Users },
    { id: 'payments' as NavTab, label: 'المدفوعات والاشتراكات', shortLabel: 'المدفوعات', icon: CreditCard },
    { id: 'financial' as NavTab, label: 'المالية والتقارير', shortLabel: 'المالية', icon: DollarSign },
    { id: 'coaches' as NavTab, label: 'الجهاز الفني والمدربين', shortLabel: 'المدربين', icon: UserCheck },
    { id: 'attendance' as NavTab, label: 'الحضور والغياب', shortLabel: 'الحضور', icon: CalendarCheck },
    { id: 'activity-logs' as NavTab, label: 'سجل النشاطات والنسخ', shortLabel: 'النشاطات', icon: History },
    { id: 'settings' as NavTab, label: 'الإعدادات', shortLabel: 'الإعدادات', icon: Settings }
  ];


  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header id="main-navbar" className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-[#1f1f23] shadow-xl shadow-black/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand Logo & Name */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer py-2 group"
          >
            <Logo size="sm" showText={true} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || (currentTab === 'player-profile' && item.id === 'players');
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-yellow-400 bg-yellow-400/10 shadow-inner border border-yellow-400/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#121214] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                  <span>{item.shortLabel}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-yellow-400 rounded-full shadow-sm shadow-yellow-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: Notifications & Direct Logout */}
          <div className="flex items-center gap-3">
            
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                id="btn-notifications"
                onClick={() => setIsNotifOpen(prev => !prev)}
                className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isNotifOpen
                    ? 'bg-[#18181b] border-yellow-500/40 text-yellow-400'
                    : 'bg-[#0a0a0a] border-[#1f1f23] text-zinc-300 hover:text-yellow-400 hover:border-zinc-700'
                }`}
                title="الإشعارات والتنبيهات"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black text-[11px] font-black rounded-full flex items-center justify-center border-2 border-black animate-bounce shadow-md">
                    {unreadCount > 9 ? '+9' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 sm:left-0 sm:right-auto mt-3 w-80 sm:w-96 max-w-[90vw] bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                  >
                    <div className="p-3 border-b border-[#1f1f23] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold text-white">إشعارات وتنبيهات الأكاديمية</span>
                      </div>
                      <span className="text-xs bg-yellow-400/10 text-yellow-300 px-2 py-0.5 rounded-full font-bold border border-yellow-400/20">
                        {notifications.length} تنبيه
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#1f1f23]/60 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 text-xs">
                          لا توجد إشعارات جديدة حالياً
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.playerId && onSelectPlayer) {
                                onSelectPlayer(n.playerId);
                                setIsNotifOpen(false);
                              } else {
                                onSelectTab('payments');
                                setIsNotifOpen(false);
                              }
                            }}
                            className="p-3 hover:bg-[#151518] transition-colors cursor-pointer rounded-xl flex items-start gap-3 text-right"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                n.type === 'expiring_soon'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : n.type === 'expired'
                                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-white mb-0.5">{n.title}</h4>
                              <p className="text-[11px] text-zinc-400 leading-tight mb-1.5">{n.message}</p>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                                <Clock className="w-3 h-3" />
                                <span>{n.date}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2 border-t border-[#1f1f23] bg-[#050505]/60">
                      <button
                        onClick={() => {
                          onSelectTab('payments');
                          setIsNotifOpen(false);
                        }}
                        className="w-full py-2 text-center text-xs font-bold text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded-xl transition-colors cursor-pointer"
                      >
                        عرض جدول الاشتراكات والمدفوعات
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Direct Logout Button */}
            <button
              id="btn-logout"
              onClick={() => logout()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0a0a0a] hover:bg-rose-500/10 border border-[#1f1f23] hover:border-rose-500/30 text-zinc-300 hover:text-rose-400 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="تسجيل الخروج من النظام"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">خروج</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              id="btn-mobile-menu"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-[#1f1f23] text-zinc-300 hover:text-yellow-400 md:hidden cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[#1f1f23] bg-[#050505] px-4 pt-3 pb-5 space-y-1.5 overflow-hidden"
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
                      : 'text-zinc-300 hover:bg-[#121214] hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-yellow-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-[#1f1f23]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج من النظام</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
