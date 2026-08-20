import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  User,
  Phone,
  Calendar,
  CreditCard,
  CalendarCheck,
  Edit,
  Trash2,
  Receipt,
  AlertCircle,
  MessageCircle,
  Send,
  X,
  Check
} from 'lucide-react';
import { Player, Subscription, Payment, AttendanceRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface PlayerProfileViewProps {
  playerId: string;
  onBack: () => void;
  onEditPlayer: (player: Player) => void;
  onOpenAddPayment?: (player: Player) => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  playerId,
  onBack,
  onEditPlayer
}) => {
  const { success, error } = useToast();
  const [player, setPlayer] = useState<(Player & { subscriptions: Subscription[]; payments: Payment[]; attendance: AttendanceRecord[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // WhatsApp message modal state
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<'player' | 'parent'>('player');
  const [customMessage, setCustomMessage] = useState('');

  const loadPlayerData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPlayerById(playerId);
      setPlayer(data);
    } catch (err: any) {
      error(err.message || 'فشل تحميل بيانات ملف اللاعب');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      loadPlayerData();
    }
  }, [playerId]);

  const handleDeletePlayer = async () => {
    if (!player) return;
    try {
      await api.deletePlayer(player.id);
      success(`تم حذف اللاعب ${player.fullName} بنجاح`);
      onBack();
    } catch (err: any) {
      error(err.message || 'فشل حذف اللاعب');
    }
  };

  const handleOpenMessageModal = (target: 'player' | 'parent' = 'player') => {
    if (!player) return;
    setMessageTarget(target);
    const targetName = target === 'parent' && player.parent ? player.parent.parentName : player.fullName;
    const defaultText = `مرحباً ${targetName}، نود تذكيركم بخصوص اشتراك اللاعب ${player.fullName} في أكاديمية IFC. نرجو التواصل مع إدارة الأكاديمية لمتابعة التدريبات. شكراً لكم!`;
    setCustomMessage(defaultText);
    setIsMessageModalOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (!player) return;
    const rawPhone = messageTarget === 'parent' && player.parent ? player.parent.parentPhone : player.phone;
    if (!rawPhone || !rawPhone.trim()) {
      error('رقم الهاتف غير متوفر');
      return;
    }
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
    success('تم فتح تطبيق واتساب لإرسال الرسالة');
    setIsMessageModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-12 h-12 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-zinc-400">جاري تحميل ملف اللاعب...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">اللاعب غير موجود</h2>
        <p className="text-sm text-zinc-400">قد يكون تم حذف ملف هذا اللاعب مسبقاً.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-sm cursor-pointer"
        >
          العودة لقائمة اللاعبين
        </button>
      </div>
    );
  }

  const latestSub = player.activeSubscription;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f23] pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#0a0a0a] border border-[#1f1f23] hover:border-yellow-400/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="رجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                {player.membershipCode}
              </span>
              <StatusBadge status={player.group} type="group" />
              <StatusBadge status={player.status} type="player" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{player.fullName}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => handleOpenMessageModal(player.group === 'شباب' ? 'player' : 'parent')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال رسالة واتساب</span>
          </button>

          <button
            id="btn-profile-edit"
            onClick={() => onEditPlayer(player)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#151518] text-zinc-200 hover:text-white border border-[#1f1f23] font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
          >
            <Edit className="w-4 h-4 text-yellow-400" />
            <span>تعديل بيانات اللاعب</span>
          </button>

          <button
            id="btn-profile-delete"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            title="حذف اللاعب"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف اللاعب</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal & Parent Details */}
        <div className="space-y-6">
          {/* Section 1: Personal Information */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-5 text-yellow-400 font-bold text-sm border-b border-[#1f1f23] pb-3">
              <User className="w-4 h-4" />
              <span>البيانات الشخصية (Personal Information)</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">الاسم الكامل:</span>
                <span className="text-white font-semibold">{player.fullName}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">كود العضوية:</span>
                <span className="font-mono text-yellow-400 font-bold">{player.membershipCode}</span>
              </div>

              {player.nationalId && (
                <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                  <span className="text-zinc-400 text-xs">الرقم القومي:</span>
                  <span className="font-mono text-zinc-200 text-xs">{player.nationalId}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">رقم الهاتف:</span>
                <span className="text-white font-mono dir-ltr flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400 inline" />
                  {player.phone}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">تاريخ الميلاد:</span>
                <span className="text-zinc-200 font-mono">{player.birthDate}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">العمر:</span>
                <span className="text-white font-bold">{player.age} سنة</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                <span className="text-zinc-400 text-xs">المجموعة:</span>
                <StatusBadge status={player.group} type="group" />
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400 text-xs">حالة القيد:</span>
                <StatusBadge status={player.status} type="player" />
              </div>

              {player.notes && (
                <div className="pt-2 border-t border-[#1f1f23]/60">
                  <span className="text-zinc-400 text-xs block mb-1">ملاحظات:</span>
                  <p className="text-xs text-zinc-300 bg-[#050505] p-3 rounded-xl border border-[#1f1f23] leading-relaxed">
                    {player.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Parent Information (for براعم / ناشئين) */}
          {(player.group === 'براعم' || player.group === 'ناشئين') && player.parent && (
            <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5 text-yellow-400 font-bold text-sm border-b border-[#1f1f23] pb-3">
                <User className="w-4 h-4" />
                <span>بيانات ولي الأمر (Parent Information)</span>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                  <span className="text-zinc-400 text-xs">اسم ولي الأمر:</span>
                  <span className="text-white font-semibold">{player.parent.parentName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                  <span className="text-zinc-400 text-xs">صلة القرابة:</span>
                  <span className="text-zinc-200">{player.parent.relationship}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1f1f23]/60">
                  <span className="text-zinc-400 text-xs">هاتف ولي الأمر:</span>
                  <span className="text-white font-mono dir-ltr flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 inline" />
                    {player.parent.parentPhone}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400 text-xs">هاتف الطوارئ:</span>
                  <span className="text-rose-300 font-mono dir-ltr flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-rose-400 inline" />
                    {player.parent.emergencyPhone || player.parent.parentPhone}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Columns (2 cols): Subscription, Payments & Attendance Tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 3: Subscription Status Card */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-[#1f1f23] pb-3">
              <div className="flex items-center gap-2.5 text-yellow-400 font-bold text-sm">
                <Receipt className="w-4 h-4" />
                <span>الاشتراك الحالي (Current Subscription)</span>
              </div>
              {latestSub && <StatusBadge status={latestSub.status} type="subscription" />}
            </div>

            {latestSub ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3.5 bg-[#050505] rounded-xl border border-[#1f1f23]">
                  <span className="text-[11px] text-zinc-400 block mb-1">قيمة الاشتراك</span>
                  <span className="text-base font-black text-yellow-400 font-sans">{latestSub.value} EGP</span>
                </div>

                <div className="p-3.5 bg-[#050505] rounded-xl border border-[#1f1f23]">
                  <span className="text-[11px] text-zinc-400 block mb-1">بداية الاشتراك</span>
                  <span className="text-xs font-mono text-zinc-200 font-semibold">{latestSub.startDate}</span>
                </div>

                <div className="p-3.5 bg-[#050505] rounded-xl border border-[#1f1f23]">
                  <span className="text-[11px] text-zinc-400 block mb-1">نهاية الاشتراك</span>
                  <span className="text-xs font-mono text-zinc-200 font-semibold">{latestSub.endDate}</span>
                </div>

                <div className="p-3.5 bg-[#050505] rounded-xl border border-[#1f1f23]">
                  <span className="text-[11px] text-zinc-400 block mb-1">القائم بالدفع</span>
                  <span className="text-xs font-bold text-yellow-400">
                    {latestSub.lastPaidBy || (player.group === 'شباب' ? 'اللاعب' : 'ولي الأمر')}
                  </span>
                </div>

                <div className="p-3.5 bg-[#050505] rounded-xl border border-[#1f1f23]">
                  <span className="text-[11px] text-zinc-400 block mb-1">تاريخ آخر سداد</span>
                  <span className="text-xs font-mono text-zinc-300 font-medium">
                    {latestSub.lastPaymentDate || 'لم يسدد'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-400 text-xs">
                لا يوجد اشتراك نشط مسجل لهذا اللاعب.
              </div>
            )}
          </div>

          {/* Section 4: Payments History */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#1f1f23] pb-3">
              <div className="flex items-center gap-2.5 text-yellow-400 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>سجل المدفوعات (Payment History)</span>
              </div>
              <span className="text-xs text-zinc-400">{player.payments.length} عمليات دفع</span>
            </div>

            {player.payments.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs bg-[#050505]/40 rounded-xl border border-[#1f1f23]">
                لا توجد مدفوعات مسجلة لهذا اللاعب حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-zinc-400 border-b border-[#1f1f23]">
                      <th className="pb-3 pr-2 font-bold">رقم الإيصال</th>
                      <th className="pb-3 font-bold">المبلغ</th>
                      <th className="pb-3 font-bold">طريقة الدفع</th>
                      <th className="pb-3 font-bold">تاريخ الدفع</th>
                      <th className="pb-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f23]/60">
                    {player.payments.map(pay => (
                      <tr key={pay.id} className="hover:bg-[#121215] transition-colors">
                        <td className="py-3 pr-2 font-mono text-zinc-300 font-semibold">{pay.receiptNumber}</td>
                        <td className="py-3 font-bold text-yellow-400 font-sans">{pay.amount} EGP</td>
                        <td className="py-3">
                          <StatusBadge status={pay.paymentMethod} type="paymentMethod" />
                        </td>
                        <td className="py-3 font-mono text-zinc-300">{pay.paymentDate}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            مدفوع بالكامل
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 5: Attendance History */}
          <div className="bg-[#0a0a0a] border border-[#1f1f23] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#1f1f23] pb-3">
              <div className="flex items-center gap-2.5 text-yellow-400 font-bold text-sm">
                <CalendarCheck className="w-4 h-4" />
                <span>سجل الحضور والغياب (Attendance History)</span>
              </div>
              <span className="text-xs text-zinc-400">{player.attendance.length} أيام مسجلة</span>
            </div>

            {player.attendance.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs bg-[#050505]/40 rounded-xl border border-[#1f1f23]">
                لا توجد سجلات حضور مسجلة لهذا اللاعب حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                    <tr className="text-zinc-400 border-b border-[#1f1f23]">
                      <th className="pb-3 pr-2 font-bold">التاريخ</th>
                      <th className="pb-3 font-bold">المجموعة</th>
                      <th className="pb-3 font-bold">حالة الحضور</th>
                      <th className="pb-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f23]/60">
                    {player.attendance.map(att => (
                      <tr key={att.id} className="hover:bg-[#121215] transition-colors">
                        <td className="py-3 pr-2 font-mono text-zinc-200 font-semibold">{att.date}</td>
                        <td className="py-3">
                          <StatusBadge status={att.group} type="group" />
                        </td>
                        <td className="py-3">
                          <StatusBadge status={att.status} type="attendance" />
                        </td>
                        <td className="py-3 text-zinc-400">{att.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Message Modal */}
      <AnimatePresence>
        {isMessageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-[#1f1f23] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-[#1f1f23] flex items-center justify-between bg-[#050505]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">إرسال رسالة واتساب</h3>
                </div>
                <button
                  onClick={() => setIsMessageModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Target selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">جهة الاستلام</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenMessageModal('player')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        messageTarget === 'player'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#050505] text-zinc-400 border-[#1f1f23]'
                      }`}
                    >
                      هاتف اللاعب ({player.phone})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenMessageModal('parent')}
                      disabled={!player.parent?.parentPhone}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        messageTarget === 'parent'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#050505] text-zinc-400 border-[#1f1f23] disabled:opacity-40'
                      }`}
                    >
                      ولي الأمر ({player.parent?.parentPhone || 'غير مسجل'})
                    </button>
                  </div>
                </div>

                {/* Message body */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">نص الرسالة</label>
                  <textarea
                    rows={4}
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    className="w-full p-3.5 bg-[#050505] border border-[#1f1f23] rounded-xl text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-500 text-right"
                    placeholder="اكتب نص الرسالة هنا..."
                  />
                </div>

                {/* Fast presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-500 block">نماذج رسائل سريعة:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomMessage(`مرحباً، نذكركم بقرب موعد تجديد اشتراك اللاعب ${player.fullName} في أكاديمية IFC. يرجى التكرم بالسداد في الموعد.`)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-[11px] border border-zinc-800"
                    >
                      تذكير بالاشتراك
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMessage(`مرحباً، نود إحاطتكم علماً بموعد تمرين اللاعب ${player.fullName} القادم في أكاديمية IFC. مع تحيات الجهاز الفني.`)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-[11px] border border-zinc-800"
                    >
                      موعد التمرين
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#050505] border-t border-[#1f1f23] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح وإرسال عبر واتساب</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف ملف اللاعب"
        message={`هل أنت متأكد من رغبتك في حذف اللاعب "${player.fullName}" نهائياً من النظام؟ سيتم مسح بياناته وسجل اشتراكاته وحضوره.`}
        confirmText="نعم، حذف اللاعب"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleDeletePlayer}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
