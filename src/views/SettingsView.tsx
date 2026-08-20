import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Building,
  User,
  Lock,
  Phone,
  MapPin,
  Coins,
  Save,
  Upload,
  ShieldCheck,
  Download,
  Database,
  RefreshCw,
  FileSpreadsheet,
  Users,
  CreditCard,
  CalendarCheck,
  CheckCircle2,
  Cloud,
  Layers,
  ArrowUpRight,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  X,
  AlertCircle
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SettingsView: React.FC = () => {
  const { admin, updateAdminState } = useAuth();
  const { success, error } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Academy Settings
  const [academyName, setAcademyName] = useState('IFC ACADEMY');
  const [academyPhone, setAcademyPhone] = useState('');
  const [academyAddress, setAcademyAddress] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [defaultFee, setDefaultFee] = useState(500);
  const [customLogo, setCustomLogo] = useState<string>('');
  const [isSavingAcademy, setIsSavingAcademy] = useState(false);

  // Admin Account & Security
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // System Stats for Summary
  const [stats, setStats] = useState<{
    totalPlayers: number;
    activePlayers: number;
    inactivePlayers: number;
    paidCount: number;
    totalRevenue: number;
  }>({
    totalPlayers: 0,
    activePlayers: 0,
    inactivePlayers: 0,
    paidCount: 0,
    totalRevenue: 0
  });
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; supabaseUrl: string | null }>({
    configured: false,
    supabaseUrl: null
  });
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Supabase Credentials Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState('');
  const [inputSupabaseKey, setInputSupabaseKey] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!inputSupabaseUrl.trim() || !inputSupabaseKey.trim()) {
      setTestFeedback({
        type: 'error',
        message: 'يرجى إدخال عنوان المشروع (Project URL) ومفتاح الوصول (API Key) أولاً'
      });
      return;
    }
    setIsTestingConnection(true);
    setTestFeedback(null);
    try {
      const res = await api.testSupabaseConnection(inputSupabaseUrl, inputSupabaseKey);
      if (res.success) {
        setTestFeedback({
          type: 'success',
          message: res.message || 'تم الاتصال بقاعدة بيانات Supabase بنجاح! الاستجابة ممتازة.'
        });
      } else {
        setTestFeedback({
          type: 'error',
          message: res.message || res.error || 'تعذر الاتصال بـ Supabase، يرجى التحقق من الرابط والمفتاح.'
        });
      }
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ في الشبكة أثناء اختبار الاتصال'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const supabaseSqlSchema = `-- ==============================================================================
-- IFC ACADEMY - SUPABASE POSTGRESQL PRODUCTION SCHEMA (UUID PRIMARY & FOREIGN KEYS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. جدول بيانات اللاعبين (Players Table - UUID)
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "membershipCode" TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  age INTEGER NOT NULL,
  "group" TEXT NOT NULL CHECK ("group" IN ('براعم', 'ناشئين', 'شباب')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  "nationalId" TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. جدول أولياء الأمور (Parents Table - UUID FK)
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  relationship TEXT NOT NULL,
  "emergencyPhone" TEXT
);

-- 3. جدول الاشتراكات (Subscriptions Table - UUID FK)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "planName" TEXT NOT NULL DEFAULT 'اشتراك شهري',
  value NUMERIC NOT NULL DEFAULT 500,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'ExpiringSoon', 'Expired')),
  "lastPaymentDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. جدول سجلات المدفوعات والتحصيل (Payments Table - UUID FK)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "subscriptionId" UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  "paymentMethod" TEXT NOT NULL CHECK ("paymentMethod" IN ('Cash', 'Wallet', 'InstaPay')),
  "paidBy" TEXT NOT NULL DEFAULT 'ولي الأمر',
  "paymentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Paid',
  "receiptNumber" TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. جدول الحضور والغياب (Attendance Table - UUID FK)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "group" TEXT NOT NULL CHECK ("group" IN ('براعم', 'ناشئين', 'شباب')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
  notes TEXT,
  "markedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("playerId", date)
);

