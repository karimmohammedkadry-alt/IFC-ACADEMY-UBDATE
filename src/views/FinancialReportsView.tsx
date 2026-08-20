import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  Receipt,
  Printer,
  X,
  Check,
  RefreshCw,
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { FinancialTransaction, Invoice, FinancialOverviewStats } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const FinancialReportsView: React.FC = () => {
  const { success, error } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');
  const [showRevenue, setShowRevenue] = useState<boolean>(true);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [stats, setStats] = useState<FinancialOverviewStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalSalaries: 0,
    netBalance: 0,
    paymentsCount: 0,
    transactionsCount: 0
  });
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense' | 'salary' | 'withdrawal'>('expense');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('أدوات ومعدات');
  const [txCoachName, setTxCoachName] = useState<string>('');
  const [txNotes, setTxNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Invoice Modal for printing/viewing
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, txData, invData] = await Promise.all([
        api.getFinancialStats(),
        api.getFinancialTransactions({
          type: typeFilter,
          query: searchQuery,
          startDate: startDateFilter,
          endDate: endDateFilter
        }),
        api.getInvoices()
      ]);
      setStats(statsData);
      setTransactions(txData);
      setInvoices(invData);
    } catch (err: any) {
      error(err.message || 'فشل تحميل التقارير المالية');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenAddTx = (type: 'income' | 'expense' | 'salary' | 'withdrawal' = 'expense') => {
    setTxType(type);
    setTxAmount(0);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDescription('');
    setTxCategory(type === 'salary' ? 'رواتب' : type === 'expense' ? 'أدوات ومعدات' : 'إيرادات متنوعة');
    setTxCoachName('');
    setTxNotes('');
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription.trim()) {
      error('يرجى كتابة وصف المعاملة المالية');
      return;
    }
    if (Number(txAmount) <= 0) {
      error('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recordFinancialTransaction({
        type: txType,
        amount: Number(txAmount),
        date: txDate,
        description: txDescription.trim(),
        category: txCategory,
        coachName: txType === 'salary' ? txCoachName.trim() : undefined,
        notes: txNotes.trim(),
        idempotencyKey: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      });

      success('تم تسجيل المعاملة المالية بنجاح');
      setIsTxModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'فشل تسجيل المعاملة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    window.open(api.exportFinancialUrl, '_blank');
    success('جاري تصدير التقرير المالي إلى Excel...');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>IFC ACADEMY FINANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">المالية والتقارير المحاسبية</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121214] hover:bg-[#18181b] border border-[#27272a] text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleOpenAddTx('expense')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition-all shadow-lg shadow-yellow-400/10 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل معاملة مالية</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 relative overflow-hidden">
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-emerald-400">
              {showRevenue ? `${stats.totalRevenue.toLocaleString()} ` : '•••••• '}
              <span className="text-xs font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">الاشتراكات والتحصيلات المسددة</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">المصروفات العامة</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-rose-400">
              {stats.totalExpenses.toLocaleString()} <span className="text-xs font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">المعدات، الصيانة، والإيجارات</p>
        </div>

        {/* Total Salaries */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">رواتب المدربين</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-amber-400">
              {stats.totalSalaries.toLocaleString()} <span className="text-xs font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">مكافآت ورواتب الجهاز التدريبي</p>
        </div>

        {/* Net Cash Balance */}
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 relative overflow-hidden">
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
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-black ${stats.netBalance >= 0 ? 'text-yellow-400' : 'text-rose-500'}`}>
              {showBalance ? `${stats.netBalance.toLocaleString()} ` : '•••••• '}
              <span className="text-xs font-bold text-zinc-400">EGP</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">الإيرادات - المصروفات والرواتب</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#1f1f23] pb-3">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-yellow-400 text-black shadow-md'
              : 'text-zinc-400 hover:text-white bg-[#0f0f12]'
          }`}
        >
          <WalletCards className="w-4 h-4" />
          <span>سجل المعاملات اليومية</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-yellow-400 text-black shadow-md'
              : 'text-zinc-400 hover:text-white bg-[#0f0f12]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>الفواتير والإيصالات ({invoices.length})</span>
        </button>
      </div>

      {/* Transactions Sub-tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث بالوصف أو التصنيف أو اسم المدرب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            {/* Type Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-[#121214] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                <option value="All">جميع المعاملات</option>
                <option value="income">إيرادات وتحصيلات</option>
                <option value="expense">مصروفات عامة</option>
                <option value="salary">رواتب مدربين</option>
                <option value="withdrawal">سحب مالي</option>
              </select>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenAddTx('salary')}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                + صرف راتب
              </button>
              <button
                onClick={() => handleOpenAddTx('expense')}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                + قيد مصروف
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#121214] border-b border-[#1f1f23] text-zinc-400 font-bold">
                    <th className="p-4">نوع المعاملة</th>
                    <th className="p-4">المبلغ</th>
                    <th className="p-4">الوصف والتفاصيل</th>
                    <th className="p-4">التصنيف</th>
                    <th className="p-4">المدرب / المستلم</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/60 text-zinc-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yellow-400 mb-2" />
                        جاري تحميل السجلات المالية...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-500">
                        لا توجد معاملات مسجلة تطابق البحث
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-[#121214]/80 transition-colors">
                        <td className="p-4 font-bold">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              tx.type === 'income'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : tx.type === 'expense'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : tx.type === 'salary'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {tx.type === 'income' && <ArrowDownLeft className="w-3 h-3" />}
                            {tx.type === 'expense' && <ArrowUpRight className="w-3 h-3" />}
                            {tx.type === 'salary' && <UserCheck className="w-3 h-3" />}
                            {tx.type === 'income'
                              ? 'إيداع / تحصيل'
                              : tx.type === 'expense'
                              ? 'مصروفات'
                              : tx.type === 'salary'
                              ? 'راتب مدرب'
                              : 'سحب مالي'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-black text-sm">
                          <span className={tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                            {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()} EGP
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-white">{tx.description}</td>
                        <td className="p-4 text-zinc-400">{tx.category || '-'}</td>
                        <td className="p-4 text-zinc-300 font-medium">{tx.coachName || '-'}</td>
                        <td className="p-4 text-zinc-400 font-mono">{tx.date}</td>
                        <td className="p-4 text-zinc-500 text-[11px]">{tx.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Sub-tab */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500 bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl">
                لا توجد فواتير أو إيصالات مسددة حتى الآن
              </div>
            ) : (
              invoices.map(inv => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="bg-[#0a0a0a] border border-[#1f1f23] hover:border-yellow-400/40 rounded-2xl p-5 transition-all cursor-pointer shadow-lg group relative"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#1f1f23]">
                    <span className="font-mono text-xs font-black text-yellow-400">{inv.invoiceNumber}</span>
                    <span className="text-[11px] text-zinc-400 font-mono">{inv.date}</span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors">
                      {inv.playerName}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">كود العضوية: {inv.membershipCode || '-'}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#1f1f23]">
                    <span className="text-xs text-zinc-400">طريقة الدفع: {inv.paymentMethod}</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">{inv.amount} EGP</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-[#1f1f23] flex items-center justify-between">
                <h3 className="text-base font-black text-white">تسجيل معاملة مالية جديدة</h3>
                <button
                  onClick={() => setIsTxModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#18181b] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع المعاملة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'expense', label: 'مصروفات' },
                      { id: 'salary', label: 'راتب مدرب' },
                      { id: 'income', label: 'إيداع إضافي' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTxType(t.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          txType === t.id
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-md'
                            : 'bg-[#121214] border-[#27272a] text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">المبلغ (EGP) *</label>
                    <input
                      type="number"
                      min={1}
                      value={txAmount || ''}
                      onChange={e => setTxAmount(Number(e.target.value))}
                      placeholder="500"
                      required
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">التاريخ *</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      required
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                </div>

                {txType === 'salary' ? (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم المدرب *</label>
                    <input
                      type="text"
                      placeholder="الكابتن / ..."
                      value={txCoachName}
                      onChange={e => setTxCoachName(e.target.value)}
                      required
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">التصنيف / الفئة</label>
                    <select
                      value={txCategory}
                      onChange={e => setTxCategory(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                    >
                      <option value="أدوات ومعدات">أدوات ومعدات تدريب</option>
                      <option value="إيجار ملاعب">إيجار ملاعب وقاعات</option>
                      <option value="صيانة">صيانة وإصلاحات</option>
                      <option value="تسويق وضيافة">تسويق وإعلانات وضيافة</option>
                      <option value="أخرى">مصروفات أخرى</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">وصف المعاملة *</label>
                  <input
                    type="text"
                    placeholder="مثال: شراء كرات تدريب جديدة أو راتب شهر مارس"
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                    required
                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={txNotes}
                    onChange={e => setTxNotes(e.target.value)}
                    placeholder="أي تفاصيل أو مستندات مرفقة..."
                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#18181b] transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>حفظ المعاملة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Printable Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-black text-lg text-zinc-900">{selectedInvoice.academyName || 'IFC ACADEMY'}</h3>
                  <p className="text-xs text-zinc-500">إيصال سداد رسمي معتمد</p>
                </div>
                <div className="text-left">
                  <span className="text-xs font-mono font-bold bg-zinc-100 px-2.5 py-1 rounded-md text-zinc-700">
                    {selectedInvoice.invoiceNumber}
                  </span>
                </div>
              </div>

              <div className="py-5 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">اسم اللاعب:</span>
                  <span className="font-bold text-zinc-900">{selectedInvoice.playerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">كود العضوية:</span>
                  <span className="font-mono font-bold">{selectedInvoice.membershipCode || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">تاريخ السداد:</span>
                  <span className="font-mono">{selectedInvoice.date}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">طريقة الدفع:</span>
                  <span className="font-semibold">{selectedInvoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">البيان / الوصف:</span>
                  <span>{selectedInvoice.description}</span>
                </div>
                <div className="flex justify-between items-center pt-3 text-base">
                  <span className="font-black text-zinc-900">المبلغ المدفوع:</span>
                  <span className="font-black text-emerald-600 font-mono text-lg">{selectedInvoice.amount} EGP</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-zinc-200">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الإيصال</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
