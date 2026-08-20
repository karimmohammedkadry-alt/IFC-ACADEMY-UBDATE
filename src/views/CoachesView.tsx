import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  PlusCircle,
  Search,
  DollarSign,
  Phone,
  Calendar,
  Award,
  Edit2,
  Trash2,
  Check,
  X,
  CreditCard,
  Building,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { Coach, PlayerGroup, PaymentMethod } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';

interface CoachesViewProps {
  onNavigateToFinancial?: () => void;
}

export const CoachesView: React.FC<CoachesViewProps> = ({ onNavigateToFinancial }) => {
  const { success, error } = useToast();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedPayoutCoach, setSelectedPayoutCoach] = useState<Coach | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(3000);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('Cash');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGroup, setFormGroup] = useState<PlayerGroup | 'جميع المجموعات'>('ناشئين');
  const [formRole, setFormRole] = useState('مدرب فني');
  const [formSalary, setFormSalary] = useState<number>(3000);
  const [formJoinedDate, setFormJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formNotes, setFormNotes] = useState('');

  const loadCoaches = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCoaches({
        group: groupFilter,
        status: statusFilter,
        query: searchQuery
      });
      setCoaches(data);
    } catch (err: any) {
      error(err.message || 'فشل تحميل بيانات المدربين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, [groupFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCoaches();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenAddModal = () => {
    setEditingCoach(null);
    setFormName('');
    setFormPhone('');
    setFormGroup('ناشئين');
    setFormRole('مدرب فني');
    setFormSalary(3000);
    setFormJoinedDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Active');
    setFormNotes('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (coach: Coach) => {
    setEditingCoach(coach);
    setFormName(coach.name);
    setFormPhone(coach.phone);
    setFormGroup(coach.assignedGroup);
    setFormRole(coach.role);
    setFormSalary(coach.monthlySalary);
    setFormJoinedDate(coach.joinedDate || new Date().toISOString().split('T')[0]);
    setFormStatus(coach.status);
    setFormNotes(coach.notes || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      error('يرجى كتابة اسم المدرب ورقم الهاتف');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCoach) {
        await api.updateCoach(editingCoach.id, {
          name: formName.trim(),
          phone: formPhone.trim(),
          assignedGroup: formGroup,
          role: formRole.trim(),
          monthlySalary: Number(formSalary),
          joinedDate: formJoinedDate,
          status: formStatus,
          notes: formNotes.trim()
        });
        success(`تم تحديث بيانات المدرب ${formName} بنجاح`);
      } else {
        await api.createCoach({
          name: formName.trim(),
          phone: formPhone.trim(),
          assignedGroup: formGroup,
          role: formRole.trim(),
          monthlySalary: Number(formSalary),
          joinedDate: formJoinedDate,
          status: formStatus,
          notes: formNotes.trim()
        });
        success(`تم إضافة المدرب ${formName} بنجاح`);
      }
      setIsAddEditModalOpen(false);
      loadCoaches();
    } catch (err: any) {
      error(err.message || 'فشل حفظ بيانات المدرب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayoutModal = (coach: Coach) => {
    setSelectedPayoutCoach(coach);
    setPayoutAmount(coach.monthlySalary || 3000);
    setPayoutMethod('Cash');
    setPayoutDate(new Date().toISOString().split('T')[0]);
    setPayoutNotes(`صرف راتب شهر ${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`);
    setIsPayoutModalOpen(true);
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutCoach || payoutAmount <= 0) {
      error('يرجى التحقق من القيمة والمدرب المحدد');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.payCoachSalary({
        coachId: selectedPayoutCoach.id,
        amount: Number(payoutAmount),
        payoutDate,
        paymentMethod: payoutMethod,
        notes: payoutNotes.trim()
      });
      success(`تم صرف راتب ${payoutAmount} EGP للمدرب ${selectedPayoutCoach.name} بنجاح وتحديث الحسابات المالية`);
      setIsPayoutModalOpen(false);
      loadCoaches();
    } catch (err: any) {
      error(err.message || 'فشل تسجيل صرف الراتب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoachConfirm = async () => {
    if (!coachToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteCoach(coachToDelete.id);
      success(`تم حذف المدرب ${coachToDelete.name} بنجاح`);
      setIsDeleteModalOpen(false);
      setCoachToDelete(null);
      loadCoaches();
    } catch (err: any) {
      error(err.message || 'فشل حذف المدرب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated Stats
  const activeCoachesCount = coaches.filter(c => c.status === 'Active').length;
  const totalMonthlyPayroll = coaches.filter(c => c.status === 'Active').reduce((sum, c) => sum + Number(c.monthlySalary || 0), 0);
  const totalSalariesDisbursed = coaches.reduce((sum, c) => sum + Number(c.totalSalariesPaid || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>IFC ACADEMY • الجهاز الفني</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">إدارة المدربين والرواتب</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onNavigateToFinancial && (
            <button
              id="btn-goto-financial"
              onClick={onNavigateToFinancial}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#151518] text-zinc-300 hover:text-white border border-[#1f1f23] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>التقارير المالية</span>
            </button>
          )}

          <button
            id="btn-add-coach"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm shadow-lg shadow-yellow-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة مدرب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400">إجمالي المدربين النشطين</span>
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{activeCoachesCount} <span className="text-xs font-normal text-zinc-400">مدربين</span></div>
          <p className="text-[11px] text-zinc-500 mt-1">مسجلين في الفرق الأساسية والناشئين</p>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400">مسير الرواتب الشهري</span>
            <div className="p-2 rounded-xl bg-blue-400/10 text-blue-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalMonthlyPayroll.toLocaleString('en-US')} <span className="text-xs font-bold text-blue-400">EGP</span></div>
          <p className="text-[11px] text-zinc-500 mt-1">إجمالي المستحق شهرياً لكافة المدربين</p>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400">إجمالي ما تم صرفه للرواتب</span>
            <div className="p-2 rounded-xl bg-emerald-400/10 text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalSalariesDisbursed.toLocaleString('en-US')} <span className="text-xs font-bold text-emerald-400">EGP</span></div>
          <p className="text-[11px] text-zinc-500 mt-1">مسجل تلقائياً في حسابات الخزينة والمصروفات</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4 text-yellow-400/80" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث باسم المدرب، رقم الهاتف، أو التخصص التدريبي..."
              className="w-full pr-10 pl-4 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-right"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
            >
              <option value="All">جميع الفرق والمجموعات</option>
              <option value="براعم">براعم</option>
              <option value="ناشئين">ناشئين</option>
              <option value="شباب">شباب</option>
              <option value="جميع المجموعات">جميع المجموعات (عام)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer text-right"
            >
              <option value="All">جميع الحالات</option>
              <option value="Active">نشط (على رأس العمل)</option>
              <option value="Inactive">غير نشط (متوقف)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coaches Cards Grid */}
      <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-400">جاري تحميل سجلات المدربين...</p>
          </div>
        ) : coaches.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            لا توجد سجلات مدربين مطابقة لخيارات البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#050505] border-b border-[#1f1f23] text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-4 pr-6">اسم المدرب والصفة</th>
                  <th className="py-4 px-4">رقم الهاتف</th>
                  <th className="py-4 px-4">الفئة المخصصة</th>
                  <th className="py-4 px-4">الراتب الشهري</th>
                  <th className="py-4 px-4">إجمالي المصروف له</th>
                  <th className="py-4 px-4">آخر تاريخ صرف</th>
                  <th className="py-4 px-4">الحالة</th>
                  <th className="py-4 pl-6 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/60">
                {coaches.map(coach => (
                  <tr key={coach.id} className="hover:bg-[#121215] transition-colors">
                    <td className="py-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{coach.name}</span>
                          <span className="text-[11px] text-zinc-400">{coach.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <a
                        href={`https://wa.me/2${coach.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-300 hover:text-emerald-400 transition-colors font-mono font-bold"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{coach.phone}</span>
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-[#151518] border border-[#26262b] text-zinc-300 font-bold text-[11px]">
                        {coach.assignedGroup}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-white text-sm">
                        {coach.monthlySalary.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-zinc-400 mr-1">EGP</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-emerald-400 text-sm">
                        {(coach.totalSalariesPaid || 0).toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-zinc-400 mr-1">EGP</span>
                    </td>
                    <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                      {coach.lastPayoutDate || 'لم يصرف بعد'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        coach.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}>
                        {coach.status === 'Active' ? 'نشط' : 'متوقف'}
                      </span>
                    </td>
                    <td className="py-4 pl-6 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenPayoutModal(coach)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
                          title="صرف راتب شهري"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>صرف راتب</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(coach)}
                          className="p-1.5 rounded-lg bg-[#151518] hover:bg-[#202025] text-zinc-300 hover:text-white border border-[#1f1f23] transition-all cursor-pointer"
                          title="تعديل بيانات المدرب"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setCoachToDelete(coach);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                          title="حذف المدرب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Coach Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddEditModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl p-6 sm:p-7 w-full max-w-lg z-10 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1f1f23] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingCoach ? 'تعديل بيانات المدرب' : 'إضافة مدرب جديد للجهاز الفني'}
                  </h3>
                  <p className="text-xs text-zinc-400">بيانات المدرب وتفاصيل الراتب الشهري</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#151518] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoachSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  اسم المدرب الكامل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: كابتن / حسام حسن"
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    رقم الهاتف (واتساب) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الصفة / الدور التدريبي
                  </label>
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="مثال: مدرب فني / مدرب حراس"
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الفئة المخصصة
                  </label>
                  <select
                    value={formGroup}
                    onChange={e => setFormGroup(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none cursor-pointer text-right"
                  >
                    <option value="براعم">براعم</option>
                    <option value="ناشئين">ناشئين</option>
                    <option value="شباب">شباب</option>
                    <option value="جميع المجموعات">جميع المجموعات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الراتب الشهري (EGP) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    required
                    value={formSalary}
                    onChange={e => setFormSalary(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    تاريخ الانضمام للأكاديمية
                  </label>
                  <input
                    type="date"
                    value={formJoinedDate}
                    onChange={e => setFormJoinedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    الحالة
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none cursor-pointer text-right"
                  >
                    <option value="Active">نشط (Active)</option>
                    <option value="Inactive">غير نشط (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ملاحظات أو مؤهلات إضافية
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="مثال: رخصة تدريب C، خريج تربية رياضية..."
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f23]">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
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
                      <span>{editingCoach ? 'حفظ التعديلات' : 'إضافة المدرب'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Disburse Salary Modal */}
      {isPayoutModalOpen && selectedPayoutCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPayoutModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl p-6 sm:p-7 w-full max-w-lg z-10 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1f1f23] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">صرف راتب للمدرب</h3>
                  <p className="text-xs text-zinc-400">
                    المدرب: <span className="text-white font-bold">{selectedPayoutCoach.name}</span> ({selectedPayoutCoach.role})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#151518] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  قيمة الراتب المنصرف (EGP) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  طريقة الصرف <span className="text-rose-400">*</span>
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
                      onClick={() => setPayoutMethod(m.id as PaymentMethod)}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                        payoutMethod === m.id
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-500/20'
                          : 'bg-[#050505] text-zinc-300 border-[#1f1f23] hover:border-zinc-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  تاريخ الصرف
                </label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={e => setPayoutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-sm focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>سيتم إدراج هذه المعاملة كبند (رواتب مدربين) وخصمها من صافي الخزينة تلقائياً.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f23]">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-[#151518] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد صرف الراتب</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف المدرب"
        message={`هل أنت متأكد من رغبتك في حذف المدرب "${coachToDelete?.name}" نهائياً من سجلات الأكاديمية؟`}
        confirmText="نعم، حذف المدرب"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleDeleteCoachConfirm}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCoachToDelete(null);
        }}
      />
    </div>
  );
};