-- 6. جدول إعدادات الأكاديمية (Settings Table)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'academy_settings',
  "academyName" TEXT NOT NULL DEFAULT 'IFC ACADEMY',
  phone TEXT,
  address TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  "defaultMonthlyFee" NUMERIC NOT NULL DEFAULT 500,
  "adminNotifications" BOOLEAN NOT NULL DEFAULT true,
  "googleDriveFolderId" TEXT,
  "googleSpreadsheetId" TEXT,
  "lastBackupAt" TIMESTAMPTZ
);

-- 7. جدول المعاملات المالية والمصروفات والرواتب (Financial Transactions - UUID FK)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'salary', 'withdrawal')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT,
  "coachName" TEXT,
  notes TEXT,
  "paymentId" UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. جدول سجل النشاطات والأمان (Activity Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL DEFAULT 'admin-1',
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;



  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSqlSchema);
    setCopiedSql(true);
    success('تم نسخ كود SQL لإنشاء جداول Supabase بنجاح');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [s, sbStatus] = await Promise.all([
          api.getSettings(),
          api.getSupabaseStatus().catch(() => ({ configured: false, supabaseUrl: null }))
        ]);
        setSupabaseStatus(sbStatus);
        setAcademyName(s.academyName || 'IFC ACADEMY');
        setAcademyPhone(s.phone || '');
        setAcademyAddress(s.address || '');
        setCurrency(s.currency || 'EGP');
        setDefaultFee(s.defaultMonthlyFee || 500);
        
        const savedLogo = localStorage.getItem('ifc_custom_logo');
        if (savedLogo) {
          setCustomLogo(savedLogo);
        }

        // Fetch stats & payments
        const [dbStats, payments] = await Promise.all([
          api.getDashboardStats(),
          api.getPayments()
        ]);

        const revenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        setStats({
          totalPlayers: dbStats.totalPlayers || 0,
          activePlayers: dbStats.activePlayers || 0,
          inactivePlayers: dbStats.inactivePlayers || 0,
          paidCount: dbStats.paidThisMonth || 0,
          totalRevenue: revenue
        });
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };

    if (admin) {
      setAdminName(admin.name || 'مدير النظام');
      setAdminEmail(admin.email || 'admin@ifc.academy');
      setAdminUsername(admin.username || 'admin');
    }

    loadSettings();
  }, [admin]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        error('حجم الصورة كبير جداً، الحد الأقصى 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCustomLogo(result);
        localStorage.setItem('ifc_custom_logo', result);
        success('تم تحديث شعار الأكاديمية بنجاح عبر النظام');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setCustomLogo('');
    localStorage.removeItem('ifc_custom_logo');
    success('تم استعادة الشعار الافتراضي للأكاديمية');
  };

  const handleSaveAcademy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAcademy(true);
    try {
      await api.updateSettings({
        academyName,
        phone: academyPhone,
        address: academyAddress,
        currency,
        defaultMonthlyFee: Number(defaultFee),
        adminNotifications: true
      });
      success('تم حفظ وتحديث بيانات الأكاديمية بنجاح');
    } catch (err: any) {
      error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await api.updateProfile({
        name: adminName.trim(),
        email: adminEmail.trim(),
        username: adminUsername.trim()
      });
      updateAdminState(updated);
      success('تم حفظ اسم المستخدم وبيانات الحساب بنجاح');
    } catch (err: any) {
      error(err.message || 'فشل تحديث الحساب');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      error('يرجى ملء حقول كلمة المرور');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('كلمة المرور الجديدة غير متطابقة مع التأكيد');
      return;
    }
    if (newPassword.length < 4) {
      error('كلمة المرور يجب ألا تقل عن 4 خانات');
      return;
    }

    setIsChangingPass(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      success('تم تغيير كلمة مرور الدخول بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      error(err.message || 'كلمة المرور الحالية غير صحيحة');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Download Comprehensive All-in-One Academy Report (CSV + JSON options)
  const handleDownloadAllDataCSV = async () => {
    setIsDownloadingReport(true);
    try {
      const [players, payments, attendance, settings] = await Promise.all([
        api.getPlayers(),
        api.getPayments(),
        api.getAttendance(),
        api.getSettings()
      ]);

      const now = new Date().toLocaleDateString('ar-EG');
      const totalRevenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      // Build comprehensive CSV format
      let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic in Excel
      
      // SECTION 1: SYSTEM OVERVIEW & TOTALS
      csvContent += `تقرير شامل لبيانات أكاديمية ${settings.academyName || 'IFC ACADEMY'}\n`;
      csvContent += `تاريخ استخراج التقرير:,${now}\n`;
      csvContent += `إجمالي عدد اللاعبين:,${players.length}\n`;
      csvContent += `اللاعبين النشطين (Active):,${players.filter(p => p.status === 'Active').length}\n`;
      csvContent += `اللاعبين غير النشطين (Inactive):,${players.filter(p => p.status !== 'Active').length}\n`;
      csvContent += `المسددين للاشتراك:,${players.filter(p => p.activeSubscription?.status === 'Paid').length}\n`;
      csvContent += `الاشتراكات المنتهية أو غير المسددة:,${players.filter(p => p.activeSubscription?.status !== 'Paid').length}\n`;
      csvContent += `إجمالي المدفوعات المسجلة:,${payments.length}\n`;
      csvContent += `إجمالي الإيرادات المحصلة:,${totalRevenue} ${settings.currency || 'EGP'}\n`;
      csvContent += `إجمالي سجلات الحضور:,${attendance.length}\n\n`;

      // SECTION 2: PLAYERS DIRECTORY
      csvContent += `--- جدول سجلات وبيانات اللاعبين والاشتراكات ---\n`;
      csvContent += `كود اللاعب,الاسم الكامل,المجموعة,الحالة,حالة الاشتراك,القائم بالسداد,تاريخ الانضمام,رقم الهاتف,هاتف ولي الأمر,الملاحظات\n`;
      
      players.forEach(p => {
        const subStatus = p.activeSubscription?.status || 'Unpaid';
        const paidBy = p.activeSubscription?.lastPaidBy || (p.group === 'شباب' ? 'اللاعب' : 'ولي الأمر');
        const parentPhone = p.parent?.parentPhone || p.parent?.emergencyPhone || '';
        const notes = (p.notes || '').replace(/,/g, ' ');
        const joinDate = p.createdAt ? p.createdAt.split('T')[0] : '';
        csvContent += `"${p.membershipCode || p.id}","${p.fullName}","${p.group}","${p.status}","${subStatus}","${paidBy}","${joinDate}","${p.phone}","${parentPhone}","${notes}"\n`;
      });
      csvContent += `\n`;

      // SECTION 3: PAYMENTS HISTORY
      csvContent += `--- جدول سجلات المدفوعات والتحصيل ---\n`;
      csvContent += `رقم الإيصال,اسم اللاعب,المبلغ المدفوع,تاريخ السداد,طريقة الدفع,القائم بالدفع,ملاحظات\n`;
      payments.forEach(pay => {
        csvContent += `"${pay.receiptNumber || pay.id}","${pay.playerName || ''}","${pay.amount}","${pay.paymentDate}","${pay.paymentMethod || 'نقدي'}","${pay.paidBy || ''}","${(pay.notes || '').replace(/,/g, ' ')}"\n`;
      });
      csvContent += `\n`;

      // SECTION 4: ATTENDANCE RECORDS
      csvContent += `--- جدول سجلات الحضور والغياب ---\n`;
      csvContent += `تاريخ الحصة,المجموعة,اسم اللاعب,الحالة (حاضر/غائب),تاريخ التسجيل\n`;
      attendance.forEach(att => {
        const statusText = att.status === 'Present' ? 'حاضر' : 'غائب';
        csvContent += `"${att.date}","${att.group}","${att.playerName || ''}","${statusText}","${att.markedAt || ''}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IFC_Academy_Full_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('تم تصدير وتحميل التقرير الشامل لجميع بيانات الموقع (Excel / CSV) بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء استخراج بيانات الموقع');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSupabaseUrl || !inputSupabaseKey) {
      error('يرجى ملء رابط المشروع ومفتاح API');
      return;
    }
    setIsSavingConfig(true);
    try {
      const res = await api.configureSupabase(inputSupabaseUrl, inputSupabaseKey);
      if (res.success) {
        success(res.message || 'تم حفظ مفاتيح الربط بنجاح');
        setSupabaseStatus({
          configured: true,
          supabaseUrl: inputSupabaseUrl.replace(/(https?:\/\/)([^.]+)(.*)/, '$1***$3')
        });
        setIsConfigModalOpen(false);
      } else {
        error(res.message || 'فشل حفظ الإعدادات');
      }
    } catch (err: any) {
      error(err.message || 'فشل الاتصال بمشروع Supabase');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSyncWithSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await api.syncWithSupabase();
      if (res.success) {
        success(res.message || 'تمت مزامنة البيانات مع Supabase بنجاح');
      } else {
        error(res.message || 'فشلت المزامنة');
      }
    } catch (err: any) {
      error(err.message || 'تأكد من ضبط SUPABASE_URL و SUPABASE_ANON_KEY في الإعدادات');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[#1f1f23] pb-6">
        <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
          <span>IFC ACADEMY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">إعدادات الأكاديمية والنظام</h1>
      </div>

      <div className="space-y-8">
        {/* SECTION 1: Data Export & Full Academy Report */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1f1f23] mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تصدير وتحميل جميع بيانات الموقع</h2>
              <p className="text-xs text-zinc-400">سجلات اللاعبين النشطين والغير نشطين، المدفوعات والاشتراكات، والحضور</p>
            </div>
          </div>

          {/* Quick Stats Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-4 bg-[#050505] border border-[#1f1f23] rounded-xl text-right">
              <span className="text-[11px] text-zinc-400 block mb-1">إجمالي عدد اللاعبين</span>
              <span className="text-xl font-black text-white font-mono">{stats.totalPlayers}</span>
            </div>

            <div className="p-4 bg-[#050505] border border-[#1f1f23] rounded-xl text-right">
              <span className="text-[11px] text-emerald-400 block mb-1">اللاعبين النشطين</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{stats.activePlayers}</span>
            </div>

            <div className="p-4 bg-[#050505] border border-[#1f1f23] rounded-xl text-right">
              <span className="text-[11px] text-zinc-400 block mb-1">اللاعبين غير النشطين</span>
              <span className="text-xl font-black text-zinc-400 font-mono">{stats.inactivePlayers}</span>
            </div>

            <div className="p-4 bg-[#050505] border border-[#1f1f23] rounded-xl text-right">
              <span className="text-[11px] text-yellow-400 block mb-1">المسددين للاشتراك</span>
              <span className="text-xl font-black text-yellow-400 font-mono">{stats.paidCount}</span>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="p-5 bg-[#050505] border border-[#1f1f23] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>تحميل تقرير شامل لجميع بيانات الأكاديمية بنقرة واحدة</span>
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                يحتوي التقرير على كافة إحصائيات اللاعبين (النشطين والغير نشطين)، الاشتراكات، من قام بالسداد، تفاصيل المدفوعات والإيرادات، وسجلات الحضور والغياب اليومية.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDownloadAllDataCSV}
                disabled={isDownloadingReport}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isDownloadingReport ? 'جاري التصدير...' : 'تحميل جميع البيانات (Excel / CSV)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Admin Profile, Username & Password Change */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1f1f23] mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">بيانات تسجيل الدخول وتغيير كلمة المرور والاسم</h2>
              <p className="text-xs text-zinc-400">تعديل اسم المشرف، اسم المستخدم للدخول (Username)، وتعيين كلمة مرور جديدة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Admin Account Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-yellow-400" />
                  <span>تعديل بيانات الدخول واسم المشرف</span>
                </h3>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم الأدمن / المشرف الظاهر</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="مدير الأكاديمية"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم المستخدم لتسجيل الدخول (Login Username)</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-yellow-400 font-mono font-bold text-sm focus:border-yellow-400 focus:outline-none text-left dir-ltr"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">هذا هو الاسم الذي تستخدمه عند فتح صفحة تسجيل الدخول</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">البريد الإلكتروني للإشعارات</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@ifc.academy"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono text-left dir-ltr"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs cursor-pointer shadow-md shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'جاري الحفظ...' : 'حفظ اسم المستخدم وبيانات الحساب'}</span>
              </button>
            </form>

            {/* Right Column: Password Change Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-400" />
                  <span>تغيير كلمة مرور الدخول</span>
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">كلمة المرور الحالية (Current Password)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">كلمة المرور الجديدة (New Password)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono text-right"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#151518] hover:bg-[#202024] text-zinc-200 hover:text-white border border-[#27272a] font-bold text-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-yellow-400" />
                <span>{isChangingPass ? 'جاري التغيير...' : 'تحديث وتعيين كلمة المرور'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* SECTION 3: Academy Identity & Settings */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1f1f23] mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">هوية وبيانات الأكاديمية والشعار</h2>
              <p className="text-xs text-zinc-400">الشعار، الاسم، أرقام التواصل، والاشتراك الافتراضي</p>
            </div>
          </div>

          {/* Logo Management */}
          <div className="mb-8 p-5 bg-[#050505] border border-[#1f1f23] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-right">
              <div className="relative">
                <Logo size="lg" showText={false} customLogoUrl={customLogo} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">شعار الأكاديمية الرسمي</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  يظهر الشعار في شاشة الدخول، شريط التنقل، وشاشة التحميل والإيصالات.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs cursor-pointer shadow-md shadow-yellow-500/20 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>تغيير الشعار</span>
              </button>

              {customLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#151518] hover:bg-[#202024] text-zinc-300 hover:text-white border border-[#27272a] text-xs cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>استعادة الافتراضي</span>
                </button>
              )}
            </div>
          </div>

          {/* Academy Info Form */}
          <form onSubmit={handleSaveAcademy} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Academy Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">اسم الأكاديمية</label>
                <input
                  type="text"
                  value={academyName}
                  onChange={e => setAcademyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">هاتف التواصل الرسمي</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={academyPhone}
                    onChange={e => setAcademyPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full pl-4 pr-10 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none text-right font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Phone className="w-4 h-4 text-yellow-400/80" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">مقر وعنوان الأكاديمية</label>
                <div className="relative">
                  <input
                    type="text"
                    value={academyAddress}
                    onChange={e => setAcademyAddress(e.target.value)}
                    placeholder="الفرع الرئيسي"
                    className="w-full pl-4 pr-10 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none text-right"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                    <MapPin className="w-4 h-4 text-yellow-400/80" />
                  </div>
                </div>
              </div>

              {/* Default Fee */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  قيمة الاشتراك الشهري الافتراضي ({currency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={defaultFee}
                    onChange={e => setDefaultFee(Number(e.target.value))}
                    min="0"
                    step="50"
                    className="w-full pl-4 pr-10 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-yellow-400 font-black text-sm focus:border-yellow-400 focus:outline-none text-right font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Coins className="w-4 h-4 text-yellow-400/80" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingAcademy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm shadow-lg shadow-yellow-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingAcademy ? 'جاري الحفظ...' : 'حفظ إعدادات الأكاديمية'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 4: Supabase Cloud Database Integration */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1f1f23] mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>الربط السحابي مع Supabase Database</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${supabaseStatus.configured ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {supabaseStatus.configured ? 'متصل وجاهز للمزامنة' : 'في انتظار ضبط المفاتيح'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">تخزين ومزامنة بيانات الأكاديمية (اللاعبين، الاشتراكات، وسجلات الحضور) على مشروعك في Supabase</p>
            </div>
          </div>

          <div className="p-5 bg-[#050505] border border-[#1f1f23] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-right">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>حالة الربط مع مشروع Supabase الخاص بك</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                {supabaseStatus.configured 
                  ? 'تم العثور على إعدادات Supabase في بيئة العمل. يمكنك الضغط على زر المزامنة لنقل كافة جداول وسجلات الأكاديمية تلقائياً إلى مشروعك السحابي.'
                  : 'لتفعيل الربط المباشر مع مشروعك في Supabase، يرجى إضافة المتغيرات SUPABASE_URL و SUPABASE_ANON_KEY في إعدادات المنصة (Secrets & Environment Variables).'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#151518] hover:bg-[#202024] text-zinc-200 hover:text-white border border-[#27272a] font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shadow-md"
              >
                <Key className="w-4 h-4 text-yellow-400" />
                <span>إدخال / تعديل بيانات ومفاتيح الربط</span>
              </button>

              <button
                type="button"
                onClick={handleSyncWithSupabase}
                disabled={isSyncingSupabase}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                <span>{isSyncingSupabase ? 'جاري المزامنة...' : 'مزامنة فورية مع Supabase'}</span>
              </button>
            </div>
          </div>

          {/* Supabase Credentials Modal */}
          {isConfigModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#0e0e11] border border-[#27272a] rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6 text-right relative">
                <div className="flex items-center justify-between pb-4 border-b border-[#1f1f23]">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">إدخال بيانات الربط مع Supabase</h3>
                      <p className="text-xs text-zinc-400">Project URL & API Key (Anon / Service Role)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="w-8 h-8 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>عنوان مشروع Supabase (Project URL)</span>
                      <span className="text-[10px] text-zinc-500 font-normal">مثال: https://xyzcompany.supabase.co</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={inputSupabaseUrl}
                        onChange={e => setInputSupabaseUrl(e.target.value)}
                        placeholder="https://your-project-ref.supabase.co"
                        className="w-full pl-4 pr-10 py-2.5 bg-[#050505] border border-[#27272a] rounded-xl text-emerald-400 font-mono text-xs sm:text-sm focus:border-emerald-400 focus:outline-none text-left dir-ltr"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                        <Globe className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>مفتاح الوصول API Key (Anon Key أو Service Role)</span>
                      <span className="text-[10px] text-zinc-500 font-normal">من إعدادات Project Settings - API</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={inputSupabaseKey}
                        onChange={e => setInputSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full pl-4 pr-10 py-2.5 bg-[#050505] border border-[#27272a] rounded-xl text-emerald-400 font-mono text-xs sm:text-sm focus:border-emerald-400 focus:outline-none text-left dir-ltr"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                        <Key className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {testFeedback && (
                    <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
                      testFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        testFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {testFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 leading-relaxed">
                        <p className="font-bold">{testFeedback.type === 'success' ? 'نجح الاتصال:' : 'تنبيه الاتصال:'}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">{testFeedback.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-xs text-zinc-400 space-y-1.5">
                    <p className="font-bold text-zinc-300">أين أجد هذه البيانات في Supabase؟</p>
                    <p className="text-[11px] leading-relaxed">
                      1. افتح مشروعك في لوحة تحكم Supabase Dashboard.
                      <br />
                      2. ادخل إلى <span className="text-emerald-400 font-mono">Project Settings &gt; API</span>.
                      <br />
                      3. انسخ <span className="text-emerald-400 font-mono">Project URL</span> و <span className="text-emerald-400 font-mono">anon public key</span> أو <span className="text-emerald-400 font-mono">service_role</span>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || isSavingConfig}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-200 border border-[#27272a] text-xs font-bold cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-yellow-400 ${isTestingConnection ? 'animate-spin' : ''}`} />
                      <span>{isTestingConnection ? 'جاري فحص الاتصال...' : 'اختبار الاتصال (Test Connection)'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfigModalOpen(false);
                          setTestFeedback(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingConfig || isTestingConnection}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSavingConfig ? 'جاري الحفظ...' : 'حفظ وتفعيل الاتصال'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SQL Tables Schema Viewer & Quick Copy */}
          <div className="mt-6 pt-6 border-t border-[#1f1f23]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <button
                type="button"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors text-right cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                <span>عرض استعلامات SQL لإنشاء جداول قاعدة البيانات في Supabase</span>
                {showSqlSchema ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-[#202024] text-zinc-200 hover:text-white border border-[#27272a] text-xs font-bold transition-all cursor-pointer w-fit"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>نسخ كود إنشاء الجداول (SQL)</span>
                  </>
                )}
              </button>
            </div>

            {showSqlSchema && (
              <div className="relative rounded-xl overflow-hidden border border-[#1f1f23] bg-[#050505] p-4 text-left dir-ltr">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#1f1f23] text-xs text-zinc-500 font-mono">
                  <span>Supabase SQL Editor Script</span>
                  <span>PostgreSQL DDL</span>
                </div>
                <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre p-2 max-h-80 custom-scrollbar">
                  {supabaseSqlSchema}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
