import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  PlusCircle,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  User,
  X,
  Check,
  RefreshCw,
  ArrowRightLeft,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Payment, Subscription, Player, PaymentMethod, SubscriptionStatus, PaidByType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface PaymentsViewProps {
  onSelectPlayer: (id: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onSelectPlayer }) => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'history'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'renew' | 'direct_payment'>('renew');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields (Notes & Reference fields removed per request)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paidBy, setPaidBy] = useState<PaidByType>('ولي الأمر');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Renewal specific fields
  const [renewPlanName, setRenewPlanName] = useState<string>('تجديد اشتراك شهري');
  const [renewStartDate, setRenewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [renewEndDate, setRenewEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [renewPayNow, setRenewPayNow] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsData, paysData, plData] = await Promise.all([
        api.getSubscriptions({ status: statusFilter, query: searchQuery, group: groupFilter }),
        api.getPayments({ method: methodFilter, query: searchQuery }),
        api.getPlayers()
      ]);
      setSubscriptions(subsData);
      setPayments(paysData);
      setPlayersList(plData);
    } catch (err: any) {
      error(err.message || 'فشل تحميل بيانات المدفوعات والاشتراكات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, groupFilter, methodFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenModal = (mode: 'renew' | 'direct_payment' = 'renew', playerOrSub?: Subscription | Player) => {
    setModalMode(mode);

    let targetPlayerId = '';
    if (playerOrSub) {
      targetPlayerId = 'playerId' in playerOrSub ? playerOrSub.playerId : playerOrSub.id;
    } else if (playersList.length > 0) {
      targetPlayerId = playersList[0].id;
    }

    setSelectedPlayerId(targetPlayerId);

    const player = playersList.find(p => p.id === targetPlayerId);
    if (player) {
      setPaidBy(player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر');
      setPaymentAmount(player.activeSubscription?.value || 500);
    } else {
      setPaymentAmount(500);
      setPaidBy('ولي الأمر');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setRenewStartDate(todayStr);
    setRenewEndDate(nextMonth.toISOString().split('T')[0]);
    setPaymentDate(todayStr);
    setPaymentMethod('Cash');
    setRenewPayNow(true);
    setRenewPlanName('تجديد اشتراك شهري');

    setIsModalOpen(true);
  };

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const p = playersList.find(item => item.id === playerId);
    if (p) {
      setPaidBy(p.group === 'شباب' ? 'اللاعب' : 'ولي الأمر');
      if (p.activeSubscription?.value) {
        setPaymentAmount(p.activeSubscription.value);
      }
    }
  };

  const handleRenewStartDateChange = (startDateStr: string) => {
    setRenewStartDate(startDateStr);
    try {
      const d = new Date(startDateStr);
      d.setMonth(d.getMonth() + 1);
      setRenewEndDate(d.toISOString().split('T')[0]);
    } catch {
      // ignore
    }
  };

  // Submit Handler for Renew
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      error('يرجى اختيار اللاعب المراد تجديد اشتراكه');
      return;
    }

    setIsSubmitting(true);
    try {
      const player = playersList.find(p => p.id === selectedPlayerId);
      await api.renewSubscription({
        playerId: selectedPlayerId,
        planName: renewPlanName || 'تجديد اشتراك شهري',
        value: Number(paymentAmount),
        startDate: renewStartDate,
        endDate: renewEndDate,
        paymentMethod,
        paidBy,
        payNow: renewPayNow
      });

      success(`تم تجديد اشتراك اللاعب ${player?.fullName || ''} بنجاح ${renewPayNow ? `(وتم سداد ${paymentAmount} EGP)` : ''}`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'فشل تجديد الاشتراك');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler for Direct Payment
  const handleDirectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      error('يرجى اختيار اللاعب');
      return;
    }

    setIsSubmitting(true);
    try {
      const player = playersList.find(p => p.id === selectedPlayerId);
      await api.recordPayment({
        playerId: selectedPlayerId,
        amount: Number(paymentAmount),
        paymentMethod,
        paidBy,
        paymentDate
      });

      success(`تم تسجيل سداد الدفعة بنجاح للاعب ${player?.fullName || ''} (المبلغ: ${paymentAmount} EGP)`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'فشل تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    window.open(api.exportPaymentsUrl, '_blank');
    success('جاري تصدير ملف إكسيل لسجل المدفوعات...');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>IFC ACADEMY • الشؤون المالية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">المدفوعات والاشتراكات</h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            id="btn-export-payments"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#151518] text-zinc-200 hover:text-white border border-[#1f1f23] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير إكسيل</span>
          </button>

          {/* Record Payment Button (Triggers 2-choice modal) */}
          <button
            id="btn-record-payment"
            onClick={() => handleOpenModal('renew')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm shadow-lg shadow-yellow-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل دفعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f1f23] pb-2">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-[#151518]'
          }`}
        >
          حالات الاشتراكات الحالية ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-[#151518]'
          }`}
        >
          سجل عمليات الدفع الكامل ({payments.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
          {/* Search Input across all records */}
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4 text-yellow-400/80" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث باسم اللاعب، كود العضوية، أو رقم الإيصال..."
              className="w-full pr-10 pl-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-right"
            />
          </div>

          {/* Filters */}
          {activeTab === 'subscriptions' ? (
            <>
              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
                >
                  <option value="All">جميع الحالات</option>
                  <option value="Paid">مدفوع (Paid)</option>
                  <option value="ExpiringSoon">قريب من الانتهاء (3 أيام)</option>
                  <option value="Unpaid">غير مدفوع (Unpaid)</option>
                  <option value="Expired">منتهي (Expired)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={groupFilter}
                  onChange={e => setGroupFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
                >
                  <option value="All">جميع المجموعات</option>
                  <option value="براعم">براعم</option>
                  <option value="ناشئين">ناشئين</option>
                  <option value="شباب">شباب</option>
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-6">
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
              >
                <option value="All">جميع طرق الدفع (Cash / Wallet / InstaPay)</option>
                <option value="Cash">كاش (Cash)</option>
                <option value="Wallet">محفظة إلكترونية (Wallet)</option>
                <option value="InstaPay">إنستاباي (InstaPay)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-400">جاري تحميل البيانات المالية...</p>
          </div>
        ) : activeTab === 'subscriptions' ? (
          subscriptions.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs">
              لا توجد اشتراكات مطابقة للفلاتر المحددة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#050505] border-b border-[#1f1f23] text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 pr-6">اسم اللاعب</th>
                    <th className="py-4 px-4">كود العضوية</th>
                    <th className="py-4 px-4">المجموعة</th>
                    <th className="py-4 px-4">قيمة الاشتراك</th>
                    <th className="py-4 px-4">الفترة (من - إلى)</th>
                    <th className="py-4 px-4">القائم بالسداد</th>
                    <th className="py-4 px-4">حالة الاشتراك</th>
                    <th className="py-4 pl-6 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/60">
                  {subscriptions.map(sub => (
                    <tr
                      key={sub.id}
                      className="hover:bg-[#121215] transition-colors"
                    >
                      <td
                        className="py-4 pr-6 cursor-pointer"
                        onClick={() => onSelectPlayer(sub.playerId)}
                      >
                        <span className="text-sm font-bold text-white block hover:text-yellow-400 transition-colors">{sub.playerName}</span>
                        <span className="text-[11px] text-zinc-400">{sub.planName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                          {sub.membershipCode}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={sub.group || 'ناشئين'} type="group" />
                      </td>
                      <td className="py-4 px-4 font-bold text-white text-sm">
                        {sub.value} <span className="text-xs font-normal text-zinc-400">EGP</span>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 font-mono text-[11px]">
                        <div>{sub.startDate}</div>
                        <div className="text-zinc-500">إلى {sub.endDate}</div>
                      </td>
                      <td className="py-4 px-4 text-zinc-300">
                        {sub.lastPaidBy || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge
                          status={sub.status}
                          type="subscription"
                          daysRemaining={sub.daysRemaining}
                        />
                      </td>
                      <td className="py-4 pl-6 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal('renew', sub)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 font-bold text-xs border border-yellow-400/30 transition-all cursor-pointer active:scale-95"
                            title="تجديد الاشتراك"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>تجديد</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Payment History Table */
          payments.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs">
              لا توجد مدفوعات مسجلة مطابقة للبحث.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#050505] border-b border-[#1f1f23] text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 pr-6">رقم الإيصال</th>
                    <th className="py-4 px-4">اسم اللاعب</th>
                    <th className="py-4 px-4">كود العضوية</th>
                    <th className="py-4 px-4">المبلغ المسدد</th>
                    <th className="py-4 px-4">طريقة الدفع</th>
                    <th className="py-4 px-4">القائم بالسداد</th>
                    <th className="py-4 px-4">تاريخ السداد</th>
                    <th className="py-4 pl-6 text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/60">
                  {payments.map(pay => (
                    <tr
                      key={pay.id}
                      className="hover:bg-[#121215] transition-colors cursor-pointer"
                      onClick={() => onSelectPlayer(pay.playerId)}
                    >
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-emerald-400 font-bold">{pay.receiptNumber}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-white block">{pay.playerName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                          {pay.membershipCode}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-white text-sm">
                        {pay.amount} <span className="text-xs font-normal text-zinc-400">EGP</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-md bg-[#151518] border border-[#26262b] text-zinc-300 font-bold text-[11px]">
                          {pay.paymentMethod === 'Cash' ? 'كاش (Cash)' : pay.paymentMethod === 'Wallet' ? 'محفظة (Wallet)' : 'إنستاباي (InstaPay)'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-zinc-300">
                        {pay.paidBy || 'ولي الأمر'}
                      </td>
                      <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                        {pay.paymentDate}
                      </td>
                      <td className="py-4 pl-6 text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          مدفوع بالكامل
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Unified Record Payment Modal (Offers 2 explicit choices: Renew Player vs Add New Direct Payment) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl p-6 sm:p-7 w-full max-w-lg z-10 shadow-2xl space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1f1f23] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تسجيل المعاملات المالية للاعبين</h3>
                  <p className="text-xs text-zinc-400">اختر نوع العملية (تجديد دورة اشتراك أو سداد دفعة مباشرة)</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#151518] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2 Explicit Mode Choices Buttons */}
            <div className="grid grid-cols-2 gap-2 bg-[#050505] p-1.5 rounded-2xl border border-[#1f1f23]">
              <button
                type="button"
                id="btn-modal-renew-option"
                onClick={() => setModalMode('renew')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  modalMode === 'renew'
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-md shadow-yellow-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-[#121214]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${modalMode === 'renew' ? 'animate-spin-slow' : ''}`} />
                <span>تجديد لاعب (دورة شهرية)</span>
              </button>

              <button
                type="button"
                id="btn-modal-payment-option"
                onClick={() => setModalMode('direct_payment')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  modalMode === 'direct_payment'
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-md shadow-yellow-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-[#121214]'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة دفعة جديدة</span>
              </button>
            </div>

            {/* CHOICE 1: RENEW PLAYER SUBSCRIPTION FORM */}
            {modalMode === 'renew' ? (
              <form onSubmit={handleRenewSubmit} className="space-y-4">
                {/* Select Player */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    اختيار اللاعب المراد تجديد اشتراكه <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={selectedPlayerId}
                    onChange={e => handlePlayerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none cursor-pointer text-right"
                  >
                    <option value="" disabled>-- اختر اللاعب من القائمة --</option>
                    {playersList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.membershipCode}) - {p.group}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates (Start & End) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      تاريخ بدء الدورة الجديدة
                    </label>
                    <input
                      type="date"
                      required
                      value={renewStartDate}
                      onChange={e => handleRenewStartDateChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      تاريخ انتهاء الدورة
                    </label>
                    <input
                      type="date"
                      required
                      value={renewEndDate}
                      onChange={e => setRenewEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Value / Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      قيمة الاشتراك الشهري (EGP) <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20 font-bold">
                      سداد كامل للدورة
                    </span>
                  </div>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-bold"
                  />
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    طريقة الدفع <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'كاش (Cash)' },
                      { id: 'Wallet', label: 'محفظة (Wallet)' },
                      { id: 'InstaPay', label: 'إنستاباي (InstaPay)' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          paymentMethod === m.id
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                            : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid By Selector (اللاعب / ولي الأمر / أخرى) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    القائم بالدفع <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ولي الأمر', 'اللاعب', 'أخرى'] as PaidByType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPaidBy(type)}
                        className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          paidBy === type
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                            : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pay Now checkbox */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#050505] border border-[#1f1f23]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-white">تسجيل السداد فوري وتوليد إيصال</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={renewPayNow}
                    onChange={e => setRenewPayNow(e.target.checked)}
                    className="w-4 h-4 accent-yellow-400 cursor-pointer"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-[#151518] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد تجديد الاشتراك</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* CHOICE 2: DIRECT NEW PAYMENT FORM */
              <form onSubmit={handleDirectPaymentSubmit} className="space-y-4">
                {/* Select Player */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    اختيار اللاعب <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={selectedPlayerId}
                    onChange={e => handlePlayerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none cursor-pointer text-right"
                  >
                    <option value="" disabled>-- اختر اللاعب من القائمة --</option>
                    {playersList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.membershipCode}) - {p.group}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      قيمة الدفعة (EGP) <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 font-bold">
                      سداد نقدي مباشر
                    </span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-bold"
                  />
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    طريقة الدفع <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'كاش (Cash)' },
                      { id: 'Wallet', label: 'محفظة (Wallet)' },
                      { id: 'InstaPay', label: 'إنستاباي (InstaPay)' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          paymentMethod === m.id
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                            : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid By Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    القائم بالدفع <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ولي الأمر', 'اللاعب', 'أخرى'] as PaidByType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPaidBy(type)}
                        className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          paidBy === type
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                            : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    تاريخ السداد
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-[#151518] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد تسجيل الدفعة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
