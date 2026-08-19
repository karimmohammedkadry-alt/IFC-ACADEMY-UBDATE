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
  CheckCircle2
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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await api.getSettings();
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

  // Download Backup JSON
  const handleExportBackupJSON = async () => {
    try {
      const [players, payments, attendance, settings] = await Promise.all([
        api.getPlayers(),
        api.getPayments(),
        api.getAttendance(),
        api.getSettings()
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        summary: {
          totalPlayers: players.length,
          activePlayers: players.filter(p => p.status === 'Active').length,
          inactivePlayers: players.filter(p => p.status !== 'Active').length,
          paidSubscriptions: players.filter(p => p.activeSubscription?.status === 'Paid').length,
          totalRevenue: payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        },
        academy: settings,
        players,
        payments,
        attendance
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IFC_Academy_Database_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('تم تصدير النسخة الاحتياطية المتكاملة لقاعدة البيانات بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء تصدير النسخة الاحتياطية');
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

              <button
                type="button"
                onClick={handleExportBackupJSON}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#151518] hover:bg-[#202024] text-zinc-200 hover:text-white border border-[#27272a] font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                <Download className="w-4 h-4 text-yellow-400" />
                <span>نسخة احتياطية (JSON)</span>
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
      </div>
    </div>
  );
};
